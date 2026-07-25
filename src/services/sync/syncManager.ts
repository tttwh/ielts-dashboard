import type { Achievement, DailyRecord, TimerSession } from "../../domain/types";
import type { CloudRepository } from "../cloudbase/cloudRepository";
import type { AppState } from "../storage/storageTypes";
import type { SyncResult } from "./syncTypes";

export type { SyncMode, SyncResult, SyncState } from "./syncTypes";

export interface SyncManager {
  importOrLoad(
    userId: string,
    localState: AppState,
    accountName: string | null
  ): Promise<SyncResult>;
  push(state: AppState, accountName: string | null): Promise<SyncResult>;
}

const synced = (state: AppState): SyncResult => ({
  state,
  syncState: {
    mode: "synced",
    message: null,
    lastSyncedAt: new Date().toISOString()
  }
});

const failed = (state: AppState, error: unknown): SyncResult => ({
  state,
  syncState: {
    mode: "error",
    message: error instanceof Error ? error.message : String(error),
    lastSyncedAt: null
  }
});

const blockingAccountStatus = (state: AppState) => {
  const status = state.profile.accountStatus;
  return status === "disabled" || status === "pending" ? status : null;
};

const blockedAccountSync = (
  state: AppState,
  status: NonNullable<AppState["profile"]["accountStatus"]>
): SyncResult => failed(state, new Error(`Cloud sync is blocked for ${status} accounts.`));

const newerByUpdatedAt = <T extends { updatedAt: string }>(localItem: T, cloudItem: T): T =>
  localItem.updatedAt > cloudItem.updatedAt ? localItem : cloudItem;

const mergeByKey = <T extends { updatedAt: string }>(
  localItems: T[],
  cloudItems: T[],
  getKey: (item: T) => string,
  chooseItem: (localItem: T, cloudItem: T) => T = newerByUpdatedAt
): T[] => {
  const merged = new Map<string, T>();

  cloudItems.forEach((item) => merged.set(getKey(item), item));
  localItems.forEach((localItem) => {
    const key = getKey(localItem);
    const cloudItem = merged.get(key);
    merged.set(key, cloudItem ? chooseItem(localItem, cloudItem) : localItem);
  });

  return Array.from(merged.values());
};

const getRecordMergeKey = (record: DailyRecord) => record.date;

const chooseAchievement = (localAchievement: Achievement, cloudAchievement: Achievement) => {
  const localUnlocked = localAchievement.unlockedAt !== null;
  const cloudUnlocked = cloudAchievement.unlockedAt !== null;

  if (localUnlocked && !cloudUnlocked) return localAchievement;
  if (!localUnlocked && cloudUnlocked) return cloudAchievement;
  if (localUnlocked && cloudUnlocked) {
    return localAchievement.unlockedAt! < cloudAchievement.unlockedAt!
      ? localAchievement
      : cloudAchievement;
  }

  return newerByUpdatedAt(localAchievement, cloudAchievement);
};

export function replaceAppStateUserId(state: AppState, userId: string): AppState {
  return {
    ...state,
    profile: {
      ...state.profile,
      userId
    },
    dailyGoals: {
      ...state.dailyGoals,
      userId
    },
    records: state.records.map((record) => ({
      ...record,
      userId
    })),
    timerSessions: state.timerSessions.map((session) => ({
      ...session,
      userId
    })),
    achievements: state.achievements.map((achievement) => ({
      ...achievement,
      userId
    }))
  };
}

export function mergeAppStates(localState: AppState, cloudState: AppState): AppState {
  return {
    schemaVersion: 1,
    profile: newerByUpdatedAt(localState.profile, cloudState.profile),
    dailyGoals: newerByUpdatedAt(localState.dailyGoals, cloudState.dailyGoals),
    records: mergeByKey(localState.records, cloudState.records, getRecordMergeKey),
    timerSessions: mergeByKey<TimerSession>(
      localState.timerSessions,
      cloudState.timerSessions,
      (session) => session.sessionId
    ),
    achievements: mergeByKey(
      localState.achievements,
      cloudState.achievements,
      (achievement) => achievement.achievementId,
      chooseAchievement
    )
  };
}

export function markAppStateSynced(state: AppState): AppState {
  return {
    ...state,
    profile: {
      ...state.profile,
      syncStatus: "synced"
    },
    dailyGoals: {
      ...state.dailyGoals,
      syncStatus: "synced"
    },
    records: state.records.map((record) => ({
      ...record,
      syncStatus: "synced"
    })),
    timerSessions: state.timerSessions.map((session) => ({
      ...session,
      syncStatus: "synced"
    })),
    achievements: state.achievements.map((achievement) => ({
      ...achievement,
      syncStatus: "synced"
    }))
  };
}

export function createSyncManager(repository: CloudRepository): SyncManager {
  return {
    async importOrLoad(userId, localState, accountName) {
      const localBlockingStatus = blockingAccountStatus(localState);
      if (localBlockingStatus) {
        return blockedAccountSync(localState, localBlockingStatus);
      }

      try {
        const cloudState = await repository.loadCloudState(userId);
        const cloudBlockingStatus = cloudState ? blockingAccountStatus(cloudState) : null;
        if (cloudBlockingStatus && cloudState) {
          return blockedAccountSync(cloudState, cloudBlockingStatus);
        }

        const localStateForUser = replaceAppStateUserId(localState, userId);
        const nextState = markAppStateSynced(
          cloudState ? mergeAppStates(localStateForUser, cloudState) : localStateForUser
        );

        await repository.saveCloudState(nextState, accountName);

        return synced(nextState);
      } catch (error) {
        return failed(localState, error);
      }
    },

    async push(state, accountName) {
      const localBlockingStatus = blockingAccountStatus(state);
      if (localBlockingStatus) {
        return blockedAccountSync(state, localBlockingStatus);
      }

      try {
        const nextState = markAppStateSynced(state);

        await repository.saveCloudState(nextState, accountName);

        return synced(nextState);
      } catch (error) {
        return failed(state, error);
      }
    }
  };
}
