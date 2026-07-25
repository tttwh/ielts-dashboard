import { describe, expect, it } from "vitest";
import { createDefaultAppState } from "../../domain/defaults";
import type { AppState } from "../storage/storageTypes";
import { appStateToCloudRows, cloudRowsToAppState } from "./cloudMappers";

const now = "2026-07-24T00:00:00.000Z";
const updatedAt = "2026-07-24T01:00:00.000Z";
const deletedAt = "2026-07-25T00:00:00.000Z";

const createFilledState = (): AppState => {
  const state = createDefaultAppState(now);

  return {
    ...state,
    profile: {
      ...state.profile,
      userId: "cloudbase-user-string",
      targetBand: 7.5,
      sectionTargets: {
        listening: 8,
        speaking: 7,
        reading: 7.5,
        writing: 6.5
      },
      updatedAt
    },
    dailyGoals: {
      ...state.dailyGoals,
      userId: "cloudbase-user-string",
      wordsTarget: 180,
      speakingTopicsTarget: 4,
      listeningTestsTarget: 2,
      corpusMinutesTarget: 40,
      sectionMinutesTarget: {
        listening: 50,
        speaking: 35,
        reading: 65,
        writing: 45
      },
      updatedAt,
      deletedAt
    },
    records: [
      {
        recordId: "record-2026-07-24",
        userId: "cloudbase-user-string",
        date: "2026-07-24",
        words: 210,
        speakingTopics: 5,
        listeningTests: 2,
        corpusMinutes: 45,
        sectionMinutes: {
          listening: 50,
          speaking: 35,
          reading: 70,
          writing: 45
        },
        readingOvertimeMinutes: 10,
        completionRate: 1,
        isAllClear: true,
        xpEarned: 180,
        createdAt: now,
        updatedAt,
        deletedAt,
        syncStatus: "pending"
      }
    ],
    timerSessions: [
      {
        sessionId: "session-2026-07-24-reading",
        userId: "cloudbase-user-string",
        date: "2026-07-24",
        section: "reading",
        source: "manual-external",
        plannedMinutes: 60,
        actualMinutes: 70,
        overtimeMinutes: 10,
        startedAt: "2026-07-24T08:00:00.000Z",
        endedAt: "2026-07-24T09:10:00.000Z",
        createdAt: now,
        updatedAt,
        deletedAt: null,
        syncStatus: "local-only"
      }
    ],
    achievements: [
      {
        ...state.achievements[0],
        userId: "cloudbase-user-string",
        unlockedAt: updatedAt,
        createdAt: now,
        updatedAt,
        deletedAt: null,
        syncStatus: "pending"
      }
    ]
  };
};

