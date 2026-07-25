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
  type TimerSessionRow,
  type UserSettingsRow
} from "./cloudMappers";

export interface CloudRepository {
  loadCloudState(userId: string): Promise<AppState | null>;
  saveCloudState(state: AppState, accountName: string | null): Promise<void>;
}

const assertResult = <T>(tableName: string, result: CloudBaseRdbResult<T>): T[] => {
  if (result.error) {
    throw new Error(`${tableName}: ${result.error.message ?? "CloudBase request failed"}`);
  }

  return Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
};

const requireMappedRow = <T>(tableName: string, row: T | null): T => {
  if (!row) {
    throw new Error(`${tableName}: Cloud mapper did not create a required row`);
  }
  return row;
};

const asUnknownResult = <T>(
  result: Promise<CloudBaseRdbResult<T>>
): Promise<CloudBaseRdbResult<unknown>> => result as Promise<CloudBaseRdbResult<unknown>>;

export function createCloudRepository(rdb: CloudBaseRdbClient): CloudRepository {
  return {
    async loadCloudState(userId) {
      const [profiles, userSettings, goals, records, timerSessions, achievements] = await Promise.all([
        rdb.from<ProfileRow>("profiles").select().eq("user_id", userId),
        rdb.from<UserSettingsRow>("user_settings").select().eq("user_id", userId),
        rdb.from<GoalsRow>("goals").select().eq("user_id", userId),
        rdb.from<DailyRecordRow>("daily_records").select().eq("user_id", userId),
        rdb.from<TimerSessionRow>("timer_sessions").select().eq("user_id", userId),
        rdb.from<AchievementRow>("achievements").select().eq("user_id", userId)
      ]);

      const profileRows = assertResult("profiles", profiles);
      const userSettingsRows = assertResult("user_settings", userSettings);
      const goalsRows = assertResult("goals", goals);
      const recordRows = assertResult("daily_records", records);
      const timerSessionRows = assertResult("timer_sessions", timerSessions);
      const achievementRows = assertResult("achievements", achievements);

      if (profileRows.length === 0 || goalsRows.length === 0) return null;

      return cloudRowsToAppState(
        {
          profile: profileRows[0],
          userSettings: userSettingsRows[0] ?? null,
          goals: goalsRows[0],
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
      const userSettings = requireMappedRow("user_settings", rows.userSettings);
      const goals = requireMappedRow("goals", rows.goals);

      const writes: Array<{ tableName: string; result: Promise<CloudBaseRdbResult<unknown>> }> = [
        {
          tableName: "profiles",
          result: asUnknownResult(rdb.from<ProfileRow>("profiles").upsert(profile, { onConflict: "user_id" }))
        },
        {
          tableName: "user_settings",
          result: asUnknownResult(
            rdb.from<UserSettingsRow>("user_settings").upsert(userSettings, { onConflict: "user_id" })
          )
        },
        {
          tableName: "goals",
          result: asUnknownResult(rdb.from<GoalsRow>("goals").upsert(goals, { onConflict: "user_id" }))
        },
        {
          tableName: "daily_records",
          result:
            rows.records.length > 0
              ? asUnknownResult(
                  rdb.from<DailyRecordRow>("daily_records").upsert(rows.records, { onConflict: "record_id" })
                )
              : Promise.resolve({ data: [], error: null })
        },
        {
          tableName: "timer_sessions",
          result:
            rows.timerSessions.length > 0
              ? asUnknownResult(
                  rdb.from<TimerSessionRow>("timer_sessions").upsert(rows.timerSessions, {
                    onConflict: "session_id"
                  })
                )
              : Promise.resolve({ data: [], error: null })
        },
        {
          tableName: "achievements",
          result:
            rows.achievements.length > 0
              ? asUnknownResult(
                  rdb.from<AchievementRow>("achievements").upsert(rows.achievements, {
                    onConflict: "user_id,achievement_id"
                  })
                )
              : Promise.resolve({ data: [], error: null })
        }
      ];

      const results = await Promise.all(writes.map((write) => write.result));
      results.forEach((result, index) => assertResult(writes[index].tableName, result));
    }
  };
}
