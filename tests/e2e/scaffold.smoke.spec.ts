import { expect, test } from "@playwright/test";

test("dashboard shell loads without horizontal overflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "IELTS Prep Dashboard" })).toBeVisible();
  await expect(page.getByText("Local mode · cloud-ready schema")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Today completion" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "History Summary" })).toBeVisible();
  await expect(page.getByTestId("history-heatmap").getByRole("button")).toHaveCount(60);

  const hasNoHorizontalOverflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth <= clientWidth;
  });

  expect(hasNoHorizontalOverflow).toBeTruthy();

  const summaryFitsViewport = await page.getByTestId("summary-header").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= window.innerWidth;
  });

  expect(summaryFitsViewport).toBeTruthy();
});

test("history heatmap updates today and contains mobile scrolling inside the strip", async ({
  page
}, testInfo) => {
  await page.clock.install({ time: new Date("2026-07-22T08:00:00.000Z") });
  await page.goto("/");

  const heatmap = page.getByTestId("history-heatmap");
  const heatmapStrip = page.getByTestId("heatmap-strip");

  await expect(heatmap.getByRole("button", { name: "2026-07-22, 0% complete" })).toBeVisible();

  await page.getByTestId("daily-checkin").getByLabel("Words actual").fill("100");

  const todayCell = heatmap.getByRole("button", { name: "2026-07-22, 13% complete" });
  await expect(todayCell).toHaveAttribute("data-level", "1");
  await todayCell.focus();
  await expect(heatmap.getByTestId("heatmap-day-detail")).toContainText(
    "2026-07-22 - 13% complete"
  );

  const pageHasNoHorizontalOverflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth <= clientWidth;
  });

  expect(pageHasNoHorizontalOverflow).toBeTruthy();

  const heatmapFitsViewport = await heatmapStrip.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= window.innerWidth;
  });

  expect(heatmapFitsViewport).toBeTruthy();
  expect(["chromium-desktop", "chromium-mobile"]).toContain(testInfo.project.name);
});

test("target editing persists after refresh on desktop and mobile", async ({ page, browserName }, testInfo) => {
  await page.goto("/");
  const targetDashboard = page.getByTestId("target-dashboard");

  await targetDashboard.getByLabel("Total band").fill("7.0");
  await targetDashboard.getByLabel("Reading band").fill("8.0");
  await targetDashboard.getByLabel("Reading minutes").fill("90");
  await targetDashboard.getByLabel("Corpus minutes").fill("17");
  await targetDashboard.getByLabel("Corpus minutes").blur();

  await page.reload();

  const reloadedTargetDashboard = page.getByTestId("target-dashboard");

  await expect(reloadedTargetDashboard.getByLabel("Total band")).toHaveValue("7.0");
  await expect(reloadedTargetDashboard.getByLabel("Reading band")).toHaveValue("8.0");
  await expect(reloadedTargetDashboard.getByLabel("Reading minutes")).toHaveValue("90");
  await expect(reloadedTargetDashboard.getByLabel("Corpus minutes")).toHaveValue("15");

  const hasNoHorizontalOverflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth <= clientWidth;
  });

  expect(hasNoHorizontalOverflow).toBeTruthy();

  const readingMinutesFits = await reloadedTargetDashboard.getByLabel("Reading minutes").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= window.innerWidth && box.width >= 72;
  });

  expect(readingMinutesFits).toBeTruthy();
  expect(browserName).toBe("chromium");
  expect(["chromium-desktop", "chromium-mobile"]).toContain(testInfo.project.name);
});

