import { expect, test } from "@playwright/test";

test("dashboard shell loads without horizontal overflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "IELTS Prep Dashboard" })).toBeVisible();
  await expect(page.getByText("Local mode · cloud-ready schema")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Today completion" })).toBeVisible();

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

test("target editing persists after refresh on desktop and mobile", async ({ page, browserName }, testInfo) => {
  await page.goto("/");

  await page.getByLabel("Total band").fill("7.0");
  await page.getByLabel("Reading band").fill("8.0");
  await page.getByLabel("Reading minutes").fill("90");

  await page.reload();

  await expect(page.getByLabel("Total band")).toHaveValue("7.0");
  await expect(page.getByLabel("Reading band")).toHaveValue("8.0");
  await expect(page.getByLabel("Reading minutes")).toHaveValue("90");

  const hasNoHorizontalOverflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth <= clientWidth;
  });

  expect(hasNoHorizontalOverflow).toBeTruthy();

  const readingMinutesFits = await page.getByLabel("Reading minutes").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= window.innerWidth && box.width >= 72;
  });

  expect(readingMinutesFits).toBeTruthy();
  expect(browserName).toBe("chromium");
  expect(["chromium-desktop", "chromium-mobile"]).toContain(testInfo.project.name);
});
