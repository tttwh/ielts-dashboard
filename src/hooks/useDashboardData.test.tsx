import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultAppState } from "../domain/defaults";
import type { AppState } from "../services/storage/storageTypes";
import {
  createEmptyDailyRecord,
  recalculateDailyRecordProgress
} from "../domain/progress";
import type { SyncManager } from "../services/sync/syncManager";
import type { SyncResult } from "../services/sync/syncTypes";
import { createMemoryRepository } from "../services/storage/appRepository";
import { useDashboardData } from "./useDashboardData";

const today = "2026-07-22";
const now = "2026-07-22T08:00:00.000Z";

const createState = (): AppState => createDefaultAppState("2026-07-22T00:00:00.000Z");

const syncedResult = (state: AppState): SyncResult => ({
  state,
  syncState: {
    mode: "synced",
    message: null,
    lastSyncedAt: now
  }
});

const withUserId = (state: AppState, userId: string): AppState => ({
  ...state,
  profile: {
    ...state.profile,
    userId,
    syncStatus: "synced"
  },
  dailyGoals: {
    ...state.dailyGoals,
    userId,
    syncStatus: "synced"
  },
  records: state.records.map((record) => ({
    ...record,
    userId,
    syncStatus: "synced"
  })),
  timerSessions: state.timerSessions.map((session) => ({
    ...session,
    userId,
    syncStatus: "synced"
  })),
  achievements: state.achievements.map((achievement) => ({
    ...achievement,
    userId,
    syncStatus: "synced"
  }))
});

