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

  await page.getByLabel("Hospital code").fill("wrong-hospital");
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
  await page.getByRole("link", { name: "Audit log" }).click();
  await expect(page).toHaveURL(/\/admin\/audit$/);
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
});
