import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function assertAccessible(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  await test.info().attach(`${label}-accessibility.json`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });
  expect(results.violations, `${label} has WCAG A/AA violations`).toEqual([]);
}

async function login(page: Page, badgeNumber: string) {
  await page.goto("/login");
  await page.getByLabel("Hospital code").fill("kaiser-la");
  await page.getByLabel("Badge number").fill(badgeNumber);
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("login meets automated WCAG A/AA checks", async ({ page }) => {
  await page.goto("/login");
  await assertAccessible(page, "login");
});

test("worker dashboard meets automated WCAG A/AA checks", async ({ page }) => {
  await login(page, "30001");
  await expect(page.getByRole("heading", { name: "My schedule" })).toBeVisible();
  await assertAccessible(page, "worker-dashboard");
});

test("administrator dashboard meets automated WCAG A/AA checks", async ({ page }) => {
  await login(page, "10001");
  await expect(page.getByRole("heading", { name: "Kaiser Los Angeles Medical Center" })).toBeVisible();
  await assertAccessible(page, "admin-dashboard");
});

test("worker navigation fits a phone viewport without horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "30001");
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});
