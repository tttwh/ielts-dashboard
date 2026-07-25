import { readFileSync } from "node:fs";

const sql = readFileSync("cloudbase/sql/cloud-sync-auth.sql", "utf8");
const normalizedSql = sql.toLowerCase();

const tables = [
  "profiles",
  "goals",
  "daily_records",
  "timer_sessions",
  "achievements",
];

const policyNames = tables.flatMap((table) => [
  `${table}_select_own`,
  `${table}_insert_own`,
  `${table}_update_own`,
]);

const forbidden = [
  "secretId",
  "secretKey",
  "SecretId",
  "SecretKey",
  "TENCENTCLOUD_SECRETID",
  "TENCENTCLOUD_SECRETKEY",
  "api_key",
  "API_KEY",
  "service_role",
  "password",
];

const missing = [];

const getCreateTableBody = (tableName) => {
  const match = sql.match(
    new RegExp(`create table if not exists public\\.${tableName} \\(([\\s\\S]*?)\\n\\);`, "i"),
  );
  return match?.[1] ?? "";
};

for (const table of tables) {
  if (!sql.includes(`create table if not exists public.${table}`)) {
    missing.push(`${table} table`);
  }
  const tableBody = getCreateTableBody(table);
  const tablePattern = new RegExp(
    `create table if not exists public\\.${table} \\([\\s\\S]*?user_id varchar\\(64\\)[\\s\\S]*?references auth\\.users\\(id\\)`,
    "i",
  );
  if (!tablePattern.test(sql)) {
    missing.push(`${table} varchar(64) auth.users(id) user_id reference`);
  }
  if (!/\buser_id\s+varchar\(64\)[^\n,]*\bdefault\s+auth\.uid\(\)/i.test(tableBody)) {
    missing.push(`${table} user_id default auth.uid()`);
  }
  if (!sql.includes(`alter table public.${table} enable row level security`)) {
    missing.push(`${table} RLS enable`);
  }
  if (!sql.includes(`${table}_select_own`)) missing.push(`${table} select policy`);
  if (!sql.includes(`${table}_insert_own`)) missing.push(`${table} insert policy`);
  if (!sql.includes(`${table}_update_own`)) missing.push(`${table} update policy`);
}

for (const policyName of policyNames) {
  if (!sql.includes(`drop policy if exists ${policyName}`)) {
    missing.push(`${policyName} idempotent drop`);
  }
}

for (const value of forbidden) {
  if (normalizedSql.includes(value.toLowerCase())) {
    missing.push(`forbidden credential marker ${value}`);
  }
}

if (!sql.includes("references auth.users(id)")) {
  missing.push("auth.users(id) references");
}

if (/\buser_id\s+uuid\b/i.test(sql)) {
  missing.push("stale uuid user_id column");
}

const profilesTable = getCreateTableBody("profiles");
const goalsTable = getCreateTableBody("goals");
const dailyRecordsTable = getCreateTableBody("daily_records");

if (!/\buser_id\s+varchar\(64\)[^\n,]*\bprimary key\b[^\n,]*\breferences auth\.users\(id\)/i.test(goalsTable)) {
  missing.push("goals user_id primary key");
}

if (/\bgoal_id\b/i.test(goalsTable)) {
  missing.push("stale goals goal_id column");
}

if (/goals_one_active_per_user_idx/i.test(sql)) {
  missing.push("stale goals partial user index");
}

if (!/\brecord_id\s+text\s+primary key\b/i.test(dailyRecordsTable)) {
  missing.push("daily_records record_id text primary key");
}

if (/\brecord_id\s+uuid\b/i.test(dailyRecordsTable)) {
  missing.push("stale daily_records uuid record_id column");
}

if (!/\bstatus\s+text\s+not null\s+default 'active'\s+check\s*\(status in \('active', 'disabled', 'pending'\)\)/i.test(profilesTable)) {
  missing.push("profiles server-managed status column");
}

if (!/profiles_insert_own[\s\S]*with check\s*\(\s*user_id\s*=\s*\(select auth\.uid\(\)\)\s+and\s+status\s*=\s*'active'\s*\)/i.test(sql)) {
  missing.push("profiles insert active status check");
}

if (
  !/create or replace function public\.prevent_profile_status_update_by_authenticated/i.test(sql) ||
  !/new\.status\s+is\s+distinct\s+from\s+old\.status/i.test(sql) ||
  !/execute function public\.prevent_profile_status_update_by_authenticated\(\)/i.test(sql)
) {
  missing.push("profile status update guard");
}

if (!sql.includes("with check (user_id = (select auth.uid()))")) {
  missing.push("ownership WITH CHECK policy");
}

if (missing.length > 0) {
  console.error(`CloudBase SQL verification failed:\n${missing.join("\n")}`);
  process.exit(1);
}

console.log("CloudBase SQL verification passed");
