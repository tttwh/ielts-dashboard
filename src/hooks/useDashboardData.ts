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
import {
  calculateStreak,
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
  updateProfile(update: ProfileUpdate): void;
  updateDailyGoals(update: DailyGoalsUpdate): void;
  updateTodayRecord(update: DailyRecordUpdate): void;
  addTimerSession(session: TimerSession): void;
  unlockAchievementsIfNeeded(): void;
}

const dateStartIso = (date: string) => `${date}T00:00:00.000Z`;

const activeRecordIndex = (records: DailyRecord[], date: string) =>
  records.findIndex((record) => record.date === date && record.deletedAt === null);

const allSectionMinutesRecorded = (record: DailyRecord) =>
  Object.values(record.sectionMinutes).every((minutes) => minutes > 0);

const shouldUnlockAchievement = (
  achievement: Achievement,
  records: DailyRecord[],
  today: string
) => {
  const activeRecords = records.filter((record) => record.deletedAt === null);

  switch (achievement.achievementId) {
    case "first-all-clear":
      return activeRecords.some((record) => record.isAllClear);
    case "balanced-day":
      return activeRecords.some(allSectionMinutesRecorded);
    case "seven-day-streak":
      return calculateStreak(activeRecords, today) >= 7;
    default:
      return false;
  }
};

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

export function useDashboardData(
  repository?: AppRepository,
  today: string = todayKey()
): DashboardData {
  const repo = useMemo(() => repository ?? createLocalStorageRepository(), [repository]);
  const [state, setState] = useState<AppState>(() => repo.loadAppState());
  const stateRef = useRef(state);

  useEffect(() => {
    const nextState = repo.loadAppState();
    stateRef.current = nextState;
    setState(nextState);
  }, [repo]);

  const commitState = useCallback(
    (mutation: AppStateMutation) => {
      const nextState = mutation(stateRef.current);

      if (nextState === stateRef.current) {
        return;
      }

      stateRef.current = nextState;
      repo.saveAppState(nextState);
      setState(nextState);
    },
    [repo]
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
          if (record.deletedAt !== null) return record;

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
    const now = new Date().toISOString();

    commitState((current) => {
      let changed = false;
      const achievements = current.achievements.map((achievement) => {
        if (achievement.unlockedAt || !shouldUnlockAchievement(achievement, current.records, today)) {
          return achievement;
        }

        changed = true;
        return {
          ...achievement,
          unlockedAt: now,
          updatedAt: now,
          syncStatus: "local-only" as const
        };
      });

      return changed ? { ...current, achievements } : current;
    });
  }, [commitState, today]);

  return {
    state,
    todayRecord,
    updateProfile,
    updateDailyGoals,
    updateTodayRecord,
    addTimerSession,
    unlockAchievementsIfNeeded
  };
}
