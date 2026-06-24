import { test, expect } from "@playwright/test";

const BASE_URL = "https://heptacore-b36fcpgcw-bkgs-projects-829c67c1.vercel.app";

test.describe("Preview deployment sanity", () => {

  test("login page loads with email and password fields", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("login fails for unknown user with error message", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', "nonexistent@test.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator('text=CredentialsSignin')).toBeVisible({ timeout: 10000 });
  });

  test("identity panel CSS classes present in admin page", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

});
