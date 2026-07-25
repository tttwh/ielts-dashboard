import { describe, expect, it } from "vitest";
import { createDefaultAppState } from "../../domain/defaults";
import type { AppState } from "../storage/storageTypes";
import { appStateToCloudRows } from "./cloudMappers";
import { createCloudRepository } from "./cloudRepository";
import type { CloudBaseRdbClient, CloudBaseRdbResult } from "./cloudbaseTypes";

type FakeTableData = Record<string, unknown[] | unknown | null>;
type FakeTableErrors = Record<string, string>;

interface UpsertCall {
  tableName: string;
  values: unknown;
  onConflict: string | undefined;
}

const now = "2026-07-24T00:00:00.000Z";
const updatedAt = "2026-07-24T01:00:00.000Z";

const createFilledState = (): AppState => {
  const state = createDefaultAppState(now);

  return {
    ...state,
    profile: {
      ...state.profile,
      userId: "cloud-user-1",
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
      userId: "cloud-user-1",
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
      updatedAt
    },
    records: [
      {
        recordId: "record-2026-07-24",
        userId: "cloud-user-1",
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
        deletedAt: null,
        syncStatus: "pending"
      }
    ],
    timerSessions: [
      {
        sessionId: "session-2026-07-24-reading",
        userId: "cloud-user-1",
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
        userId: "cloud-user-1",
        unlockedAt: updatedAt,
        createdAt: now,
        updatedAt,
        deletedAt: null,
        syncStatus: "pending"
      }
    ]
  };
};

const createFakeRdb = ({
  selectData = {},
  selectErrors = {},
  upsertErrors = {}
}: {
  selectData?: FakeTableData;
  selectErrors?: FakeTableErrors;
  upsertErrors?: FakeTableErrors;
} = {}) => {
  const calls: string[] = [];
  const upserts: UpsertCall[] = [];

  const rdb: CloudBaseRdbClient = {
    from: <T>(tableName: string) => ({
      select: () => {
        calls.push(`${tableName}.select()`);

        return {
          eq: async (column: string, value: unknown): Promise<CloudBaseRdbResult<T>> => {
            calls.push(`${tableName}.eq(${column},${String(value)})`);

            return {
              data: (selectData[tableName] ?? []) as T[] | T | null,
              error: selectErrors[tableName] ? { message: selectErrors[tableName] } : null
            };
          }
        };
      },
      upsert: async (values: T | T[], options?: { onConflict?: string }): Promise<CloudBaseRdbResult<T>> => {
        calls.push(`${tableName}.upsert(${options?.onConflict ?? ""})`);
        upserts.push({
          tableName,
          values,
          onConflict: options?.onConflict
        });

        return {
          data: [],
          error: upsertErrors[tableName] ? { message: upsertErrors[tableName] } : null
        };
      }
    })
  };

  return { calls, rdb, upserts };
};

const createCloudSelectData = (state = createFilledState()): FakeTableData => {
  const rows = appStateToCloudRows(state, "weihao_01");

  return {
    profiles: [rows.profile],
    user_settings: [rows.userSettings],
    goals: [rows.goals],
    daily_records: rows.records,
    timer_sessions: rows.timerSessions,
    achievements: rows.achievements
  };
};

describe("createCloudRepository", () => {
  it("selects every cloud table scoped to the user id", async () => {
    const { calls, rdb } = createFakeRdb({ selectData: createCloudSelectData() });
    const repository = createCloudRepository(rdb);

    await repository.loadCloudState("cloud-user-1");

    expect(calls).toEqual(
      expect.arrayContaining([
        "profiles.eq(user_id,cloud-user-1)",
        "user_settings.eq(user_id,cloud-user-1)",
        "goals.eq(user_id,cloud-user-1)",
        "daily_records.eq(user_id,cloud-user-1)",
        "timer_sessions.eq(user_id,cloud-user-1)",
        "achievements.eq(user_id,cloud-user-1)"
      ])
    );
  });

  it("uses documented CloudBase RDB query order: select before eq", async () => {
    const { calls, rdb } = createFakeRdb({ selectData: createCloudSelectData() });
    const repository = createCloudRepository(rdb);

    await repository.loadCloudState("cloud-user-1");

    for (const tableName of [
      "profiles",
      "user_settings",
      "goals",
      "daily_records",
      "timer_sessions",
      "achievements"
    ]) {
      expect(calls.indexOf(`${tableName}.select()`)).toBeGreaterThanOrEqual(0);
      expect(calls.indexOf(`${tableName}.select()`)).toBeLessThan(
        calls.indexOf(`${tableName}.eq(user_id,cloud-user-1)`)
      );
    }
  });

  it.each([
    ["profiles", { profiles: [] }],
    ["goals", { goals: [] }]
  ])("returns null when %s rows are empty", async (_tableName, overrides) => {
    const { rdb } = createFakeRdb({
      selectData: {
        ...createCloudSelectData(),
        ...overrides
      }
    });
    const repository = createCloudRepository(rdb);

    await expect(repository.loadCloudState("cloud-user-1")).resolves.toBeNull();
  });

  it("loads cloud rows into app state", async () => {
    const { rdb } = createFakeRdb({ selectData: createCloudSelectData() });
    const repository = createCloudRepository(rdb);

    const state = await repository.loadCloudState("cloud-user-1");

    expect(state?.profile).toMatchObject({
      userId: "cloud-user-1",
      targetBand: 7.5,
      syncStatus: "synced"
    });
    expect(state?.dailyGoals.wordsTarget).toBe(180);
    expect(state?.records).toHaveLength(1);
    expect(state?.timerSessions).toHaveLength(1);
    expect(state?.achievements).toHaveLength(1);
  });

  it("upserts all cloud rows with conflict targets", async () => {
    const state = createFilledState();
    const rows = appStateToCloudRows(state, "weihao_01");
    const { rdb, upserts } = createFakeRdb();
    const repository = createCloudRepository(rdb);

    await repository.saveCloudState(state, "weihao_01");

    expect(upserts).toEqual([
      {
        tableName: "profiles",
        values: rows.profile,
        onConflict: "user_id"
      },
      {
        tableName: "user_settings",
        values: rows.userSettings,
        onConflict: "user_id"
      },
      {
        tableName: "goals",
        values: rows.goals,
        onConflict: "user_id"
      },
      {
        tableName: "daily_records",
        values: rows.records,
        onConflict: "record_id"
      },
      {
        tableName: "timer_sessions",
        values: rows.timerSessions,
        onConflict: "session_id"
      },
      {
        tableName: "achievements",
        values: rows.achievements,
        onConflict: "user_id,achievement_id"
      }
    ]);
  });

  it("throws readable load errors from CloudBase", async () => {
    const { rdb } = createFakeRdb({
      selectData: createCloudSelectData(),
      selectErrors: {
        daily_records: "permission denied"
      }
    });
    const repository = createCloudRepository(rdb);

    await expect(repository.loadCloudState("cloud-user-1")).rejects.toThrow(
      "daily_records: permission denied"
    );
  });

  it("throws readable save errors from CloudBase", async () => {
    const { rdb } = createFakeRdb({
      upsertErrors: {
        achievements: "duplicate key"
      }
    });
    const repository = createCloudRepository(rdb);

    await expect(repository.saveCloudState(createFilledState(), "weihao_01")).rejects.toThrow(
      "achievements: duplicate key"
    );
  });
});
