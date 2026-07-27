import { createDefaultAppState } from "../../domain/defaults";
import type { AppState } from "../storage/storageTypes";
import type { CloudBaseRdbClient, CloudBaseRdbResult } from "./cloudbaseTypes";
import {
  appStateToCloudRows,
  cloudRowsToAppState,
  type AchievementRow,
  type DailyRecordRow,
  type GoalsRow,
  type ProfileRow,
  type ProfileWriteRow,
  type TimerSessionRow
} from "./cloudMappers";

export interface CloudRepository {
  loadCloudState(userId: string): Promise<AppState | null>;
  saveCloudState(state: AppState, accountName: string | null): Promise<void>;
}

const assertResult = <T>(tableName: string, result: CloudBaseRdbResult<T>): T[] => {
  if (result.error) {
    const error = new Error(`${tableName}: ${result.error.message ?? "CloudBase request failed"}`);
    const errorMetadata = result.error as {
      code?: unknown;
      status?: unknown;
      statusCode?: unknown;
    };

    if (errorMetadata.code !== undefined) {
      (error as Error & { code?: unknown }).code = errorMetadata.code;
    }
    if (errorMetadata.status !== undefined) {
      (error as Error & { status?: unknown }).status = errorMetadata.status;
    }
    if (errorMetadata.statusCode !== undefined) {
      (error as Error & { statusCode?: unknown }).statusCode = errorMetadata.statusCode;
    }

    throw error;
  }

  return Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
};

const transientRetryDelaysMs = [500, 1200, 2500] as const;

interface RetryableCloudBaseError {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
}

const sleep = (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const getErrorShape = (error: unknown): RetryableCloudBaseError => {
  if (error && typeof error === "object") {
    return error as RetryableCloudBaseError;
  }

  return {
    message: String(error)
  };
};

const getStatus = (value: unknown): number | null => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const isTransientCloudBaseRestError = (error: unknown): boolean => {
  const errorShape = getErrorShape(error);
  const code = errorShape.code == null ? "" : String(errorShape.code);
  const message =
    typeof errorShape.message === "string"
      ? errorShape.message
      : error instanceof Error
        ? error.message
        : "";
  const lowerMessage = message.toLowerCase();
  const status = getStatus(errorShape.status) ?? getStatus(errorShape.statusCode) ?? getStatus(code);

  return (
    status === 503 ||
    code === "DATABASE_PGRST002" ||
    lowerMessage.includes("schema cache") ||
    /\b503\b/.test(message)
  );
};

const runWithTransientRetry = async <T>(
  createRequest: () => Promise<CloudBaseRdbResult<T>>
): Promise<CloudBaseRdbResult<T>> => {
  for (let attemptIndex = 0; ; attemptIndex += 1) {
    try {
      const result = await createRequest();

      if (result.error && isTransientCloudBaseRestError(result.error) && attemptIndex < transientRetryDelaysMs.length) {
        await sleep(transientRetryDelaysMs[attemptIndex]);
        continue;
      }

      return result;
    } catch (error) {
      if (isTransientCloudBaseRestError(error) && attemptIndex < transientRetryDelaysMs.length) {
        await sleep(transientRetryDelaysMs[attemptIndex]);
        continue;
      }

      throw error;
    }
  }
};

const requireMappedRow = <T>(tableName: string, row: T | null): T => {
  if (!row) {
    throw new Error(`${tableName}: Cloud mapper did not create a required row`);
  }
  return row;
};

export function createCloudRepository(rdb: CloudBaseRdbClient): CloudRepository {
  return {
    async loadCloudState(userId) {
      const selectByUserId = <T>(tableName: string) =>
        runWithTransientRetry(() => rdb.from<T>(tableName).select().eq("user_id", userId));

      const profileRows = assertResult("profiles", await selectByUserId<ProfileRow>("profiles"));
      const goalsRows = assertResult("goals", await selectByUserId<GoalsRow>("goals"));
      const recordRows = assertResult("daily_records", await selectByUserId<DailyRecordRow>("daily_records"));
      const timerSessionRows = assertResult(
        "timer_sessions",
        await selectByUserId<TimerSessionRow>("timer_sessions")
      );
      const achievementRows = assertResult("achievements", await selectByUserId<AchievementRow>("achievements"));
      const profile = profileRows[0] ?? null;
      const goalsRow = goalsRows[0] ?? null;

      if (!profile) return null;
      if (profile?.status === "active" && !goalsRow) return null;

      return cloudRowsToAppState(
        {
          profile,
          goals: goalsRow,
          records: recordRows,
          timerSessions: timerSessionRows,
          achievements: achievementRows
        },
        createDefaultAppState(new Date().toISOString())
      );
    },

    async saveCloudState(state, accountName) {
      const rows = appStateToCloudRows(state, accountName);
      const profile = requireMappedRow("profiles", rows.profile);
      const goals = requireMappedRow("goals", rows.goals);

      assertResult(
        "profiles",
        await runWithTransientRetry(() =>
          rdb.from<ProfileWriteRow>("profiles").upsert(profile, { onConflict: "user_id" })
        )
      );
      assertResult(
        "goals",
        await runWithTransientRetry(() => rdb.from<GoalsRow>("goals").upsert(goals, { onConflict: "user_id" }))
      );

      if (rows.records.length > 0) {
        assertResult(
          "daily_records",
          await runWithTransientRetry(() =>
            rdb.from<DailyRecordRow>("daily_records").upsert(rows.records, { onConflict: "user_id,record_id" })
          )
        );
      }

      if (rows.timerSessions.length > 0) {
        assertResult(
          "timer_sessions",
          await runWithTransientRetry(() =>
            rdb.from<TimerSessionRow>("timer_sessions").upsert(rows.timerSessions, {
              onConflict: "user_id,session_id"
            })
          )
        );
      }

      if (rows.achievements.length > 0) {
        assertResult(
          "achievements",
          await runWithTransientRetry(() =>
            rdb.from<AchievementRow>("achievements").upsert(rows.achievements, {
              onConflict: "user_id,achievement_id"
            })
          )
        );
      }
    }
  };
}
