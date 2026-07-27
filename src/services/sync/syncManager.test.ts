import { describe, expect, it, vi } from "vitest";
import { createDefaultAppState } from "../../domain/defaults";
import type { Achievement, DailyRecord, TimerSession } from "../../domain/types";
import type { CloudRepository } from "../cloudbase/cloudRepository";
import type { AppState } from "../storage/storageTypes";
import {
  createSyncManager,
  markAppStateSynced,
  mergeAppStates,
  replaceAppStateUserId
} from "./syncManager";

const now = "2026-07-24T00:00:00.000Z";
const newer = "2026-07-24T02:00:00.000Z";
const older = "2026-07-24T01:00:00.000Z";

const sectionMinutes = {
  listening: 45,
  speaking: 30,
  reading: 60,
  writing: 45
};

const createRecord = (overrides: Partial<DailyRecord> = {}): DailyRecord => ({
  recordId: "record-2026-07-24",
  userId: "local-user",
  date: "2026-07-24",
  words: 120,
  speakingTopics: 3,
  listeningTests: 1,
  corpusMinutes: 30,
  sectionMinutes,
  readingOvertimeMinutes: 0,
  completionRate: 0.8,
  isAllClear: false,
  xpEarned: 90,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  syncStatus: "local-only",
  ...overrides
});

const createTimerSession = (overrides: Partial<TimerSession> = {}): TimerSession => ({
  sessionId: "session-reading",
  userId: "local-user",
  date: "2026-07-24",
  section: "reading",
  source: "in-app-timer",
  plannedMinutes: 60,
  actualMinutes: 60,
  overtimeMinutes: 0,
  startedAt: now,
  endedAt: "2026-07-24T01:00:00.000Z",
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  syncStatus: "local-only",
  ...overrides
});

const createAchievement = (overrides: Partial<Achievement> = {}): Achievement => ({
  achievementId: "all-clear",
  userId: "local-user",
  name: "All Clear",
  description: "Complete every enabled daily target once.",
  category: "milestone",
  unlockedAt: null,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  syncStatus: "local-only",
  ...overrides
});

const createRepository = ({
  cloudState,
  loadError,
  saveError
}: {
  cloudState?: AppState | null;
  loadError?: unknown;
  saveError?: unknown;
} = {}) => {
  const savedStates: AppState[] = [];
  const repository: CloudRepository = {
    loadCloudState: vi.fn(async () => {
      if (loadError) throw loadError;
      return cloudState ?? null;
    }),
    saveCloudState: vi.fn(async (state) => {
      if (saveError) throw saveError;
      savedStates.push(state);
    })
  };

  return { repository, savedStates };
};

