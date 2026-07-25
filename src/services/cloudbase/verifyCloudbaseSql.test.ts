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

describe("verify-cloudbase-sql", () => {
  it("rejects user-owned user_id columns without default auth.uid()", () => {
    const temporaryRoot = mkdtempSync(path.join(tmpdir(), "cloudbase-sql-"));

    try {
      const sql = readFileSync(sourceSqlPath, "utf8").replace(
        /\s+default\s+auth\.uid\(\)/gi,
        ""
      );
      const sqlDirectory = path.join(temporaryRoot, "cloudbase", "sql");
      mkdirSync(sqlDirectory, { recursive: true });
      writeFileSync(path.join(sqlDirectory, "cloud-sync-auth.sql"), sql, "utf8");

      const result = spawnSync(process.execPath, [verifierPath], {
        cwd: temporaryRoot,
        encoding: "utf8"
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("default auth.uid()");
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  });
});
