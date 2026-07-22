import { expect, test as base, type Page } from "@playwright/test";

const FIXED_NOW = new Date("2026-07-22T08:00:00.000Z");

const test = base.extend<{ consoleErrorWatcher: void }>({
  consoleErrorWatcher: [
    async ({ page }, use) => {
      const errors: string[] = [];

      page.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(message.text());
        }
      });
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });

      await use();

      expect(errors, "unexpected console or page errors").toEqual([]);
    },
    { auto: true }
  ]
});

async function loadDashboard(page: Page) {
  await page.clock.install({ time: FIXED_NOW });
  await page.goto("/");
}

async function expectNoHorizontalBodyOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
}

test("dashboard loads", async ({ page }) => {
  await loadDashboard(page);

  await expect(page.getByRole("heading", { name: "IELTS Prep Dashboard" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Today completion" })).toHaveAttribute(
    "aria-valuenow",
    "0"
  );
  await expect(page.getByRole("region", { name: "Daily Check-In" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Study Timer" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Target dashboard" })).toBeVisible();
});

test("target score edit survives reload", async ({ page }) => {
  await loadDashboard(page);

  const targetDashboard = page.getByTestId("target-dashboard");
  await targetDashboard.getByLabel("Total band").fill("8.0");
  await targetDashboard.getByLabel("Total band").blur();

  await page.reload();

  await expect(page.getByTestId("target-dashboard").getByLabel("Total band")).toHaveValue("8.0");
});

test("daily check-in updates completion", async ({ page }) => {
  await loadDashboard(page);

  const checkIn = page.getByTestId("daily-checkin");
  await checkIn.getByLabel("Words actual").fill("100");

  await expect(checkIn.getByLabel("Words complete")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Today completion" })).toHaveAttribute(
    "aria-valuenow",
    "13"
  );
});

test("manual external time updates section minutes", async ({ page }) => {
  await loadDashboard(page);

  const checkInStudyTime = page.getByTestId("checkin-study-time-status");
  await expect(checkInStudyTime).toContainText("Writing 0/45 min");

  const manualExternalTimeForm = page.getByTestId("manual-external-time-form");
  await manualExternalTimeForm.getByLabel("Manual section").selectOption("writing");
  await manualExternalTimeForm.getByLabel("Manual minutes").fill("15");
  await manualExternalTimeForm.getByRole("button", { name: /record external time/i }).click();

  await expect(checkInStudyTime).toContainText("Writing 15/45 min");
});

test("mobile viewport has no horizontal body overflow", async ({ page }) => {
  await loadDashboard(page);

  await expectNoHorizontalBodyOverflow(page);
});
