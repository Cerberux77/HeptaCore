import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("identity panel mounting", () => {
  it("AdminTenantsShell exports a function component", async () => {
    const mod = await import("../../components/admin-tenants-shell");
    assert.equal(typeof mod.AdminTenantsShell, "function");
  });

  it("AdminConsole exports a function component", async () => {
    const mod = await import("../../components/admin-console");
    assert.equal(typeof mod.AdminConsole, "function");
  });

  it("AdminIdentityPanel exports a function component", async () => {
    const mod = await import("../../components/admin-identity-panel");
    assert.equal(typeof mod.AdminIdentityPanel, "function");
  });

  it("AdminTenantsShell accepts children prop in signature", async () => {
    const mod = await import("../../components/admin-tenants-shell");
    const src = mod.AdminTenantsShell.toString();
    assert.ok(src.includes("children"), "AdminTenantsShell must accept children prop");
  });

  it("AdminConsole accepts data prop in signature", async () => {
    const mod = await import("../../components/admin-console");
    const src = mod.AdminConsole.toString();
    assert.ok(src.includes("data"), "AdminConsole must accept data prop");
  });

  it("AdminTenantsShell references AdminIdentityPanel exactly once", async () => {
    const shellMod = await import("../../components/admin-tenants-shell");
    const src = shellMod.AdminTenantsShell.toString();

    const matches = src.match(/AdminIdentityPanel/g);
    assert.ok(matches, "AdminTenantsShell must reference AdminIdentityPanel");
    assert.equal(matches.length, 1, "AdminTenantsShell must reference AdminIdentityPanel exactly once");
  });

  it("AdminConsole references AdminIdentityPanel exactly once", async () => {
    const consoleMod = await import("../../components/admin-console");
    const src = consoleMod.AdminConsole.toString();

    const matches = src.match(/AdminIdentityPanel/g);
    assert.ok(matches, "AdminConsole must reference AdminIdentityPanel");
    assert.equal(matches.length, 1, "AdminConsole must reference AdminIdentityPanel exactly once");
  });

  it("AdminIdentityPanel signOut uses redirectTo /login", async () => {
    const mod = await import("../../components/admin-identity-panel");
    const src = mod.AdminIdentityPanel.toString();
    assert.ok(src.includes("signOut"), "must call signOut");
    assert.ok(src.includes("/login"), "must redirect to /login");
  });

  it("AdminIdentityPanel badge uses aria-expanded", async () => {
    const mod = await import("../../components/admin-identity-panel");
    const src = mod.AdminIdentityPanel.toString();
    assert.ok(src.includes("aria-expanded"), "must use aria-expanded");
  });

  it("AdminIdentityPanel badge uses aria-controls", async () => {
    const mod = await import("../../components/admin-identity-panel");
    const src = mod.AdminIdentityPanel.toString();
    assert.ok(src.includes("aria-controls"), "must use aria-controls");
  });

  it("AdminIdentityPanel badge shows role label", async () => {
    const mod = await import("../../components/admin-identity-panel");
    const src = mod.AdminIdentityPanel.toString();
    assert.ok(src.includes("SUPER_ADMIN"), "must show SUPER_ADMIN label");
    assert.ok(src.includes("globalRole"), "must reference globalRole");
  });

  it("admin shell layout has Admin global or Administracion branding", async () => {
    const shellMod = await import("../../components/admin-tenants-shell");
    const consoleMod = await import("../../components/admin-console");

    const shellSrc = shellMod.AdminTenantsShell.toString();
    const consoleSrc = consoleMod.AdminConsole.toString();

    assert.ok(shellSrc.includes("Administracion") || shellSrc.includes("Gestion"),
      "AdminTenantsShell must have branding text");
    assert.ok(consoleSrc.includes("Admin global") || consoleSrc.includes("Operacion"),
      "AdminConsole must have branding text");
  });

  it("navigation links are present in shells", async () => {
    const shellMod = await import("../../components/admin-tenants-shell");
    const consoleMod = await import("../../components/admin-console");

    const shellSrc = shellMod.AdminTenantsShell.toString();
    const consoleSrc = consoleMod.AdminConsole.toString();

    assert.ok(shellSrc.includes("/admin/tenants"), "shell must link to /admin/tenants");
    assert.ok(consoleSrc.includes("/admin/tenants"), "console must link to /admin/tenants");
    assert.ok(shellSrc.includes("Consolidado"), "shell must show Consolidado");
    assert.ok(consoleSrc.includes("Consolidado"), "console must show Consolidado");
  });

  it("AdminIdentityPanel loads capabilities via fetch", async () => {
    const mod = await import("../../components/admin-identity-panel");
    const src = mod.AdminIdentityPanel.toString();
    assert.ok(src.includes("capabilities"), "must fetch capabilities endpoint");
  });

  it("AdminIdentityPanel handles Escape key", async () => {
    const mod = await import("../../components/admin-identity-panel");
    const src = mod.AdminIdentityPanel.toString();
    assert.ok(src.includes("Escape"), "must handle Escape key");
  });

  it("AdminIdentityPanel handles Tab key for focus trap", async () => {
    const mod = await import("../../components/admin-identity-panel");
    const src = mod.AdminIdentityPanel.toString();
    assert.ok(src.includes('"Tab"'), "must handle Tab key");
  });

  it("AdminTenantsShell renders identity panel before nav links", async () => {
    const mod = await import("../../components/admin-tenants-shell");
    const src = mod.AdminTenantsShell.toString();
    const identityIdx = src.indexOf("AdminIdentityPanel");
    const navIdx = src.indexOf("app-nav");
    assert.ok(identityIdx >= 0, "must contain AdminIdentityPanel");
    assert.ok(navIdx >= 0, "must contain app-nav");
    assert.ok(identityIdx < navIdx, "AdminIdentityPanel must appear before nav in shell");
  });

  it("AdminConsole renders identity panel before nav links", async () => {
    const mod = await import("../../components/admin-console");
    const src = mod.AdminConsole.toString();
    const identityIdx = src.indexOf("AdminIdentityPanel");
    const navIdx = src.indexOf("app-nav");
    assert.ok(identityIdx >= 0, "must contain AdminIdentityPanel");
    assert.ok(navIdx >= 0, "must contain app-nav");
    assert.ok(identityIdx < navIdx, "AdminIdentityPanel must appear before nav in console");
  });
});
