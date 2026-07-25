// @ts-nocheck
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const verifierPath = path.join(projectRoot, "scripts", "verify-cloudbase-env.mjs");

function runVerifier(files: Record<string, string>, args: string[] = []) {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), "cloudbase-env-"));

  try {
    for (const [fileName, contents] of Object.entries(files)) {
      const filePath = path.join(temporaryRoot, fileName);
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, contents, "utf8");
    }

    return spawnSync(process.execPath, [verifierPath, ...args], {
      cwd: temporaryRoot,
      encoding: "utf8"
    });
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
}

describe("verify-cloudbase-env", () => {
  it("accepts a local-only CloudBase public Vite env file", () => {
    const result = runVerifier({
      ".env.local": [
        "VITE_CLOUDBASE_ENV_ID=ielts-prod-123456",
        "VITE_CLOUDBASE_REGION=ap-shanghai",
        "VITE_CLOUDBASE_ACCESS_KEY=public-web-key-123456"
      ].join("\n"),
      ".gitignore": ".env.local\n.env.*.local\n"
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("CloudBase env verification passed");
  });

  it("rejects a missing env file with an actionable message", () => {
    const result = runVerifier({
      ".gitignore": ".env.local\n.env.*.local\n"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Create .env.local");
  });

  it("rejects placeholder CloudBase values before local testing", () => {
    const result = runVerifier({
      ".env.local": [
        "VITE_CLOUDBASE_ENV_ID=<your-env-id>",
        "VITE_CLOUDBASE_REGION=ap-shanghai",
        "VITE_CLOUDBASE_ACCESS_KEY=<your-web-publishable-key>"
      ].join("\n"),
      ".gitignore": ".env.local\n.env.*.local\n"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("replace placeholder");
  });

  it("rejects forbidden frontend env keys that could leak Tencent credentials", () => {
    const result = runVerifier({
      ".env.local": [
        "VITE_CLOUDBASE_ENV_ID=ielts-prod-123456",
        "VITE_CLOUDBASE_REGION=ap-shanghai",
        "VITE_CLOUDBASE_ACCESS_KEY=public-web-key-123456",
        "TENCENTCLOUD_SECRETKEY=do-not-put-this-in-vite"
      ].join("\n"),
      ".gitignore": ".env.local\n.env.*.local\n"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("forbidden or unsupported env key");
  });

  it("rejects env files when local env files are not ignored by git", () => {
    const result = runVerifier({
      ".env.local": [
        "VITE_CLOUDBASE_ENV_ID=ielts-prod-123456",
        "VITE_CLOUDBASE_REGION=ap-shanghai",
        "VITE_CLOUDBASE_ACCESS_KEY=public-web-key-123456"
      ].join("\n"),
      ".gitignore": "node_modules/\n"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(".env.local must be ignored by git");
  });

  it("supports checking a custom env file path", () => {
    const result = runVerifier({
      "tmp/cloudbase.local": [
        "VITE_CLOUDBASE_ENV_ID=ielts-prod-123456",
        "VITE_CLOUDBASE_REGION=ap-shanghai",
        "VITE_CLOUDBASE_ACCESS_KEY=public-web-key-123456"
      ].join("\n"),
      ".gitignore": ".env.local\n.env.*.local\ntmp/cloudbase.local\n"
    }, ["--file", "tmp/cloudbase.local"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("CloudBase env verification passed");
  });
});
