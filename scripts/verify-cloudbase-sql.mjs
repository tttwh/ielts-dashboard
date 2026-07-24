import { readFileSync } from "node:fs";

const sql = readFileSync("cloudbase/sql/cloud-sync-auth.sql", "utf8");
const normalizedSql = sql.toLowerCase();

const tables = [
  "profiles",
  "user_settings",
  "goals",
  "daily_records",
  "timer_sessions",
  "achievements",
];

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
  const tablePattern = new RegExp(
    `create table if not exists public\\.${table} \\([\\s\\S]*?user_id varchar\\(64\\)[\\s\\S]*?references auth\\.users\\(id\\)`,
    "i",
  );
  if (!tablePattern.test(sql)) {
    missing.push(`${table} varchar(64) auth.users(id) user_id reference`);
  }
  if (!sql.includes(`alter table public.${table} enable row level security`)) {
    missing.push(`${table} RLS enable`);
  }
  if (!sql.includes(`${table}_select_own`)) missing.push(`${table} select policy`);
  if (!sql.includes(`${table}_insert_own`)) missing.push(`${table} insert policy`);
  if (!sql.includes(`${table}_update_own`)) missing.push(`${table} update policy`);
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

const goalsTable = getCreateTableBody("goals");
if (!/\buser_id\s+varchar\(64\)\s+primary key\s+references auth\.users\(id\)/i.test(goalsTable)) {
  missing.push("goals user_id primary key");
}

if (/\bgoal_id\b/i.test(goalsTable)) {
  missing.push("stale goals goal_id column");
}

if (/goals_one_active_per_user_idx/i.test(sql)) {
  missing.push("stale goals partial user index");
}

if (!sql.includes("with check (user_id = (select auth.uid()))")) {
  missing.push("ownership WITH CHECK policy");
}

if (missing.length > 0) {
  console.error(`CloudBase SQL verification failed:\n${missing.join("\n")}`);
  process.exit(1);
}

console.log("CloudBase SQL verification passed");
