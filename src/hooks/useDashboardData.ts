import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Achievement,
  DailyGoals,
  DailyRecord,
  SectionMinutes,
  SectionTargets,
  TimerSession,
  UserProfile
} from "../domain/types";
import { evaluateAchievements } from "../domain/achievements";
import {
  createEmptyDailyRecord,
  recalculateDailyRecordProgress
} from "../domain/progress";
import { todayKey } from "../lib/date";
import { createLocalStorageRepository } from "../services/storage/appRepository";
import type {
  AppRepository,
  AppState,
  AppStateMutation
} from "../services/storage/storageTypes";
import type { SyncManager } from "../services/sync/syncManager";
import type { SyncState } from "../services/sync/syncTypes";

export type ProfileUpdate = Partial<
  Omit<UserProfile, "userId" | "sectionTargets" | "createdAt" | "updatedAt" | "syncStatus">
> & {
  sectionTargets?: Partial<SectionTargets>;
};

export type DailyGoalsUpdate = Partial<
  Omit<DailyGoals, "userId" | "sectionMinutesTarget" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">
> & {
  sectionMinutesTarget?: Partial<SectionMinutes>;
};

export type DailyRecordUpdate = Partial<
  Omit<
    DailyRecord,
    | "recordId"
    | "userId"
    | "date"
    | "sectionMinutes"
    | "completionRate"
    | "isAllClear"
    | "xpEarned"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
    | "syncStatus"
  >
> & {
  sectionMinutes?: Partial<SectionMinutes>;
};

export interface DashboardData {
  state: AppState;
  todayRecord: DailyRecord;
  syncState: SyncState;
  updateProfile(update: ProfileUpdate): void;
  updateDailyGoals(update: DailyGoalsUpdate): void;
  updateTodayRecord(update: DailyRecordUpdate): void;
  addTimerSession(session: TimerSession): void;
  syncNow(userId: string, accountName: string | null): Promise<void>;
  latestUnlockedAchievementId: string | null;
  unlockAchievementsIfNeeded(): void;
}

const dateStartIso = (date: string) => `${date}T00:00:00.000Z`;

const activeRecordIndex = (records: DailyRecord[], date: string) =>
  records.findIndex((record) => record.date === date && record.deletedAt === null);

const upsertRecord = (records: DailyRecord[], recordIndex: number, record: DailyRecord) =>
  recordIndex >= 0
    ? records.map((current, index) => (index === recordIndex ? record : current))
    : [...records, record];

const getRecordForDate = (state: AppState, date: string, now: string) => {
  const recordIndex = activeRecordIndex(state.records, date);
  const record =
    recordIndex >= 0
      ? state.records[recordIndex]
      : createEmptyDailyRecord(date, state.profile.userId, now);

  return { record, recordIndex };
};

const achievementsEqual = (left: Achievement[], right: Achievement[]) =>
  left.length === right.length &&
  left.every((achievement, index) => {
    const nextAchievement = right[index];

    return (
      nextAchievement !== undefined &&
      achievement.achievementId === nextAchievement.achievementId &&
      achievement.userId === nextAchievement.userId &&
      achievement.name === nextAchievement.name &&
      achievement.description === nextAchievement.description &&
      achievement.category === nextAchievement.category &&
      achievement.unlockedAt === nextAchievement.unlockedAt &&
      achievement.createdAt === nextAchievement.createdAt &&
      achievement.updatedAt === nextAchievement.updatedAt &&
      achievement.deletedAt === nextAchievement.deletedAt &&
      achievement.syncStatus === nextAchievement.syncStatus
    );
  });

const latestNewUnlockId = (previous: Achievement[], next: Achievement[]) => {
  const previousUnlocks = new Map(
    previous.map((achievement) => [achievement.achievementId, achievement.unlockedAt])
  );
  const newUnlocks = next.filter(
    (achievement) => achievement.unlockedAt && !previousUnlocks.get(achievement.achievementId)
  );

  if (newUnlocks.length === 0) return null;

  return (
    newUnlocks.find((achievement) => achievement.achievementId === "all-clear")
      ?.achievementId ?? newUnlocks[newUnlocks.length - 1].achievementId
  );
};

const guestSyncState = (): SyncState => ({
  mode: "guest",
  message: null,
  lastSyncedAt: null
});

const offlineSyncState = (lastSyncedAt: string | null): SyncState => ({
  mode: "offline",
  message: "Local changes are saved on this device.",
  lastSyncedAt
});

