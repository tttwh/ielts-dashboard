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

const keyColumnsFor = (options?: { onConflict?: string }) =>
  options?.onConflict?.split(",").map((key) => key.trim()).filter(Boolean) ?? ["id"];

const createPersistingFakeRdb = () => {
  const tableRows: Record<string, Array<Record<string, unknown>>> = {};
  const upserts: UpsertCall[] = [];

  const rdb: CloudBaseRdbClient = {
    from: <T>(tableName: string) => ({
      select: () => ({
        eq: async (): Promise<CloudBaseRdbResult<T>> => ({
          data: (tableRows[tableName] ?? []) as T[],
          error: null
        })
      }),
      upsert: async (values: T | T[], options?: { onConflict?: string }): Promise<CloudBaseRdbResult<T>> => {
        const incomingRows = (Array.isArray(values) ? values : [values]) as Array<Record<string, unknown>>;
        const targetRows = tableRows[tableName] ?? [];
        const keyColumns = keyColumnsFor(options);

        upserts.push({
          tableName,
          values,
          onConflict: options?.onConflict
        });

        for (const row of incomingRows) {
          const existingIndex = targetRows.findIndex((existing) =>
            keyColumns.every((column) => existing[column] === row[column])
          );
          if (existingIndex >= 0) {
            targetRows[existingIndex] = { ...targetRows[existingIndex], ...row };
          } else {
            targetRows.push({ ...row });
          }
        }

        tableRows[tableName] = targetRows;

        return {
          data: [],
          error: null
        };
      }
    })
  };

  return { rdb, tableRows, upserts };
};

const createStateForUser = (userId: string): AppState => {
  const state = createFilledState();

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
      recordId: "record-2026-07-24",
      userId
    })),
    timerSessions: [],
    achievements: []
  };
};

const createCloudSelectData = (state = createFilledState()): FakeTableData => {
  const rows = appStateToCloudRows(state, "weihao_01");

  return {
    profiles: rows.profile ? [{ ...rows.profile, status: "active" }] : [],
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
        "goals.eq(user_id,cloud-user-1)",
        "daily_records.eq(user_id,cloud-user-1)",
        "timer_sessions.eq(user_id,cloud-user-1)",
        "achievements.eq(user_id,cloud-user-1)"
      ])
    );
    expect(calls).not.toContain("user_settings.select()");
    expect(calls).not.toContain("user_settings.eq(user_id,cloud-user-1)");
  });

  it("uses documented CloudBase RDB query order: select before eq", async () => {
    const { calls, rdb } = createFakeRdb({ selectData: createCloudSelectData() });
    const repository = createCloudRepository(rdb);

    await repository.loadCloudState("cloud-user-1");

    for (const tableName of [
      "profiles",
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
    ["active profile goals", { goals: [] }]
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

  it.each(["disabled", "pending"] as const)(
    "loads %s profile status even when the goals row is absent",
    async (accountStatus) => {
      const rows = appStateToCloudRows(createFilledState(), "weihao_01");
      const { rdb } = createFakeRdb({
        selectData: {
          ...createCloudSelectData(),
          profiles: rows.profile
            ? [
                {
                  ...rows.profile,
                  status: accountStatus
                }
              ]
            : [],
          goals: []
        }
      });
      const repository = createCloudRepository(rdb);

      const state = await repository.loadCloudState("cloud-user-1");

      expect(state?.profile).toMatchObject({
        userId: "cloud-user-1",
        accountStatus,
        syncStatus: "synced"
      });
    }
  );

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
        values: expect.not.objectContaining({ status: expect.any(String) }),
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
        onConflict: "user_id,record_id"
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

  it("keeps identical daily record ids isolated between different users", async () => {
    const { rdb, tableRows, upserts } = createPersistingFakeRdb();
    const repository = createCloudRepository(rdb);

    await repository.saveCloudState(createStateForUser("cloud-user-1"), "weihao_01");
    await repository.saveCloudState(createStateForUser("cloud-user-2"), "weihao_02");

    const dailyRecordUpserts = upserts.filter((upsert) => upsert.tableName === "daily_records");
    expect(dailyRecordUpserts).toHaveLength(2);
    expect(dailyRecordUpserts.every((upsert) => upsert.onConflict === "user_id,record_id")).toBe(true);
    expect(tableRows.daily_records).toEqual([
      expect.objectContaining({
        record_id: "record-2026-07-24",
        user_id: "cloud-user-1"
      }),
      expect.objectContaining({
        record_id: "record-2026-07-24",
        user_id: "cloud-user-2"
      })
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
