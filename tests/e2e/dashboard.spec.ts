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
  const metrics = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth
  }));

  expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
}

async function expectElementInsideViewport(page: Page, testId: string) {
  const fitsViewport = await page.getByTestId(testId).evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= window.innerWidth;
  });

  expect(fitsViewport).toBeTruthy();
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

test("viewport has no horizontal body overflow at configured desktop and mobile sizes", async ({
  page
}, testInfo) => {
  await loadDashboard(page);

  const expectedViewport =
    testInfo.project.name === "chromium-mobile"
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 };

  expect(page.viewportSize()).toEqual(expectedViewport);
  await expectNoHorizontalBodyOverflow(page);
});

test("auth panel opens and validates credentials without real CloudBase credentials", async ({
  page
}, testInfo) => {
  await loadDashboard(page);

  expect(["chromium-desktop", "chromium-mobile"]).toContain(testInfo.project.name);

  const panel = page.getByTestId("auth-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Guest")).toBeVisible();
  await expectElementInsideViewport(page, "auth-panel");

  const signInForm = panel.getByRole("form", { name: "Sign in" });
  await signInForm.getByLabel("Account").fill("bad@");
  await signInForm.getByLabel("Password").fill("short");
  await signInForm.getByRole("button", { name: "Sign in" }).click();

  await expect(
    panel.getByText("Use a valid email or a 5-24 character username.")
  ).toBeVisible();
  await expect(
    panel.getByText("Password must be 8-32 characters and include letters and numbers.")
  ).toBeVisible();

  await panel.getByRole("button", { name: "Sign up" }).click();

  const signUpForm = panel.getByRole("form", { name: "Sign up" });
  await signUpForm.getByLabel("Email").fill("bad-email");
  await signUpForm.getByLabel("Username").fill("123456");
  await signUpForm.getByLabel("Password").fill("short1");
  await signUpForm.getByRole("button", { name: "Send verification code" }).click();

  await expect(panel.getByText("Enter a valid email address.")).toBeVisible();
  await expect(
    panel.getByText(
      "Username must be 5-24 characters and may use letters, numbers, underscores, or hyphens."
    )
  ).toBeVisible();
  await expect(
    panel.getByText("Password must be 8-32 characters and include letters and numbers.")
  ).toBeVisible();

  await signUpForm.getByLabel("Email").fill("e2e@example.invalid");
  await signUpForm.getByLabel("Username").fill("weihao_e2e");
  await signUpForm.getByLabel("Password").fill("abc12345");
  await signUpForm.getByRole("button", { name: "Send verification code" }).click();

  const completeSignUpForm = panel.getByRole("form", { name: "Complete sign up" });
  await expect(panel.getByText("e2e@example.invalid")).toBeVisible();
  await completeSignUpForm.getByLabel("Verification code").fill("12");
  await completeSignUpForm.getByRole("button", { name: "Complete sign up" }).click();

  await expect(panel.getByText("Enter the 6-digit verification code.")).toBeVisible();

  await completeSignUpForm.getByLabel("Verification code").fill("123456");
  await completeSignUpForm.getByRole("button", { name: "Complete sign up" }).click();

  await expect(panel.getByText("Signed in as weihao_e2e")).toBeVisible();
  const syncStatus = page.getByTestId("sync-status");
  await expect(syncStatus.getByText("Synced")).toBeVisible();

  await panel.getByRole("button", { name: "Sign out" }).click();

  await expect(panel.getByText("Guest")).toBeVisible();
  await expect(syncStatus).not.toContainText("Synced");
  await expect(syncStatus).toContainText("Local guest");
  await expect(page.getByText("Local mode · cloud-ready schema")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Sign in" })).toBeVisible();
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