const syncingSyncState = (lastSyncedAt: string | null): SyncState => ({
  mode: "syncing",
  message: null,
  lastSyncedAt
});

const errorSyncState = (error: unknown, lastSyncedAt: string | null): SyncState => ({
  mode: "error",
  message: error instanceof Error ? error.message : String(error),
  lastSyncedAt
});

export function useDashboardData(
  repository?: AppRepository,
  today: string = todayKey(),
  syncManager?: SyncManager
): DashboardData {
  const repo = useMemo(() => repository ?? createLocalStorageRepository(), [repository]);
  const [state, setState] = useState<AppState>(() => repo.loadAppState());
  const [syncState, setSyncState] = useState<SyncState>(() =>
    syncManager ? offlineSyncState(null) : guestSyncState()
  );
  const [latestUnlockedAchievementId, setLatestUnlockedAchievementId] = useState<string | null>(null);
  const stateRef = useRef(state);
  const syncStateRef = useRef(syncState);
  const syncedUserIdRef = useRef<string | null>(null);

  const commitSyncState = useCallback((nextSyncState: SyncState) => {
    syncStateRef.current = nextSyncState;
    setSyncState(nextSyncState);
  }, []);

  const applyAchievementEvaluation = useCallback(
    (candidateState: AppState, now: string, previousAchievements: Achievement[]) => {
      const achievements = evaluateAchievements({
        achievements: candidateState.achievements,
        now,
        records: candidateState.records,
        timerSessions: candidateState.timerSessions,
        today,
        userId: candidateState.profile.userId
      });

      return {
        latestUnlockId: latestNewUnlockId(previousAchievements, achievements),
        nextState: achievementsEqual(candidateState.achievements, achievements)
          ? candidateState
          : { ...candidateState, achievements }
      };
    },
    [today]
  );

  useEffect(() => {
    const loadedState = repo.loadAppState();
    const { latestUnlockId, nextState } = applyAchievementEvaluation(
      loadedState,
      new Date().toISOString(),
      loadedState.achievements
    );

    stateRef.current = nextState;
    if (nextState !== loadedState) {
      repo.saveAppState(nextState);
    }
    if (latestUnlockId) {
      setLatestUnlockedAchievementId(latestUnlockId);
    }
    setState(nextState);
  }, [applyAchievementEvaluation, repo]);

  useEffect(() => {
    if (!syncManager) {
      syncedUserIdRef.current = null;
      commitSyncState(guestSyncState());
      return;
    }

    if (syncStateRef.current.mode === "guest") {
      commitSyncState(offlineSyncState(syncStateRef.current.lastSyncedAt));
    }
  }, [commitSyncState, syncManager]);

  const commitState = useCallback(
    (mutation: AppStateMutation) => {
      const currentState = stateRef.current;
      const candidateState = mutation(currentState);
      const { latestUnlockId, nextState } = applyAchievementEvaluation(
        candidateState,
        new Date().toISOString(),
        currentState.achievements
      );

      if (nextState === currentState) {
        return;
      }

      stateRef.current = nextState;
      repo.saveAppState(nextState);
      if (syncManager) {
        commitSyncState(offlineSyncState(syncStateRef.current.lastSyncedAt));
      }
      if (latestUnlockId) {
        setLatestUnlockedAchievementId(latestUnlockId);
      }
      setState(nextState);
    },
    [applyAchievementEvaluation, commitSyncState, repo, syncManager]
  );

  const todayRecord = useMemo(() => {
    const record = state.records.find(
      (candidate) => candidate.date === today && candidate.deletedAt === null
    );

    return record ?? createEmptyDailyRecord(today, state.profile.userId, dateStartIso(today));
  }, [state.profile.userId, state.records, today]);

  const updateProfile = useCallback(
    (update: ProfileUpdate) => {
      const now = new Date().toISOString();

      commitState((current) => ({
        ...current,
        profile: {
          ...current.profile,
          ...update,
          sectionTargets: update.sectionTargets
            ? { ...current.profile.sectionTargets, ...update.sectionTargets }
            : current.profile.sectionTargets,
          updatedAt: now,
          syncStatus: "local"
        }
      }));
    },
    [commitState]
  );

  const updateDailyGoals = useCallback(
    (update: DailyGoalsUpdate) => {
      const now = new Date().toISOString();

      commitState((current) => {
        const dailyGoals: DailyGoals = {
          ...current.dailyGoals,
          ...update,
          sectionMinutesTarget: update.sectionMinutesTarget
            ? {
                ...current.dailyGoals.sectionMinutesTarget,
                ...update.sectionMinutesTarget
              }
            : current.dailyGoals.sectionMinutesTarget,
          updatedAt: now,
          deletedAt: null,
          syncStatus: "local-only"
        };
        const records = current.records.map((record) => {
          if (record.deletedAt !== null || record.date !== today) return record;

          const recalculated = recalculateDailyRecordProgress(record, dailyGoals);
          const progressChanged =
            recalculated.completionRate !== record.completionRate ||
            recalculated.isAllClear !== record.isAllClear ||
            recalculated.xpEarned !== record.xpEarned;

          return progressChanged
            ? {
                ...recalculated,
                updatedAt: now,
                syncStatus: "local-only" as const
              }
            : recalculated;
        });

        return {
          ...current,
          dailyGoals,
          records
        };
      });
    },
    [commitState]
  );

  const updateTodayRecord = useCallback(
    (update: DailyRecordUpdate) => {
      const now = new Date().toISOString();

      commitState((current) => {
        const { record, recordIndex } = getRecordForDate(current, today, now);
        const nextRecord = recalculateDailyRecordProgress(
          {
            ...record,
            ...update,
            sectionMinutes: update.sectionMinutes
              ? { ...record.sectionMinutes, ...update.sectionMinutes }
              : record.sectionMinutes,
            updatedAt: now,
            deletedAt: null,
            syncStatus: "local-only"
          },
          current.dailyGoals
        );

        return {
          ...current,
          records: upsertRecord(current.records, recordIndex, nextRecord)
        };
      });
    },
    [commitState, today]
  );

  const addTimerSession = useCallback(
    (session: TimerSession) => {
      const now = new Date().toISOString();

      commitState((current) => {
        const { record, recordIndex } = getRecordForDate(current, session.date, now);
        const nextSectionMinutes = {
          ...record.sectionMinutes,
          [session.section]: record.sectionMinutes[session.section] + session.actualMinutes
        };
        const nextReadingOvertimeMinutes =
          session.section === "reading"
            ? record.readingOvertimeMinutes + session.overtimeMinutes
            : record.readingOvertimeMinutes;
        const nextRecord = recalculateDailyRecordProgress(
          {
            ...record,
            sectionMinutes: nextSectionMinutes,
            readingOvertimeMinutes: nextReadingOvertimeMinutes,
            updatedAt: now,
            deletedAt: null,
            syncStatus: "local-only"
          },
          current.dailyGoals
        );
        const nextSession: TimerSession = {
          ...session,
          updatedAt: now,
          deletedAt: session.deletedAt ?? null,
          syncStatus: "local-only"
        };

        return {
          ...current,
          records: upsertRecord(current.records, recordIndex, nextRecord),
          timerSessions: [...current.timerSessions, nextSession]
        };
      });
    },
    [commitState]
  );

  const unlockAchievementsIfNeeded = useCallback(() => {
    commitState((current) => current);
  }, [commitState]);

  const syncNow = useCallback(
    async (userId: string, accountName: string | null) => {
      if (!syncManager) {
        return;
      }

      const lastSyncedAt = syncStateRef.current.lastSyncedAt;
      const localState = stateRef.current;
      const shouldImportOrLoad =
        syncedUserIdRef.current !== userId ||
        localState.profile.userId !== userId ||
        syncStateRef.current.mode === "guest";

      commitSyncState(syncingSyncState(lastSyncedAt));

      try {
        const result = shouldImportOrLoad
          ? await syncManager.importOrLoad(userId, localState, accountName)
          : await syncManager.push(localState, accountName);

        stateRef.current = result.state;
        repo.saveAppState(result.state);
        setState(result.state);
        commitSyncState(result.syncState);

        if (result.syncState.mode === "synced") {
          syncedUserIdRef.current = userId;
        }
      } catch (error) {
        commitSyncState(errorSyncState(error, lastSyncedAt));
      }
    },
    [commitSyncState, repo, syncManager]
  );

  return {
    state,
    todayRecord,
    syncState,
    updateProfile,
    updateDailyGoals,
    updateTodayRecord,
    addTimerSession,
    syncNow,
    latestUnlockedAchievementId,
    unlockAchievementsIfNeeded
  };
}
