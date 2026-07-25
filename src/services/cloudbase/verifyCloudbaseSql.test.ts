// @ts-nocheck
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const verifierPath = path.join(projectRoot, "scripts", "verify-cloudbase-sql.mjs");
const sourceSqlPath = path.join(projectRoot, "cloudbase", "sql", "cloud-sync-auth.sql");

function runVerifierWithSql(sql: string) {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), "cloudbase-sql-"));

  try {
    const sqlDirectory = path.join(temporaryRoot, "cloudbase", "sql");
    mkdirSync(sqlDirectory, { recursive: true });
    writeFileSync(path.join(sqlDirectory, "cloud-sync-auth.sql"), sql, "utf8");

    return spawnSync(process.execPath, [verifierPath], {
      cwd: temporaryRoot,
      encoding: "utf8"
    });
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
}

describe("verify-cloudbase-sql", () => {
  it("rejects user-owned user_id columns without default auth.uid()", () => {
    const sql = readFileSync(sourceSqlPath, "utf8").replace(
      /\s+default\s+auth\.uid\(\)/gi,
      ""
    );
    const result = runVerifierWithSql(sql);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("default auth.uid()");
  });

  it("rejects globally scoped daily record primary keys", () => {
    const sql = readFileSync(sourceSqlPath, "utf8")
      .replace(/\brecord_id\s+text\s+not null\b/i, "record_id text primary key")
      .replace(/,\s*primary key\s*\(\s*user_id\s*,\s*record_id\s*\)/i, "");
    const result = runVerifierWithSql(sql);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("daily_records primary key (user_id, record_id)");
  });

  it("rejects uuid daily record ids because app record ids are text", () => {
    const sql = readFileSync(sourceSqlPath, "utf8").replace(
      /\brecord_id\s+text\s+(?:not null|primary key)\b/i,
      "record_id uuid primary key default gen_random_uuid()"
    ).replace(/,\s*primary key\s*\(\s*user_id\s*,\s*record_id\s*\)/i, "");
    const result = runVerifierWithSql(sql);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("daily_records record_id text not null");
  });

  it("rejects uuid timer session ids because fallback session ids are text", () => {
    const sql = readFileSync(sourceSqlPath, "utf8").replace(
      /\bsession_id\s+text\s+primary key\b/i,
      "session_id uuid primary key default gen_random_uuid()"
    );
    const result = runVerifierWithSql(sql);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("timer_sessions session_id text primary key");
  });

  it("rejects profile policies without an authenticated status update guard", () => {
    const sql = readFileSync(sourceSqlPath, "utf8").replace(
      /create or replace function public\.prevent_profile_status_update_by_authenticated[\s\S]*?execute function public\.prevent_profile_status_update_by_authenticated\(\);/i,
      ""
    );
    const result = runVerifierWithSql(sql);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("profile status update guard");
  });
});