describe("CloudBase cloud mappers", () => {
  it("maps app state to normalized PG rows", () => {
    const state = createFilledState();

    const rows = appStateToCloudRows(state, "weihao_01");

    expect(rows.profile).toEqual({
      user_id: "cloudbase-user-string",
      account_name: "weihao_01",
      email: null,
      status: "active",
      display_name: null,
      created_at: now,
      updated_at: updatedAt
    });
    expect(rows.userSettings).toEqual({
      user_id: "cloudbase-user-string",
      language: "zh-CN",
      created_at: now,
      updated_at: updatedAt
    });
    expect(rows.goals).toEqual({
      user_id: "cloudbase-user-string",
      overall_band: 7.5,
      listening_band: 8,
      speaking_band: 7,
      reading_band: 7.5,
      writing_band: 6.5,
      words_target: 180,
      speaking_topics_target: 4,
      listening_tests_target: 2,
      corpus_minutes_target: 40,
      section_minutes_target: {
        listening: 50,
        speaking: 35,
        reading: 65,
        writing: 45
      },
      created_at: now,
      updated_at: updatedAt,
      deleted_at: deletedAt
    });
    expect(rows.records).toEqual([
      {
        record_id: "record-2026-07-24",
        user_id: "cloudbase-user-string",
        record_date: "2026-07-24",
        words_memorized: 210,
        speaking_topics: 5,
        listening_tests: 2,
        corpus_minutes: 45,
        section_minutes: {
          listening: 50,
          speaking: 35,
          reading: 70,
          writing: 45
        },
        reading_overtime_minutes: 10,
        completion_rate: 1,
        is_all_clear: true,
        xp_earned: 180,
        created_at: now,
        updated_at: updatedAt,
        deleted_at: deletedAt
      }
    ]);
    expect(rows.timerSessions).toEqual([
      {
        session_id: "session-2026-07-24-reading",
        user_id: "cloudbase-user-string",
        record_date: "2026-07-24",
        section: "reading",
        source: "manual-external",
        planned_minutes: 60,
        actual_minutes: 70,
        overtime_minutes: 10,
        started_at: "2026-07-24T08:00:00.000Z",
        ended_at: "2026-07-24T09:10:00.000Z",
        created_at: now,
        updated_at: updatedAt,
        deleted_at: null
      }
    ]);
    expect(rows.achievements).toEqual([
      {
        achievement_id: state.achievements[0].achievementId,
        user_id: "cloudbase-user-string",
        name: state.achievements[0].name,
        description: state.achievements[0].description,
        category: state.achievements[0].category,
        unlocked_at: updatedAt,
        created_at: now,
        updated_at: updatedAt,
        deleted_at: null
      }
    ]);
  });

  it("writes profile accountStatus to the CloudBase profile status row", () => {
    const state = {
      ...createFilledState(),
      profile: {
        ...createFilledState().profile,
        accountStatus: "pending" as const
      }
    };

    const rows = appStateToCloudRows(state, "weihao_01");

    expect(rows.profile?.status).toBe("pending");
  });

  it("maps normalized PG rows back to app state", () => {
    const fallback = createDefaultAppState(now);
    const rows = appStateToCloudRows(createFilledState(), "weihao_01");

    const restored = cloudRowsToAppState(rows, fallback);

    expect(restored.schemaVersion).toBe(1);
    expect(restored.profile).toEqual({
      userId: "cloudbase-user-string",
      targetBand: 7.5,
      sectionTargets: {
        listening: 8,
        speaking: 7,
        reading: 7.5,
        writing: 6.5
      },
      syncStatus: "synced",
      accountStatus: "active",
      createdAt: now,
      updatedAt
    });
    expect(restored.dailyGoals).toEqual({
      userId: "cloudbase-user-string",
      wordsTarget: 180,
      speakingTopicsTarget: 4,
      listeningTestsTarget: 2,
      corpusMinutesTarget: 40,
      sectionMinutesTarget: {
        listening: 50,
        speaking: 35,
        reading: 65,
        writing: 45
      },
      createdAt: now,
      updatedAt,
      deletedAt,
      syncStatus: "synced"
    });
    expect(restored.records).toEqual([
      {
        recordId: "record-2026-07-24",
        userId: "cloudbase-user-string",
        date: "2026-07-24",
        words: 210,
        speakingTopics: 5,
        listeningTests: 2,
        corpusMinutes: 45,
        sectionMinutes: {
          listening: 50,
          speaking: 35,
          reading: 70,
          writing: 45
        },
        readingOvertimeMinutes: 10,
        completionRate: 1,
        isAllClear: true,
        xpEarned: 180,
        createdAt: now,
        updatedAt,
        deletedAt,
        syncStatus: "synced"
      }
    ]);
    expect(restored.timerSessions).toEqual([
      {
        sessionId: "session-2026-07-24-reading",
        userId: "cloudbase-user-string",
        date: "2026-07-24",
        section: "reading",
        source: "manual-external",
        plannedMinutes: 60,
        actualMinutes: 70,
        overtimeMinutes: 10,
        startedAt: "2026-07-24T08:00:00.000Z",
        endedAt: "2026-07-24T09:10:00.000Z",
        createdAt: now,
        updatedAt,
        deletedAt: null,
        syncStatus: "synced"
      }
    ]);
    expect(restored.achievements).toEqual([
      {
        achievementId: rows.achievements[0].achievement_id,
        userId: "cloudbase-user-string",
        name: rows.achievements[0].name,
        description: rows.achievements[0].description,
        category: rows.achievements[0].category,
        unlockedAt: updatedAt,
        createdAt: now,
        updatedAt,
        deletedAt: null,
        syncStatus: "synced"
      }
    ]);
  });

  it("restores CloudBase profile status into app profile accountStatus", () => {
    const fallback = createDefaultAppState(now);
    const rows = appStateToCloudRows(createFilledState(), "weihao_01");

    const restored = cloudRowsToAppState(
      {
        ...rows,
        profile: rows.profile ? { ...rows.profile, status: "disabled" } : null
      },
      fallback
    );

    expect(restored.profile.accountStatus).toBe("disabled");
  });

  it("uses restored profile user id for fallback goals when goals row is absent", () => {
    const fallback = createDefaultAppState(now);
    const rows = appStateToCloudRows(createFilledState(), "weihao_01");

    const restored = cloudRowsToAppState({ ...rows, goals: null }, fallback);

    expect(restored.profile.userId).toBe("cloudbase-user-string");
    expect(restored.dailyGoals).toEqual({
      ...fallback.dailyGoals,
      userId: "cloudbase-user-string"
    });
  });
});
