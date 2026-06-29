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

  it("AdminIdentityPanel uses flow layout CSS classes, not absolute positioning", async () => {
    const mod = await import("../../components/admin-identity-panel");
    const src = mod.AdminIdentityPanel.toString();

    assert.ok(src.includes("identity-panel-root"), "must use CSS class identity-panel-root");
    assert.ok(src.includes("identity-panel-trigger"), "must use CSS class identity-panel-trigger");
    assert.ok(src.includes("identity-panel-content"), "must use CSS class identity-panel-content");
    assert.ok(!src.includes('position: "absolute"'), "must NOT use position absolute on panel");
    assert.ok(!src.includes('position: "fixed"'), "must NOT use position fixed on panel");
  });

  it("AdminIdentityPanel uses grid layout for permission rows", async () => {
    const mod = await import("../../components/admin-identity-panel");
    const src = mod.AdminIdentityPanel.toString();

    assert.ok(src.includes("identity-permission-row"), "must use CSS class for permission rows");
    assert.ok(src.includes("perm-label"), "must use CSS class for permission labels");
    assert.ok(src.includes("identity-permission-badge"), "must use CSS class for permission badges");
  });

  it("globals.css has identity panel containment styles", async () => {
    const fs = await import("node:fs");
    const css = fs.readFileSync("app/globals.css", "utf8");

    assert.ok(css.includes(".identity-panel-root"), "CSS must define identity-panel-root");
    assert.ok(css.includes(".identity-panel-content"), "CSS must define identity-panel-content");
    assert.ok(css.includes("overflow-x: hidden"), "CSS must have overflow-x control");
    assert.ok(css.includes("max-width: 100%"), "CSS must have max-width containment");
    assert.ok(css.includes("min-width: 0"), "CSS must have min-width 0");
    assert.ok(css.includes("grid-template-columns"), "CSS must use grid for permissions");
    assert.ok(css.includes("minmax(0, 1fr)"), "CSS must use minmax for flexible columns");
  });

  it("identity panel CSS does not use fixed widths that overflow sidebar", async () => {
    const fs = await import("node:fs");
    const css = fs.readFileSync("app/globals.css", "utf8");

    const panelContent = css.match(/\.identity-panel-content\s*\{([^}]*)\}/);
    assert.ok(panelContent, "identity-panel-content class must exist");
    const content = panelContent![1];
    assert.ok(!content.includes("width: 360px"), "panel must not have fixed 360px width");
    assert.ok(!content.includes("width: 400px"), "panel must not have wide fixed width");
    assert.ok(!content.includes("left:"), "panel must not use left offset");
    assert.ok(!content.includes("right:"), "panel must not use right offset");
    assert.ok(content.includes("width: 100%"), "panel must use 100 pct width");
  });
});