const createRecordForUser = (state: AppState, userId: string, words: number): AppState => {
  const record = recalculateDailyRecordProgress(
    {
      ...createEmptyDailyRecord(today, userId, now),
      words,
      updatedAt: now,
      syncStatus: userId === "local-user" ? "local-only" : "synced"
    },
    state.dailyGoals
  );

  return {
    ...state,
    profile: {
      ...state.profile,
      userId,
      syncStatus: userId === "local-user" ? "local" : "synced"
    },
    dailyGoals: {
      ...state.dailyGoals,
      userId,
      syncStatus: userId === "local-user" ? "local-only" : "synced"
    },
    records: [record]
  };
};

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates today's record, recalculates completion, and saves state", () => {
    const repo = createMemoryRepository();
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.updateTodayRecord({ words: 100 });
    });

    expect(result.current.todayRecord).toMatchObject({
      date: today,
      words: 100,
      completionRate: 0.125,
      isAllClear: false,
      xpEarned: 13,
      updatedAt: now,
      syncStatus: "local-only"
    });
    expect(repo.loadAppState().records[0]).toMatchObject({
      date: today,
      words: 100,
      completionRate: 0.125,
      xpEarned: 13,
      syncStatus: "local-only"
    });
  });

  it("merges partial today record updates without dropping existing values", () => {
    const repo = createMemoryRepository();
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.updateTodayRecord({ words: 40, speakingTopics: 1 });
    });
    act(() => {
      result.current.updateTodayRecord({ corpusMinutes: 15 });
    });

    expect(result.current.todayRecord).toMatchObject({
      words: 40,
      speakingTopics: 1,
      corpusMinutes: 15
    });
    expect(repo.loadAppState().records).toHaveLength(1);
  });

  it("adds a timer session to today's section minutes and reading overtime", () => {
    const repo = createMemoryRepository();
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.addTimerSession({
        sessionId: "session-1",
        userId: "local-user",
        date: today,
        section: "reading",
        source: "in-app-timer",
        plannedMinutes: 60,
        actualMinutes: 65,
        overtimeMinutes: 5,
        startedAt: "2026-07-22T06:55:00.000Z",
        endedAt: "2026-07-22T08:00:00.000Z",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: "local-only"
      });
    });

    expect(result.current.todayRecord.sectionMinutes.reading).toBe(65);
    expect(result.current.todayRecord.readingOvertimeMinutes).toBe(5);
    expect(repo.loadAppState().timerSessions).toHaveLength(1);
    expect(repo.loadAppState().records[0].sectionMinutes.reading).toBe(65);
  });

  it("updates profile and daily goals with local sync metadata", () => {
    const repo = createMemoryRepository();
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.updateProfile({ targetBand: 8 });
      result.current.updateDailyGoals({
        wordsTarget: 120,
        sectionMinutesTarget: { reading: 75 }
      });
    });

    expect(result.current.state.profile).toMatchObject({
      targetBand: 8,
      updatedAt: now,
      syncStatus: "local"
    });
    expect(result.current.state.dailyGoals).toMatchObject({
      wordsTarget: 120,
      updatedAt: now,
      syncStatus: "local-only"
    });
    expect(result.current.state.dailyGoals.sectionMinutesTarget.reading).toBe(75);
    expect(repo.loadAppState().dailyGoals.wordsTarget).toBe(120);
  });

  it("recalculates today's record after daily goal changes", () => {
    const repo = createMemoryRepository();
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.updateTodayRecord({ words: 100 });
    });
    act(() => {
      result.current.updateDailyGoals({ wordsTarget: 200 });
    });

    expect(result.current.todayRecord.completionRate).toBe(0.0625);
    expect(result.current.todayRecord.xpEarned).toBe(6);
    expect(repo.loadAppState().records[0].completionRate).toBe(0.0625);
  });

  it("preserves historical record progress when daily goals change", () => {
    const state = createState();
    const historicalRecord = recalculateDailyRecordProgress(
      {
        ...createEmptyDailyRecord(
          "2026-07-21",
          state.profile.userId,
          "2026-07-21T00:00:00.000Z"
        ),
        words: 100,
        speakingTopics: 3,
        listeningTests: 1,
        corpusMinutes: 30,
        sectionMinutes: {
          listening: 45,
          speaking: 30,
          reading: 60,
          writing: 45
        },
        updatedAt: "2026-07-21T08:00:00.000Z",
        syncStatus: "synced"
      },
      state.dailyGoals
    );
    const currentRecord = recalculateDailyRecordProgress(
      {
        ...createEmptyDailyRecord(today, state.profile.userId, "2026-07-22T00:00:00.000Z"),
        words: 100
      },
      state.dailyGoals
    );
    const repo = createMemoryRepository({
      ...state,
      records: [historicalRecord, currentRecord]
    });
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.updateDailyGoals({ wordsTarget: 200 });
    });

    const records = repo.loadAppState().records;
    expect(records.find((record) => record.date === "2026-07-21")).toEqual(historicalRecord);
    expect(records.find((record) => record.date === today)).toMatchObject({
      completionRate: 0.0625,
      xpEarned: 6,
      updatedAt: now,
      syncStatus: "local-only"
    });
  });

  it("evaluates and persists achievement unlocks after today's record changes", () => {
    const repo = createMemoryRepository();
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.updateTodayRecord({
        words: 100,
        speakingTopics: 3,
        listeningTests: 1,
        corpusMinutes: 30,
        sectionMinutes: {
          listening: 45,
          speaking: 30,
          reading: 60,
          writing: 45
        }
      });
    });

    expect(result.current.state.achievements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          achievementId: "all-clear",
          unlockedAt: now,
          syncStatus: "local-only"
        })
      ])
    );
    expect(result.current.latestUnlockedAchievementId).toBe("all-clear");
    expect(
      repo
        .loadAppState()
        .achievements.find((achievement) => achievement.achievementId === "all-clear")?.unlockedAt
    ).toBe(now);
  });

  it("unlocks eligible achievements and persists them", () => {
    const state = createState();
    const repo = createMemoryRepository({
      ...state,
      records: [
        {
          recordId: "record-2026-07-22",
          userId: "local-user",
          date: today,
          words: 100,
          speakingTopics: 3,
          listeningTests: 1,
          corpusMinutes: 30,
          sectionMinutes: {
            listening: 45,
            speaking: 30,
            reading: 60,
            writing: 45
          },
          readingOvertimeMinutes: 0,
          completionRate: 1,
          isAllClear: true,
          xpEarned: 130,
          createdAt: "2026-07-22T00:00:00.000Z",
          updatedAt: "2026-07-22T00:00:00.000Z",
          deletedAt: null,
          syncStatus: "synced"
        }
      ]
    });
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.unlockAchievementsIfNeeded();
    });

    expect(result.current.state.achievements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          achievementId: "all-clear",
          unlockedAt: now,
          syncStatus: "local-only"
        }),
        expect.objectContaining({
          achievementId: "balanced-day",
          unlockedAt: now,
          syncStatus: "local-only"
        })
      ])
    );
    expect(repo.loadAppState().achievements[0].unlockedAt).toBe(now);
  });

  it("keeps guest sync behavior unchanged when no sync manager is provided", async () => {
    const repo = createMemoryRepository();
    const { result } = renderHook(() => useDashboardData(repo, today));

    expect(result.current.syncState).toEqual({
      mode: "guest",
      message: null,
      lastSyncedAt: null
    });

    await act(async () => {
      await result.current.syncNow("cloud-user-1", "weihao_01");
    });

    expect(result.current.syncState).toEqual({
      mode: "guest",
      message: null,
      lastSyncedAt: null
    });
    expect(result.current.state.profile.userId).toBe("local-user");

    act(() => {
      result.current.updateTodayRecord({ words: 100 });
    });

    expect(result.current.todayRecord.words).toBe(100);
    expect(repo.loadAppState().records[0].words).toBe(100);
  });

  it("imports or loads cloud state on first sync for a cloud user", async () => {
    const repo = createMemoryRepository();
    const importOrLoad = vi.fn(async (_userId: string, localState: AppState) =>
      syncedResult(withUserId(localState, "cloud-user-1"))
    );
    const push = vi.fn<SyncManager["push"]>();
    const syncManager: SyncManager = {
      importOrLoad,
      push
    };
    const { result } = renderHook(() => useDashboardData(repo, today, syncManager));

    await act(async () => {
      await result.current.syncNow("cloud-user-1", "weihao_01");
    });

    expect(importOrLoad).toHaveBeenCalledWith(
      "cloud-user-1",
      expect.objectContaining({
        profile: expect.objectContaining({ userId: "local-user" })
      }),
      "weihao_01"
    );
    expect(push).not.toHaveBeenCalled();
    expect(result.current.state.profile.userId).toBe("cloud-user-1");
    expect(repo.loadAppState()).toEqual(result.current.state);
    expect(result.current.syncState).toEqual({
      mode: "synced",
      message: null,
      lastSyncedAt: now
    });
  });

  it("restores the pre-auth guest state after authenticated sync enters guest mode", async () => {
    const guestState = createRecordForUser(createState(), "local-user", 25);
    const cloudUserAState = createRecordForUser(
      withUserId(createState(), "cloud-user-a"),
      "cloud-user-a",
      900
    );
    const repo = createMemoryRepository(guestState);
    const importOrLoad = vi.fn(async () => syncedResult(cloudUserAState));
    const push = vi.fn<SyncManager["push"]>();
    const syncManager: SyncManager = {
      importOrLoad,
      push
    };
    const { result } = renderHook(() => useDashboardData(repo, today, syncManager));

    await act(async () => {
      await result.current.syncNow("cloud-user-1", "weihao_01");
    });

    expect(result.current.syncState.mode).toBe("synced");
    expect(result.current.state.profile.userId).toBe("cloud-user-a");
    expect(result.current.todayRecord.words).toBe(900);

    act(() => {
      result.current.enterGuestMode();
    });

    expect(result.current.syncState).toEqual({
      mode: "guest",
      message: null,
      lastSyncedAt: null
    });
    expect(result.current.state.profile.userId).toBe("local-user");
    expect(result.current.todayRecord.words).toBe(25);
    expect(repo.loadAppState().profile.userId).toBe("local-user");
    expect(repo.loadAppState().records[0]).toMatchObject({
      userId: "local-user",
      words: 25
    });
  });

  it("keeps guest edits local after logout instead of marking sync offline", async () => {
    const guestState = createRecordForUser(createState(), "local-user", 25);
    const cloudUserAState = createRecordForUser(
      withUserId(createState(), "cloud-user-a"),
      "cloud-user-a",
      900
    );
    const repo = createMemoryRepository(guestState);
    const importOrLoad = vi.fn(async () => syncedResult(cloudUserAState));
    const push = vi.fn<SyncManager["push"]>();
    const syncManager: SyncManager = {
      importOrLoad,
      push
    };
    const { result } = renderHook(() => useDashboardData(repo, today, syncManager));

    await act(async () => {
      await result.current.syncNow("cloud-user-a", "user-a@example.com");
    });

    act(() => {
      result.current.enterGuestMode();
    });

    act(() => {
      result.current.updateTodayRecord({ words: 100 });
    });

    expect(result.current.syncState).toEqual({
      mode: "guest",
      message: null,
      lastSyncedAt: null
    });
    expect(result.current.state.profile.userId).toBe("local-user");
    expect(result.current.todayRecord).toMatchObject({
      userId: "local-user",
      words: 100,
      syncStatus: "local-only"
    });
    expect(repo.loadAppState().records[0]).toMatchObject({
      userId: "local-user",
      words: 100,
      syncStatus: "local-only"
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("imports guest data, not user A data, when user B logs in after user A logout", async () => {
    const guestState = createRecordForUser(createState(), "local-user", 25);
    const cloudUserAState = createRecordForUser(
      withUserId(createState(), "cloud-user-a"),
      "cloud-user-a",
      900
    );
    const repo = createMemoryRepository(guestState);
    const importOrLoad = vi.fn(async (userId: string, localState: AppState) => {
      if (userId === "cloud-user-a") return syncedResult(cloudUserAState);
      return syncedResult(withUserId(localState, userId));
    });
    const push = vi.fn<SyncManager["push"]>();
    const syncManager: SyncManager = {
      importOrLoad,
      push
    };
    const { result } = renderHook(() => useDashboardData(repo, today, syncManager));

    await act(async () => {
      await result.current.syncNow("cloud-user-a", "user-a@example.com");
    });

    act(() => {
      result.current.enterGuestMode();
    });
    act(() => {
      result.current.updateTodayRecord({ words: 100 });
    });

    await act(async () => {
      await result.current.syncNow("cloud-user-b", "user-b@example.com");
    });

    expect(importOrLoad).toHaveBeenCalledTimes(2);
    expect(importOrLoad.mock.calls[1][1]).toMatchObject({
      profile: expect.objectContaining({ userId: "local-user" }),
      records: [
        expect.objectContaining({
          userId: "local-user",
          words: 100
        })
      ]
    });
    expect(result.current.state.profile.userId).toBe("cloud-user-b");
    expect(result.current.todayRecord).toMatchObject({
      userId: "cloud-user-b",
      words: 100
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("uses a fresh guest state when only a cloud-user state is present at logout", () => {
    const repo = createMemoryRepository(
      createRecordForUser(withUserId(createState(), "cloud-user-a"), "cloud-user-a", 900)
    );
    const syncManager: SyncManager = {
      importOrLoad: vi.fn(),
      push: vi.fn()
    };
    const { result } = renderHook(() => useDashboardData(repo, today, syncManager));

    act(() => {
      result.current.enterGuestMode();
    });

    expect(result.current.syncState.mode).toBe("guest");
    expect(result.current.state.profile.userId).toBe("local-user");
    expect(result.current.state.records).toEqual([]);
    expect(repo.loadAppState().profile.userId).toBe("local-user");
    expect(repo.loadAppState().records).toEqual([]);
  });

  it("ignores an in-flight sync result after returning to guest mode", async () => {
    const repo = createMemoryRepository();
    let resolveImport: (result: SyncResult) => void = () => undefined;
    const importPromise = new Promise<SyncResult>((resolve) => {
      resolveImport = resolve;
    });
    const importOrLoad = vi.fn<SyncManager["importOrLoad"]>(() => importPromise);
    const push = vi.fn<SyncManager["push"]>();
    const syncManager: SyncManager = {
      importOrLoad,
      push
    };
    const { result } = renderHook(() => useDashboardData(repo, today, syncManager));

    let syncPromise: Promise<void> = Promise.resolve();
    act(() => {
      syncPromise = result.current.syncNow("cloud-user-1", "weihao_01");
    });

    expect(result.current.syncState.mode).toBe("syncing");

    act(() => {
      result.current.enterGuestMode();
    });

    expect(result.current.syncState.mode).toBe("guest");

    await act(async () => {
      resolveImport(syncedResult(withUserId(createState(), "cloud-user-1")));
      await syncPromise;
    });

    expect(result.current.syncState).toEqual({
      mode: "guest",
      message: null,
      lastSyncedAt: null
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps local writes local and pushes the latest state on later sync", async () => {
    const repo = createMemoryRepository();
    let resolvePush: (result: SyncResult) => void = () => undefined;
    const pushPromise = new Promise<SyncResult>((resolve) => {
      resolvePush = resolve;
    });
    const importOrLoad = vi.fn(async (_userId: string, localState: AppState) =>
      syncedResult(withUserId(localState, "cloud-user-1"))
    );
    const push = vi.fn<SyncManager["push"]>(() => pushPromise);
    const syncManager: SyncManager = {
      importOrLoad,
      push
    };
    const { result } = renderHook(() => useDashboardData(repo, today, syncManager));

    await act(async () => {
      await result.current.syncNow("cloud-user-1", "weihao_01");
    });

    act(() => {
      result.current.updateTodayRecord({ words: 100 });
    });

    expect(push).not.toHaveBeenCalled();
    expect(result.current.syncState.mode).toBe("offline");
    expect(result.current.todayRecord.words).toBe(100);

    let syncPromise: Promise<void> | null = null;
    await act(async () => {
      syncPromise = result.current.syncNow("cloud-user-1", "weihao_01");
    });

    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({
        records: [
          expect.objectContaining({
            userId: "cloud-user-1",
            words: 100
          })
        ]
      }),
      "weihao_01"
    );
    expect(result.current.syncState.mode).toBe("syncing");

    const pushedState = push.mock.calls[0][0];
    const pushedResult = syncedResult(withUserId(pushedState, "cloud-user-1"));

    await act(async () => {
      resolvePush(pushedResult);
      await syncPromise;
    });

    expect(result.current.state).toEqual(pushedResult.state);
    expect(repo.loadAppState()).toEqual(pushedResult.state);
    expect(result.current.syncState).toEqual(pushedResult.syncState);
  });

  it("preserves local edits made while a sync request is in flight", async () => {
    const repo = createMemoryRepository();
    let resolvePush: (result: SyncResult) => void = () => undefined;
    const pushPromise = new Promise<SyncResult>((resolve) => {
      resolvePush = resolve;
    });
    const importOrLoad = vi.fn(async (_userId: string, localState: AppState) =>
      syncedResult(withUserId(localState, "cloud-user-1"))
    );
    const push = vi.fn<SyncManager["push"]>(() => pushPromise);
    const syncManager: SyncManager = {
      importOrLoad,
      push
    };
    const { result } = renderHook(() => useDashboardData(repo, today, syncManager));

    await act(async () => {
      await result.current.syncNow("cloud-user-1", "weihao_01");
    });

    act(() => {
      result.current.updateTodayRecord({ words: 100 });
    });

    let syncPromise: Promise<void> = Promise.resolve();
    await act(async () => {
      syncPromise = result.current.syncNow("cloud-user-1", "weihao_01");
    });

    const staleSyncState = push.mock.calls[0][0];

    vi.setSystemTime(new Date("2026-07-22T08:00:01.000Z"));
    act(() => {
      result.current.updateTodayRecord({ words: 200 });
    });

    expect(result.current.todayRecord.words).toBe(200);
    expect(repo.loadAppState().records[0].words).toBe(200);

    await act(async () => {
      resolvePush(syncedResult(withUserId(staleSyncState, "cloud-user-1")));
      await syncPromise;
    });

    expect(result.current.todayRecord).toMatchObject({
      words: 200,
      updatedAt: "2026-07-22T08:00:01.000Z"
    });
    expect(repo.loadAppState().records[0]).toMatchObject({
      words: 200,
      updatedAt: "2026-07-22T08:00:01.000Z"
    });
  });

  it("does not overwrite local edits when an in-flight sync returns an error result", async () => {
    const repo = createMemoryRepository();
    let resolvePush: (result: SyncResult) => void = () => undefined;
    const pushPromise = new Promise<SyncResult>((resolve) => {
      resolvePush = resolve;
    });
    const importOrLoad = vi.fn(async (_userId: string, localState: AppState) =>
      syncedResult(withUserId(localState, "cloud-user-1"))
    );
    const push = vi.fn<SyncManager["push"]>(() => pushPromise);
    const syncManager: SyncManager = {
      importOrLoad,
      push
    };
    const { result } = renderHook(() => useDashboardData(repo, today, syncManager));

    await act(async () => {
      await result.current.syncNow("cloud-user-1", "weihao_01");
    });

    act(() => {
      result.current.updateTodayRecord({ words: 100 });
    });

    let syncPromise: Promise<void> = Promise.resolve();
    await act(async () => {
      syncPromise = result.current.syncNow("cloud-user-1", "weihao_01");
    });

    const staleSyncState = push.mock.calls[0][0];

    vi.setSystemTime(new Date("2026-07-22T08:00:01.000Z"));
    act(() => {
      result.current.updateTodayRecord({ words: 200 });
    });

    await act(async () => {
      resolvePush({
        state: staleSyncState,
        syncState: {
          mode: "error",
          message: "network down",
          lastSyncedAt: null
        }
      });
      await syncPromise;
    });

    expect(result.current.todayRecord).toMatchObject({
      words: 200,
      updatedAt: "2026-07-22T08:00:01.000Z"
    });
    expect(repo.loadAppState().records[0]).toMatchObject({
      words: 200,
      updatedAt: "2026-07-22T08:00:01.000Z"
    });
    expect(result.current.syncState).toEqual({
      mode: "error",
      message: "network down",
      lastSyncedAt: null
    });
  });

  it("does not let a stale authenticated push restore user A state after logout", async () => {
    const guestState = createRecordForUser(createState(), "local-user", 25);
    let resolvePush: (result: SyncResult) => void = () => undefined;
    const pushPromise = new Promise<SyncResult>((resolve) => {
      resolvePush = resolve;
    });
    const importOrLoad = vi.fn(async (_userId: string, localState: AppState) =>
      syncedResult(withUserId(localState, "cloud-user-a"))
    );
    const push = vi.fn<SyncManager["push"]>(() => pushPromise);
    const syncManager: SyncManager = {
      importOrLoad,
      push
    };
    const repo = createMemoryRepository(guestState);
    const { result } = renderHook(() => useDashboardData(repo, today, syncManager));

    await act(async () => {
      await result.current.syncNow("cloud-user-a", "user-a@example.com");
    });
    act(() => {
      result.current.updateTodayRecord({ words: 900 });
    });

    let syncPromise: Promise<void> = Promise.resolve();
    await act(async () => {
      syncPromise = result.current.syncNow("cloud-user-a", "user-a@example.com");
    });
    const staleUserAState = push.mock.calls[0][0];

    act(() => {
      result.current.enterGuestMode();
    });

    await act(async () => {
      resolvePush(syncedResult(staleUserAState));
      await syncPromise;
    });

    expect(result.current.syncState).toEqual({
      mode: "guest",
      message: null,
      lastSyncedAt: null
    });
    expect(result.current.state.profile.userId).toBe("local-user");
    expect(result.current.todayRecord.words).toBe(25);
    expect(repo.loadAppState().profile.userId).toBe("local-user");
    expect(repo.loadAppState().records[0]).toMatchObject({
      userId: "local-user",
      words: 25
    });
  });
});