test("daily check-in reaches all clear without desktop or mobile overflow", async ({ page }, testInfo) => {
  await page.goto("/");

  const checkIn = page.getByTestId("daily-checkin");
  await checkIn.getByLabel("Words actual").fill("100");
  await checkIn.getByLabel("Speaking topics actual").fill("3");
  await checkIn.getByLabel("Listening tests actual").fill("1");
  await checkIn.getByLabel("Corpus minutes actual").fill("30");

  await expect(checkIn.getByText("Study time targets pending")).toBeVisible();
  await expect(checkIn.getByText("Listening 0/45 min")).toBeVisible();
  await expect(checkIn.getByText("Speaking 0/30 min")).toBeVisible();
  await expect(checkIn.getByText("Reading 0/60 min")).toBeVisible();
  await expect(checkIn.getByText("Writing 0/45 min")).toBeVisible();
  await expect(checkIn.getByText("All Clear")).not.toBeVisible();

  const targetDashboard = page.getByTestId("target-dashboard");
  for (const label of ["Listening minutes", "Speaking minutes", "Reading minutes", "Writing minutes"]) {
    await targetDashboard.getByLabel(label).fill("0");
  }

  await expect(checkIn.getByText("Study time targets pending")).not.toBeVisible();
  await expect(checkIn.getByText("All Clear")).toBeVisible();
  await expect(checkIn.getByLabel("Words complete")).toBeVisible();
  await expect(checkIn.getByLabel("Speaking topics complete")).toBeVisible();
  await expect(checkIn.getByLabel("Listening tests complete")).toBeVisible();
  await expect(checkIn.getByLabel("Corpus minutes complete")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Today completion" })).toHaveAttribute(
    "aria-valuenow",
    "100"
  );

  const hasNoHorizontalOverflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth <= clientWidth;
  });

  expect(hasNoHorizontalOverflow).toBeTruthy();

  const checkInRowsFitViewport = await checkIn.locator("[data-testid^='checkin-row-']").evaluateAll((rows) =>
    rows.every((row) => {
      const box = row.getBoundingClientRect();
      return box.left >= 0 && box.right <= window.innerWidth;
    })
  );

  expect(checkInRowsFitViewport).toBeTruthy();
  expect(["chromium-desktop", "chromium-mobile"]).toContain(testInfo.project.name);
});

test("study timer records reading overtime on desktop and mobile", async ({ page }, testInfo) => {
  await page.clock.install({ time: new Date("2026-07-22T08:00:00.000Z") });
  await page.goto("/");

  const timerPanel = page.getByTestId("study-timer-panel");
  await expect(timerPanel.getByRole("button", { name: "Reading" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(timerPanel.getByText("Planned 60 min")).toBeVisible();

  await timerPanel.getByRole("button", { name: /start/i }).click();
  await page.clock.fastForward("01:02:00");

  await expect(timerPanel.getByText("01:02:00")).toBeVisible();
  await expect(timerPanel.getByText("已超时 2 min")).toBeVisible();

  await timerPanel.getByRole("button", { name: /end and record/i }).click();

  await expect(page.getByText("Reading 0/60 min")).not.toBeVisible();
  await expect(page.getByText("Reading 62/60 min")).not.toBeVisible();
  await expect(page.getByText("Speaking 0/30 min")).toBeVisible();

  const hasNoHorizontalOverflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth <= clientWidth;
  });

  expect(hasNoHorizontalOverflow).toBeTruthy();
  expect(["chromium-desktop", "chromium-mobile"]).toContain(testInfo.project.name);
});

test("manual external time entry records selected section on desktop and mobile", async ({ page }, testInfo) => {
  await page.goto("/");

  const timerPanel = page.getByTestId("study-timer-panel");
  await timerPanel.getByLabel("Manual section").selectOption("writing");
  await timerPanel.getByLabel("Manual minutes").fill("45");
  await timerPanel.getByRole("button", { name: /record external time/i }).click();

  await expect(page.getByText("Writing 0/45 min")).not.toBeVisible();
  await expect(timerPanel.getByText("Manual external time")).toBeVisible();

  const timerPanelFitsViewport = await timerPanel.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= window.innerWidth;
  });

  expect(timerPanelFitsViewport).toBeTruthy();
  expect(["chromium-desktop", "chromium-mobile"]).toContain(testInfo.project.name);
});
