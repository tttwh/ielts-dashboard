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