describe("sync manager", () => {
  it("replaces a local guest user id across the complete app state", () => {
    const localState: AppState = {
      ...createDefaultAppState(now),
      records: [createRecord()],
      timerSessions: [createTimerSession()],
      achievements: [createAchievement()]
    };

    const replaced = replaceAppStateUserId(localState, "cloud-user-1");

    expect(replaced.profile.userId).toBe("cloud-user-1");
    expect(replaced.dailyGoals.userId).toBe("cloud-user-1");
    expect(replaced.records.map((record) => record.userId)).toEqual(["cloud-user-1"]);
    expect(replaced.timerSessions.map((session) => session.userId)).toEqual(["cloud-user-1"]);
    expect(replaced.achievements.map((achievement) => achievement.userId)).toEqual(["cloud-user-1"]);
    expect(localState.profile.userId).toBe("local-user");
  });

  it("uploads replaced local state on first login when cloud has no state", async () => {
    const localState: AppState = {
      ...createDefaultAppState(now),
      records: [createRecord({ syncStatus: "pending" })],
      timerSessions: [createTimerSession({ syncStatus: "pending" })],
      achievements: [createAchievement({ syncStatus: "pending" })]
    };
    const { repository, savedStates } = createRepository();
    const manager = createSyncManager(repository);

    const result = await manager.importOrLoad("cloud-user-1", localState, "weihao_01");

    expect(repository.loadCloudState).toHaveBeenCalledWith("cloud-user-1");
    expect(repository.saveCloudState).toHaveBeenCalledWith(savedStates[0], "weihao_01");
    expect(savedStates[0].profile.userId).toBe("cloud-user-1");
    expect(savedStates[0].records[0].syncStatus).toBe("synced");
    expect(result.state).toEqual(savedStates[0]);
    expect(result.syncState).toMatchObject({
      mode: "synced",
      message: null,
      lastSyncedAt: expect.any(String)
    });
  });

  it("merges local and cloud state by newest updatedAt for profile, goals, records, and timer sessions", async () => {
    const localState: AppState = {
      ...createDefaultAppState(now),
      profile: {
        ...createDefaultAppState(now).profile,
        targetBand: 8,
        updatedAt: newer
      },
      dailyGoals: {
        ...createDefaultAppState(now).dailyGoals,
        wordsTarget: 200,
        updatedAt: older
      },
      records: [
        createRecord({
          recordId: "local-record",
          words: 220,
          updatedAt: newer
        })
      ],
      timerSessions: [
        createTimerSession({
          actualMinutes: 70,
          updatedAt: older
        })
      ],
      achievements: [createAchievement()]
    };
    const cloudState: AppState = {
      ...replaceAppStateUserId(createDefaultAppState(now), "cloud-user-1"),
      profile: {
        ...replaceAppStateUserId(createDefaultAppState(now), "cloud-user-1").profile,
        targetBand: 7,
        updatedAt: older
      },
      dailyGoals: {
        ...replaceAppStateUserId(createDefaultAppState(now), "cloud-user-1").dailyGoals,
        wordsTarget: 300,
        updatedAt: newer
      },
      records: [
        createRecord({
          recordId: "cloud-record",
          userId: "cloud-user-1",
          words: 100,
          updatedAt: older
        })
      ],
      timerSessions: [
        createTimerSession({
          userId: "cloud-user-1",
          actualMinutes: 80,
          updatedAt: newer
        })
      ],
      achievements: [createAchievement({ userId: "cloud-user-1" })]
    };
    const { repository, savedStates } = createRepository({ cloudState });
    const manager = createSyncManager(repository);

    const result = await manager.importOrLoad("cloud-user-1", localState, "weihao_01");

    expect(result.state.profile).toMatchObject({
      userId: "cloud-user-1",
      targetBand: 8,
      syncStatus: "synced"
    });
    expect(result.state.dailyGoals).toMatchObject({
      userId: "cloud-user-1",
      wordsTarget: 300,
      syncStatus: "synced"
    });
    expect(result.state.records).toHaveLength(1);
    expect(result.state.records[0]).toMatchObject({
      recordId: "local-record",
      userId: "cloud-user-1",
      words: 220,
      syncStatus: "synced"
    });
    expect(result.state.timerSessions).toHaveLength(1);
    expect(result.state.timerSessions[0]).toMatchObject({
      sessionId: "session-reading",
      userId: "cloud-user-1",
      actualMinutes: 80,
      syncStatus: "synced"
    });
    expect(savedStates[0]).toEqual(result.state);
  });

  it("uses the newest same-date record when a deleted tombstone conflicts with an active record", () => {
    const localState: AppState = {
      ...replaceAppStateUserId(createDefaultAppState(now), "cloud-user-1"),
      records: [
        createRecord({
          recordId: "local-deleted-record",
          userId: "cloud-user-1",
          date: "2026-07-24",
          words: 0,
          updatedAt: newer,
          deletedAt: newer
        })
      ]
    };
    const cloudState: AppState = {
      ...replaceAppStateUserId(createDefaultAppState(now), "cloud-user-1"),
      records: [
        createRecord({
          recordId: "cloud-active-record",
          userId: "cloud-user-1",
          date: "2026-07-24",
          words: 180,
          updatedAt: older,
          deletedAt: null
        })
      ]
    };

    const merged = mergeAppStates(localState, cloudState);

    expect(merged.records).toHaveLength(1);
    expect(merged.records[0]).toMatchObject({
      recordId: "local-deleted-record",
      date: "2026-07-24",
      updatedAt: newer,
      deletedAt: newer
    });
  });

  it("keeps unlocked achievements and preserves the earliest unlockedAt when both are unlocked", () => {
    const localState: AppState = {
      ...createDefaultAppState(now),
      achievements: [
        createAchievement({
          unlockedAt: "2026-07-24T03:00:00.000Z",
          updatedAt: newer
        })
      ]
    };
    const cloudState: AppState = {
      ...replaceAppStateUserId(createDefaultAppState(now), "cloud-user-1"),
      achievements: [
        createAchievement({
          userId: "cloud-user-1",
          unlockedAt: "2026-07-24T02:00:00.000Z",
          updatedAt: older
        })
      ]
    };

    const merged = mergeAppStates(replaceAppStateUserId(localState, "cloud-user-1"), cloudState);

    expect(merged.achievements).toHaveLength(1);
    expect(merged.achievements[0]).toMatchObject({
      achievementId: "all-clear",
      userId: "cloud-user-1",
      unlockedAt: "2026-07-24T02:00:00.000Z"
    });
    expect(markAppStateSynced(merged).achievements[0].syncStatus).toBe("synced");
  });

  it("keeps unlocked achievements over locked achievements from either side", () => {
    const localUnlocked = mergeAppStates(
      {
        ...replaceAppStateUserId(createDefaultAppState(now), "cloud-user-1"),
        achievements: [
          createAchievement({
            userId: "cloud-user-1",
            unlockedAt: older,
            updatedAt: older
          })
        ]
      },
      {
        ...replaceAppStateUserId(createDefaultAppState(now), "cloud-user-1"),
        achievements: [
          createAchievement({
            userId: "cloud-user-1",
            unlockedAt: null,
            updatedAt: newer
          })
        ]
      }
    );
    const cloudUnlocked = mergeAppStates(
      {
        ...replaceAppStateUserId(createDefaultAppState(now), "cloud-user-1"),
        achievements: [
          createAchievement({
            userId: "cloud-user-1",
            unlockedAt: null,
            updatedAt: newer
          })
        ]
      },
      {
        ...replaceAppStateUserId(createDefaultAppState(now), "cloud-user-1"),
        achievements: [
          createAchievement({
            userId: "cloud-user-1",
            unlockedAt: older,
            updatedAt: older
          })
        ]
      }
    );

    expect(localUnlocked.achievements).toHaveLength(1);
    expect(localUnlocked.achievements[0].unlockedAt).toBe(older);
    expect(cloudUnlocked.achievements).toHaveLength(1);
    expect(cloudUnlocked.achievements[0].unlockedAt).toBe(older);
  });

  it("returns the original local state and does not save when import load fails", async () => {
    const localState: AppState = {
      ...createDefaultAppState(now),
      records: [createRecord({ syncStatus: "pending" })]
    };
    const { repository } = createRepository({ loadError: new Error("load failed") });
    const manager = createSyncManager(repository);

    const result = await manager.importOrLoad("cloud-user-1", localState, "weihao_01");

    expect(repository.loadCloudState).toHaveBeenCalledWith("cloud-user-1");
    expect(repository.saveCloudState).not.toHaveBeenCalled();
    expect(result.state).toEqual(localState);
    expect(result.syncState).toEqual({
      mode: "error",
      message: "load failed",
      lastSyncedAt: null
    });
  });

  it("maps CloudBase schema cache import failures to a sync error code", async () => {
    const localState: AppState = {
      ...createDefaultAppState(now),
      records: [createRecord({ syncStatus: "pending" })]
    };
    const { repository } = createRepository({
      loadError: new Error(
        "DATABASE_PGRST002: Could not query the database for the schema cache"
      )
    });
    const manager = createSyncManager(repository);

    const result = await manager.importOrLoad("cloud-user-1", localState, "weihao_01");

    expect(repository.saveCloudState).not.toHaveBeenCalled();
    expect(result.state).toEqual(localState);
    expect(result.syncState).toEqual({
      mode: "error",
      code: "cloudbase-api-unavailable",
      message: null,
      lastSyncedAt: null
    });
  });

  it("maps CloudBase database error codes from import load error objects", async () => {
    const localState: AppState = {
      ...createDefaultAppState(now),
      records: [createRecord({ syncStatus: "pending" })]
    };
    const { repository } = createRepository({
      loadError: { code: "DATABASE_PGRST002" }
    });
    const manager = createSyncManager(repository);

    const result = await manager.importOrLoad("cloud-user-1", localState, "weihao_01");

    expect(repository.saveCloudState).not.toHaveBeenCalled();
    expect(result.state).toEqual(localState);
    expect(result.syncState).toEqual({
      mode: "error",
      code: "cloudbase-api-unavailable",
      message: null,
      lastSyncedAt: null
    });
  });

  it("returns the original local state when import save fails", async () => {
    const localState: AppState = {
      ...createDefaultAppState(now),
      records: [createRecord({ syncStatus: "pending" })]
    };
    const { repository } = createRepository({ saveError: new Error("save failed") });
    const manager = createSyncManager(repository);

    const result = await manager.importOrLoad("cloud-user-1", localState, "weihao_01");

    expect(repository.saveCloudState).toHaveBeenCalledOnce();
    expect(result.state).toEqual(localState);
    expect(result.syncState).toEqual({
      mode: "error",
      message: "save failed",
      lastSyncedAt: null
    });
  });

  it("maps CloudBase schema cache save failures during import to a sync error code", async () => {
    const localState: AppState = {
      ...createDefaultAppState(now),
      records: [createRecord({ syncStatus: "pending" })]
    };
    const { repository } = createRepository({
      saveError: new Error("CloudBase schema cache temporarily unavailable")
    });
    const manager = createSyncManager(repository);

    const result = await manager.importOrLoad("cloud-user-1", localState, "weihao_01");

    expect(repository.saveCloudState).toHaveBeenCalledOnce();
    expect(result.state).toEqual(localState);
    expect(result.syncState).toEqual({
      mode: "error",
      code: "cloudbase-api-unavailable",
      message: null,
      lastSyncedAt: null
    });
  });

  it("saves marked-synced state and returns synced when push succeeds", async () => {
    const state: AppState = {
      ...createDefaultAppState(now),
      records: [createRecord({ syncStatus: "pending" })],
      timerSessions: [createTimerSession({ syncStatus: "pending" })],
      achievements: [createAchievement({ syncStatus: "pending" })]
    };
    const { repository, savedStates } = createRepository();
    const manager = createSyncManager(repository);

    const result = await manager.push(state, "weihao_01");

    expect(repository.saveCloudState).toHaveBeenCalledWith(savedStates[0], "weihao_01");
    expect(savedStates[0].profile.syncStatus).toBe("synced");
    expect(savedStates[0].dailyGoals.syncStatus).toBe("synced");
    expect(savedStates[0].records[0].syncStatus).toBe("synced");
    expect(savedStates[0].timerSessions[0].syncStatus).toBe("synced");
    expect(savedStates[0].achievements[0].syncStatus).toBe("synced");
    expect(result.state).toEqual(savedStates[0]);
    expect(result.syncState).toMatchObject({
      mode: "synced",
      message: null,
      lastSyncedAt: expect.any(String)
    });
  });

  it("returns an error state without losing local state when push fails", async () => {
    const state = {
      ...createDefaultAppState(now),
      records: [createRecord({ syncStatus: "pending" })]
    };
    const { repository } = createRepository({ saveError: new Error("network down") });
    const manager = createSyncManager(repository);

    const result = await manager.push(state, "weihao_01");

    expect(result.state).toEqual(state);
    expect(result.syncState).toEqual({
      mode: "error",
      message: "network down",
      lastSyncedAt: null
    });
  });

  it("maps 503 push failures to a sync error code", async () => {
    const state = {
      ...createDefaultAppState(now),
      records: [createRecord({ syncStatus: "pending" })]
    };
    const { repository } = createRepository({
      saveError: new Error("request failed with status 503")
    });
    const manager = createSyncManager(repository);

    const result = await manager.push(state, "weihao_01");

    expect(result.state).toEqual(state);
    expect(result.syncState).toEqual({
      mode: "error",
      code: "cloudbase-api-unavailable",
      message: null,
      lastSyncedAt: null
    });
  });

  it("maps CloudBase database error codes from push Error fields", async () => {
    const state = {
      ...createDefaultAppState(now),
      records: [createRecord({ syncStatus: "pending" })]
    };
    const { repository } = createRepository({
      saveError: Object.assign(new Error("request failed"), { code: "DATABASE_PGRST002" })
    });
    const manager = createSyncManager(repository);

    const result = await manager.push(state, "weihao_01");

    expect(result.state).toEqual(state);
    expect(result.syncState).toEqual({
      mode: "error",
      code: "cloudbase-api-unavailable",
      message: null,
      lastSyncedAt: null
    });
  });

  it("does not import another cloud user's local cache into the requested account", async () => {
    const userAState: AppState = {
      ...replaceAppStateUserId(createDefaultAppState(now), "cloud-user-a"),
      records: [
        createRecord({
          userId: "cloud-user-a",
          words: 900,
          syncStatus: "sync-error"
        })
      ]
    };
    const { repository } = createRepository();
    const manager = createSyncManager(repository);

    const result = await manager.importOrLoad("cloud-user-b", userAState, "user-b@example.com");

    expect(repository.saveCloudState).not.toHaveBeenCalled();
    expect(result.state).toEqual(userAState);
    expect(result.syncState).toEqual({
      mode: "error",
      code: "foreign-cloud-cache",
      message: null,
      lastSyncedAt: null
    });
  });

  it.each(["disabled", "pending"] as const)(
    "blocks import before saving when the local account status is %s",
    async (accountStatus) => {
      const localState: AppState = {
        ...createDefaultAppState(now),
        profile: {
          ...createDefaultAppState(now).profile,
          accountStatus
        }
      };
      const { repository } = createRepository();
      const manager = createSyncManager(repository);

      const result = await manager.importOrLoad("cloud-user-1", localState, "weihao_01");

      expect(repository.loadCloudState).not.toHaveBeenCalled();
      expect(repository.saveCloudState).not.toHaveBeenCalled();
      expect(result.state).toEqual(localState);
      expect(result.syncState).toEqual({
        mode: "error",
        code: accountStatus === "disabled" ? "account-disabled" : "account-pending",
        message: null,
        lastSyncedAt: null
      });
    }
  );

  it.each(["disabled", "pending"] as const)(
    "blocks import save when the loaded cloud account status is %s",
    async (accountStatus) => {
      const localState = createDefaultAppState(now);
      const cloudState: AppState = {
        ...replaceAppStateUserId(createDefaultAppState(now), "cloud-user-1"),
        profile: {
          ...replaceAppStateUserId(createDefaultAppState(now), "cloud-user-1").profile,
          accountStatus
        }
      };
      const { repository } = createRepository({ cloudState });
      const manager = createSyncManager(repository);

      const result = await manager.importOrLoad("cloud-user-1", localState, "weihao_01");

      expect(repository.loadCloudState).toHaveBeenCalledWith("cloud-user-1");
      expect(repository.saveCloudState).not.toHaveBeenCalled();
      expect(result.state).toEqual(cloudState);
      expect(result.syncState).toEqual({
        mode: "error",
        code: accountStatus === "disabled" ? "account-disabled" : "account-pending",
        message: null,
        lastSyncedAt: null
      });
    }
  );

  it.each(["disabled", "pending"] as const)(
    "blocks push without overwriting cloud state when the local account status is %s",
    async (accountStatus) => {
      const state: AppState = {
        ...createDefaultAppState(now),
        profile: {
          ...createDefaultAppState(now).profile,
          accountStatus
        },
        records: [createRecord({ syncStatus: "pending" })]
      };
      const { repository } = createRepository();
      const manager = createSyncManager(repository);

      const result = await manager.push(state, "weihao_01");

      expect(repository.saveCloudState).not.toHaveBeenCalled();
      expect(result.state).toEqual(state);
      expect(result.syncState).toEqual({
        mode: "error",
        code: accountStatus === "disabled" ? "account-disabled" : "account-pending",
        message: null,
        lastSyncedAt: null
      });
    }
  );
});
