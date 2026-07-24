import { beforeEach, describe, expect, it } from "vitest";
import type {
  Achievement,
  DailyGoals,
  DailyRecord,
  SectionMinutes,
  SectionTargets,
  TimerSession,
  UserProfile
} from "../../domain/types";
import { createLocalStorageRepository } from "./appRepository";
import type { AppState } from "./storageTypes";

const STORAGE_KEY = "ielts-dashboard-state";
const now = "2026-07-22T00:00:00.000Z";

const validSectionMinutes: SectionMinutes = {
  listening: 45,
  speaking: 30,
  reading: 60,
  writing: 45
};

const validSectionTargets: SectionTargets = {
  listening: 7,
  speaking: 7,
  reading: 7,
  writing: 7
};

const validProfile: UserProfile = {
  userId: "local-user",
  targetBand: 7,
  sectionTargets: validSectionTargets,
  syncStatus: "local",
  createdAt: now,
  updatedAt: now
};

const validDailyGoals: DailyGoals = {
  userId: "local-user",
  wordsTarget: 100,
  speakingTopicsTarget: 3,
  listeningTestsTarget: 1,
  corpusMinutesTarget: 30,
  sectionMinutesTarget: validSectionMinutes,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  syncStatus: "local-only"
};

const validRecord: DailyRecord = {
  recordId: "record-1",
  userId: "local-user",
  date: "2026-07-22",
  words: 120,
  speakingTopics: 4,
  listeningTests: 1,
  corpusMinutes: 35,
  sectionMinutes: validSectionMinutes,
  readingOvertimeMinutes: 5,
  completionRate: 1,
  isAllClear: true,
  xpEarned: 130,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  syncStatus: "local-only"
};

const validTimerSession: TimerSession = {
  sessionId: "session-1",
  userId: "local-user",
  date: "2026-07-22",
  section: "reading",
  source: "in-app-timer",
  plannedMinutes: 60,
  actualMinutes: 65,
  overtimeMinutes: 5,
  startedAt: now,
  endedAt: "2026-07-22T01:05:00.000Z",
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  syncStatus: "local-only"
};

const validAchievement: Achievement = {
  achievementId: "first-all-clear",
  userId: "local-user",
  name: "First All Clear",
  description: "Complete every enabled daily target once.",
  category: "milestone",
  unlockedAt: null,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  syncStatus: "local-only"
};

function createStoredState(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    profile: validProfile,
    dailyGoals: validDailyGoals,
    records: [],
    timerSessions: [],
    achievements: [validAchievement],
    ...overrides
  };
}

describe("local storage repository", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads default state when storage is empty", () => {
    const repo = createLocalStorageRepository();
    const state = repo.loadAppState();

    expect(state.profile.userId).toBe("local-user");
    expect(state.records).toEqual([]);
    expect(state.schemaVersion).toBe(1);
  });

  it("persists and reloads app state", () => {
    const repo = createLocalStorageRepository();
    const state = repo.loadAppState();

    repo.saveAppState({
      ...state,
      profile: { ...state.profile, targetBand: 8 }
    });

    expect(createLocalStorageRepository().loadAppState().profile.targetBand).toBe(8);
  });

  it("recovers from malformed JSON by returning defaults", () => {
    localStorage.setItem(STORAGE_KEY, "{bad-json");
    const repo = createLocalStorageRepository();

    expect(repo.loadAppState().profile.userId).toBe("local-user");
  });

  it("recovers from incompatible schema by returning defaults", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 2 }));
    const repo = createLocalStorageRepository();

    expect(repo.loadAppState().schemaVersion).toBe(1);
    expect(repo.loadAppState().profile.userId).toBe("local-user");
  });

  it.each([
    [
      "profile",
      { profile: { ...validProfile, targetBand: "7" } },
      (state: AppState) => expect(state.profile.targetBand).toBe(7)
    ],
    [
      "dailyGoals",
      { dailyGoals: { ...validDailyGoals, wordsTarget: "100" } },
      (state: AppState) => expect(state.dailyGoals.wordsTarget).toBe(100)
    ],
    [
      "daily record",
      { records: [{ ...validRecord, syncStatus: "uploaded" }] },
      (state: AppState) => expect(state.records).toEqual([])
    ],
    [
      "timer session",
      { timerSessions: [{ ...validTimerSession, section: "grammar" }] },
      (state: AppState) => expect(state.timerSessions).toEqual([])
    ],
    [
      "achievement",
      { achievements: [{ ...validAchievement, category: "speedrun" }] },
      (state: AppState) => expect(state.achievements[0].category).toBe("milestone")
    ]
  ])("recovers from schema version 1 with malformed nested %s data", (_label, overrides, assertDefault) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createStoredState(overrides)));
    const repo = createLocalStorageRepository();
    const state = repo.loadAppState();

    expect(state.profile.userId).toBe("local-user");
    expect(state.schemaVersion).toBe(1);
    assertDefault(state);
  });

  it("loads defaults with cloud-sync-ready metadata for persisted user data", () => {
    const state = createLocalStorageRepository().loadAppState();

    expect(state.dailyGoals).toMatchObject({
      userId: "local-user",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      deletedAt: null,
      syncStatus: "local-only"
    });
    expect(state.achievements[0]).toMatchObject({
      userId: "local-user",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      deletedAt: null,
      syncStatus: "local-only"
    });
  });

  it("loads persisted profiles with synced cloud sync status", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        createStoredState({
          profile: {
            ...validProfile,
            userId: "cloudbase-user-string",
            targetBand: 8,
            syncStatus: "synced"
          }
        })
      )
    );

    const state = createLocalStorageRepository().loadAppState();

    expect(state.profile).toEqual({
      ...validProfile,
      userId: "cloudbase-user-string",
      targetBand: 8,
      syncStatus: "synced"
    });
  });

  it("round-trips goals, record xp, timer sessions, and achievement unlock state", () => {
    const repo = createLocalStorageRepository();
    const state = repo.loadAppState();
    const savedState: AppState = {
      ...state,
      dailyGoals: {
        ...state.dailyGoals,
        userId: "local-user",
        wordsTarget: 250,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: "pending"
      },
      records: [validRecord],
      timerSessions: [validTimerSession],
      achievements: [
        {
          ...state.achievements[0],
          userId: "local-user",
          unlockedAt: now,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          syncStatus: "pending"
        }
      ]
    };

    repo.saveAppState(savedState);
    const reloadedState = createLocalStorageRepository().loadAppState();

    expect(reloadedState.dailyGoals.wordsTarget).toBe(250);
    expect(reloadedState.records).toHaveLength(1);
    expect(reloadedState.records[0].xpEarned).toBe(130);
    expect(reloadedState.timerSessions).toEqual([validTimerSession]);
    expect(reloadedState.achievements[0]).toMatchObject({
      achievementId: state.achievements[0].achievementId,
      unlockedAt: now,
      syncStatus: "pending"
    });
  });
});
