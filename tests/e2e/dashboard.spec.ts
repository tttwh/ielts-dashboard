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
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function openView(page: Page, label: string) {
  await page.getByRole("link", { name: label }).click();
}

async function expectNoHorizontalBodyOverflow(page: Page) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasOverflow).toBe(false);
}

test("dashboard loads into overview with six-page navigation", async ({ page }) => {
  await loadDashboard(page);

  await expect(page.getByRole("heading", { name: "IELTS Prep Dashboard" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Today completion" })).toHaveAttribute(
    "aria-valuenow",
    "0"
  );
  await expect(page.getByTestId("page-overview")).toBeVisible();
  await expect(page.getByRole("link", { name: "Overview" })).toHaveAttribute(
    "aria-current",
    "page"
  );

  for (const label of ["Check-in", "Timer", "Progress", "Rewards", "Settings"]) {
    await expect(page.getByRole("link", { name: label })).toBeVisible();
  }

  await expect(page.getByTestId("daily-checkin")).toHaveCount(0);
});

test("navigation switches pages and writes hash routes", async ({ page }) => {
  await loadDashboard(page);

  await openView(page, "Timer");
  await expect(page).toHaveURL(/#timer$/);
  await expect(page.getByTestId("page-timer")).toBeVisible();
  await expect(page.getByTestId("study-timer-panel")).toBeVisible();

  await openView(page, "Progress");
  await expect(page).toHaveURL(/#progress$/);
  await expect(page.getByTestId("history-heatmap")).toBeVisible();

  await openView(page, "Rewards");
  await expect(page).toHaveURL(/#rewards$/);
  await expect(page.getByTestId("rewards-panel")).toBeVisible();
});

test("language toggle switches visible dashboard copy and survives reload", async ({ page }) => {
  await loadDashboard(page);

  await page.getByRole("button", { name: "中" }).click();

  await expect(page.getByRole("heading", { name: "雅思备考打卡看板" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "总览" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "今日完成度" })).toHaveAttribute(
    "aria-valuenow",
    "0"
  );
  await expect(page.getByText("本地模式 · 已预留云同步结构")).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: "雅思备考打卡看板" })).toBeVisible();

  await page.getByRole("button", { name: "Eng" }).click();

  await expect(page.getByRole("heading", { name: "IELTS Prep Dashboard" })).toBeVisible();
});

test("target score edit survives reload from settings", async ({ page }) => {
  await loadDashboard(page);

  await openView(page, "Settings");
  const targetDashboard = page.getByTestId("target-dashboard");
  await targetDashboard.getByLabel("Total band").fill("8.0");
  await targetDashboard.getByLabel("Total band").blur();

  await page.reload();

  await expect(page).toHaveURL(/#settings$/);
  await expect(page.getByTestId("target-dashboard").getByLabel("Total band")).toHaveValue("8.0");
});

test("daily check-in updates completion", async ({ page }) => {
  await loadDashboard(page);

  await openView(page, "Check-in");
  const checkIn = page.getByTestId("daily-checkin");
  await checkIn.getByLabel("Words actual").fill("100");

  await expect(checkIn.getByLabel("Words complete")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Today completion" })).toHaveAttribute(
    "aria-valuenow",
    "13"
  );
});

test("manual external time updates section minutes across pages", async ({ page }) => {
  await loadDashboard(page);

  await openView(page, "Check-in");
  await expect(page.getByTestId("checkin-study-time-status")).toContainText("Writing 0/45 min");

  await openView(page, "Timer");
  const manualExternalTimeForm = page.getByTestId("manual-external-time-form");
  await manualExternalTimeForm.getByLabel("Manual section").selectOption("writing");
  await manualExternalTimeForm.getByLabel("Manual minutes").fill("15");
  await manualExternalTimeForm.getByRole("button", { name: /record external time/i }).click();

  await openView(page, "Check-in");
  await expect(page.getByTestId("checkin-study-time-status")).toContainText("Writing 15/45 min");
});

test("viewport has no horizontal body overflow", async ({ page }) => {
  await loadDashboard(page);

  await expectNoHorizontalBodyOverflow(page);
});

test("accessibility contract covers labels, heatmap, and timer keyboard controls", async ({
  page
}) => {
  await loadDashboard(page);

  await expect(page.getByText("Local mode · cloud-ready schema")).toBeVisible();
  await expect(page.getByText(/online sync|server sync|syncing|synced/i)).toHaveCount(0);

  const unlabeledControls = await page.evaluate(() => {
    const unlabeledButtons = [...document.querySelectorAll("button")].filter(
      (button) => !button.textContent?.trim() && !button.getAttribute("aria-label")
    ).length;
    const unlabeledInputs = [...document.querySelectorAll("input, select, textarea")].filter(
      (control) => {
        const id = control.getAttribute("id");
        const hasLabel = id
          ? Boolean(document.querySelector(`label[for='${CSS.escape(id)}']`))
          : Boolean(control.closest("label"));
        return (
          !hasLabel &&
          !control.getAttribute("aria-label") &&
          !control.getAttribute("aria-labelledby")
        );
      }
    ).length;

    return unlabeledButtons + unlabeledInputs;
  });

  expect(unlabeledControls).toBe(0);

  await openView(page, "Progress");
  await expect(
    page.getByTestId("history-heatmap").getByRole("button", {
      name: "2026-07-22, 0% complete"
    })
  ).toBeVisible();

  await openView(page, "Timer");
  const timerPanel = page.getByTestId("study-timer-panel");
  const startButton = timerPanel.getByRole("button", { name: /start/i });
  await startButton.focus();
  await expect(startButton).toBeFocused();
  await page.keyboard.press("Enter");
  await page.clock.fastForward("00:00:10");

  const pauseButton = timerPanel.getByRole("button", { name: /pause/i });
  await pauseButton.focus();
  await expect(pauseButton).toBeFocused();
  await page.keyboard.press(" ");

  const resumeButton = timerPanel.getByRole("button", { name: /resume/i });
  await resumeButton.focus();
  await expect(resumeButton).toBeFocused();
  await page.keyboard.press("Enter");

  const finishButton = timerPanel.getByRole("button", { name: /end and record/i });
  await finishButton.focus();
  await expect(finishButton).toBeFocused();
  await page.keyboard.press("Enter");

  await openView(page, "Check-in");
  await expect(page.getByTestId("checkin-study-time-status")).toContainText("Reading 1/60 min");
});
