import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

declare const process: {
  cwd(): string;
  env: {
    VITE_E2E_FAKE_CLOUDBASE?: string;
  };
};

const e2eRoot = `${process.cwd().replace(/\\/g, "/")}/tests/e2e/fakes`;
const e2eCloudBaseFakePath = `${e2eRoot}/cloudbase-js-sdk.ts`;
const e2eCloudBaseMySQLFakePath = `${e2eRoot}/cloudbase-js-sdk-mysql.ts`;

const e2eCloudBaseAlias =
  process.env.VITE_E2E_FAKE_CLOUDBASE === "true"
    ? [
        {
          find: "@cloudbase/js-sdk/mysql",
          replacement: e2eCloudBaseMySQLFakePath
        },
        {
          find: "@cloudbase/js-sdk",
          replacement: e2eCloudBaseFakePath
        }
      ]
    : [];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: e2eCloudBaseAlias
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    passWithNoTests: true
  }
});
