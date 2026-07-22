import { defineConfig } from "@playwright/test";

declare const process: {
  env: {
    PLAYWRIGHT_TEST_BASE_URL?: string;
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?: string;
  };
};

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://127.0.0.1:4173";
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const launchOptions = chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL,
    launchOptions
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: "chromium-mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 }
      }
    }
  ]
});
