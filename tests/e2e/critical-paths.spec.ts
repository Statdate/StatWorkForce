import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, badgeNumber: string) {
  await page.goto("/login");
  await page.getByLabel("Hospital code").fill("kaiser-la");
  await page.getByLabel("Badge number").fill(badgeNumber);
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("anonymous users are redirected and invalid hospital login is rejected", async ({ page }) => {
  await page.goto("/worker");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Hospital code").fill(`wrong-hospital-${Date.now()}`);
  await page.getByLabel("Badge number").fill("30001");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid badge number or password.")).toBeVisible();
});

test("worker can sign in, navigate protected pages, and sign out", async ({ page }) => {
  await login(page, "30001");
  await expect(page).toHaveURL(/\/worker$/);
  await expect(page.getByRole("heading", { name: "My schedule" })).toBeVisible();
  await page.getByRole("link", { name: "My credentials" }).click();
  await expect(page).toHaveURL(/\/worker\/credentials$/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("manager lands in a scoped unit and can navigate manager functions", async ({ page }) => {
  await login(page, "20001");
  await expect(page).toHaveURL(/\/manager\/[^/]+$/);
  await expect(page.getByText("Manager", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Credentials" }).click();
  await expect(page).toHaveURL(/\/manager\/[^/]+\/credentials$/);
  await expect(page.getByRole("link", { name: "Time off" })).toBeVisible();
});

test("administrator can navigate hospital controls", async ({ page }) => {
  await login(page, "10001");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Kaiser Los Angeles Medical Center" })).toBeVisible();
  await page.getByRole("link", { name: "Operational health" }).click();
  await expect(page.getByRole("heading", { name: "Operational health" })).toBeVisible();
  await page.getByRole("link", { name: "Audit log" }).click();
  await expect(page).toHaveURL(/\/admin\/audit$/);
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export hospital data" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^statworkforce-hospital-export-\d{4}-\d{2}-\d{2}\.json$/);
});

test("administrator can resolve an open call-in and see its audit event", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "State-changing workflow runs once against the shared CI database");
  await login(page, "10001");
  const matchingRows = page.getByRole("row").filter({ hasText: "Family emergency" });
  const initialCount = await matchingRows.count();
  expect(initialCount).toBeGreaterThan(0);
  const callInRow = matchingRows.first();
  await expect(callInRow).toBeVisible();
  await callInRow.getByLabel("Resolution note (optional)").fill("Covered by float pool");
  await callInRow.getByRole("button", { name: "Mark covered" }).click();
  await expect(matchingRows).toHaveCount(initialCount - 1);
  await page.getByRole("link", { name: "Audit log" }).click();
  await expect(page.getByText("CALL_IN_RESOLVED").first()).toBeVisible();
});
