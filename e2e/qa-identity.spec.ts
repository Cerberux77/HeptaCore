import { test, expect } from "@playwright/test";

const TENANT = "qa-e2e-active";

test.describe("QA Identity & Session", () => {

  test("1 - SUPER_ADMIN logs in, sees badge + role + logout in /admin", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[autocomplete="username"]', "qa-superadmin@heptacore.test");
    await page.fill('input[autocomplete="current-password"]', process.env.HEPTACORE_QA_E2E_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    await expect(page.locator("text=SUPER_ADMIN").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".identity-panel-trigger")).toBeVisible();
    await page.locator(".identity-panel-trigger").click();
    await expect(page.locator(".identity-panel-content")).toBeVisible();
    await expect(page.locator(".identity-panel-content")).toContainText("Cerrar sesion");
    await expect(page.locator(".identity-panel-content")).toContainText("Permisos efectivos");

    await page.locator(".identity-panel-content button", { hasText: "Cerrar sesion" }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("2 - OWNER enters /tenant/qa-e2e-active and sees Propietario role", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[autocomplete="username"]', "qa-owner@heptacore.test");
    await page.fill('input[autocomplete="current-password"]', process.env.HEPTACORE_QA_E2E_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`/tenant/${TENANT}`), { timeout: 15000 });

    await expect(page.locator(".identity-panel-trigger")).toBeVisible({ timeout: 10000 });
    await page.locator(".identity-panel-trigger").click();
    await expect(page.locator(".identity-panel-content")).toBeVisible();
    await expect(page.locator(".identity-panel-content")).toContainText("Propietario");
    await expect(page.locator(".identity-panel-content")).toContainText("Cerrar sesion");

    await page.locator(".identity-panel-content button", { hasText: "Cerrar sesion" }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("3 - ADMIN enters, sees Administrador role on tenant", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[autocomplete="username"]', "qa-admin@heptacore.test");
    await page.fill('input[autocomplete="current-password"]', process.env.HEPTACORE_QA_E2E_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`/tenant/${TENANT}`), { timeout: 15000 });

    await expect(page.locator(".identity-panel-trigger")).toBeVisible({ timeout: 10000 });
    await page.locator(".identity-panel-trigger").click();
    await expect(page.locator(".identity-panel-content")).toBeVisible();
    await expect(page.locator(".identity-panel-content")).toContainText("Administrador");
    await expect(page.locator(".identity-panel-content")).toContainText("Cerrar sesion");
    await expect(page.locator(".identity-panel-content")).toContainText("SI");
  });

  test("4 - VIEWER enters, can read but has limited permissions", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[autocomplete="username"]', "qa-viewer@heptacore.test");
    await page.fill('input[autocomplete="current-password"]', process.env.HEPTACORE_QA_E2E_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`/tenant/${TENANT}`), { timeout: 15000 });

    await expect(page.locator(".identity-panel-trigger")).toBeVisible({ timeout: 10000 });
    await page.locator(".identity-panel-trigger").click();
    await expect(page.locator(".identity-panel-content")).toBeVisible();
    await expect(page.locator(".identity-panel-content")).toContainText("Consulta");
    await expect(page.locator(".identity-panel-content")).toContainText("Cerrar sesion");

    const siBadges = page.locator(".identity-permission-badge", { hasText: "SI" });
    const count = await siBadges.count();
    expect(count).toBeLessThanOrEqual(4);
  });

  test("5 - qa-legacy logs in with inherited identifier, can see warning and sign out", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[autocomplete="username"]', "qa-legacy");
    await page.fill('input[autocomplete="current-password"]', process.env.HEPTACORE_QA_E2E_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`/tenant/${TENANT}`), { timeout: 15000 });

    await expect(page.locator(".identity-panel-trigger")).toBeVisible({ timeout: 10000 });
    await page.locator(".identity-panel-trigger").click();
    await expect(page.locator(".identity-panel-content")).toBeVisible();

    const content = page.locator(".identity-panel-content");
    await expect(content).toContainText("Cuenta con identificador heredado");
    await expect(content).toContainText("Cerrar sesion");

    await content.locator("button", { hasText: "Cerrar sesion" }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

});
