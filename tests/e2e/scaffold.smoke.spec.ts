import { expect, test } from "@playwright/test";

test("scaffold loads without horizontal overflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "IELTS Prep Dashboard" })).toBeVisible();

  const hasNoHorizontalOverflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth <= clientWidth;
  });

  expect(hasNoHorizontalOverflow).toBeTruthy();
});
