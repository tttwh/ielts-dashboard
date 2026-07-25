import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { spawn, spawnSync } from "node:child_process";

const e2eRoot = join(process.cwd(), "tests", "e2e");
const serverHost = "127.0.0.1";
const serverPort = process.env.PLAYWRIGHT_TEST_PORT ?? "4173";
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL ?? `http://${serverHost}:${serverPort}`;
const viteCli = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");
const e2eServerEnv = {
  ...process.env,
  VITE_CLOUDBASE_ACCESS_KEY: process.env.VITE_CLOUDBASE_ACCESS_KEY ?? "e2e-public-access-key",
  VITE_CLOUDBASE_ENV_ID: process.env.VITE_CLOUDBASE_ENV_ID ?? "e2e-cloudbase-env",
  VITE_CLOUDBASE_REGION: process.env.VITE_CLOUDBASE_REGION ?? "ap-shanghai",
  VITE_E2E_FAKE_CLOUDBASE: process.env.VITE_E2E_FAKE_CLOUDBASE ?? "true"
};

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

function existingPath(paths) {
  return paths.find((path) => path && existsSync(path));
}

function systemChromiumCandidates() {
  const home = homedir();

  if (process.platform === "win32") {
    return [
      join(process.env.PROGRAMFILES ?? "", "Google", "Chrome", "Application", "chrome.exe"),
      join(process.env["PROGRAMFILES(X86)"] ?? "", "Google", "Chrome", "Application", "chrome.exe"),
      join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
      join(process.env.PROGRAMFILES ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
      join(process.env["PROGRAMFILES(X86)"] ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
      join(process.env.LOCALAPPDATA ?? "", "Microsoft", "Edge", "Application", "msedge.exe")
    ];
  }

  if (process.platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      join(home, "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome"),
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      join(home, "Applications", "Microsoft Edge.app", "Contents", "MacOS", "Microsoft Edge")
    ];
  }

  return ["google-chrome", "chromium", "chromium-browser", "microsoft-edge"];
}

function configureSystemChromiumFallback() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return;
  }

  const executablePath = existingPath(systemChromiumCandidates());

  if (executablePath) {
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = executablePath;
    console.log(`Using installed Chromium-family browser for Playwright: ${executablePath}`);
  }
}

async function waitForServer(url, child, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`Vite dev server exited early with code ${child.exitCode ?? "unknown"}.`);
    }

    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) {
        return;
      }
    } catch {
      // Server is not ready yet.
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for Vite dev server at ${url}.`);
}

function terminateServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    // Process already exited.
  }
}

function startServer() {
  if (existsSync(viteCli)) {
    return spawn(
      process.execPath,
      [viteCli, "--host", serverHost, "--port", serverPort, "--strictPort"],
      {
        cwd: process.cwd(),
        stdio: "ignore",
        env: e2eServerEnv,
        detached: process.platform !== "win32"
      }
    );
  }

  throw new Error(`Vite CLI not found at ${viteCli}. Run npm install first.`);
}

async function run() {
  configureSystemChromiumFallback();

  const server = startServer();

  try {
    await waitForServer(baseURL, server);
  } catch (error) {
    terminateServer(server);
    throw error;
  }

  const playwrightCli = join(process.cwd(), "node_modules", "@playwright", "test", "cli.js");
  const result = spawnSync(
    process.execPath,
    [playwrightCli, "test", "--pass-with-no-tests", ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        PLAYWRIGHT_TEST_BASE_URL: baseURL
      }
    }
  );

  terminateServer(server);

  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

if (!hasPlaywrightSpecs(e2eRoot)) {
  console.log("No Playwright specs found; skipping e2e run.");
  process.exit(0);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
