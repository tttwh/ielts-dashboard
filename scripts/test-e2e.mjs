import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const e2eRoot = join(process.cwd(), "tests", "e2e");

function hasPlaywrightSpecs(directory) {
  if (!existsSync(directory)) {
    return false;
  }

  const stack = [directory];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (/\.(spec|test)\.[cm]?[jt]sx?$/.test(entry.name)) {
        return true;
      }
    }
  }

  return false;
}

if (!hasPlaywrightSpecs(e2eRoot)) {
  console.log("No Playwright specs found; skipping e2e run.");
  process.exit(0);
}

const playwrightCli = join(process.cwd(), "node_modules", "@playwright", "test", "cli.js");
const result = spawnSync(process.execPath, [playwrightCli, "test", "--pass-with-no-tests", ...process.argv.slice(2)], {
  stdio: "inherit"
});

process.exit(result.status ?? 1);
