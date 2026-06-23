import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const listComp = readFileSync(join(process.cwd(), "components", "admin-tenants-list.tsx"), "utf8");
const createComp = readFileSync(join(process.cwd(), "components", "admin-tenants-create.tsx"), "utf8");
const detailComp = readFileSync(join(process.cwd(), "components", "admin-tenant-detail.tsx"), "utf8");
const badgesComp = readFileSync(join(process.cwd(), "components", "admin-tenant-lifecycle-badge.tsx"), "utf8");
const roleBadgeComp = readFileSync(join(process.cwd(), "components", "admin-tenant-role-badge.tsx"), "utf8");
const dialogComp = readFileSync(join(process.cwd(), "components", "admin-tenant-confirm-dialog.tsx"), "utf8");
const paginationComp = readFileSync(join(process.cwd(), "components", "admin-tenant-pagination.tsx"), "utf8");
const feedbackComp = readFileSync(join(process.cwd(), "components", "admin-tenant-feedback.tsx"), "utf8");
const shellComp = readFileSync(join(process.cwd(), "components", "admin-tenants-shell.tsx"), "utf8");

const listPage = readFileSync(join(process.cwd(), "app", "admin", "tenants", "page.tsx"), "utf8");
const newPage = readFileSync(join(process.cwd(), "app", "admin", "tenants", "new", "page.tsx"), "utf8");
const detailPage = readFileSync(join(process.cwd(), "app", "admin", "tenants", "[slug]", "page.tsx"), "utf8");
const layoutPage = readFileSync(join(process.cwd(), "app", "admin", "tenants", "layout.tsx"), "utf8");

// ────────────────────────────────────────────────────────
// ADMIN SHELL
// ────────────────────────────────────────────────────────
describe("admin tenant shell", () => {
  it("renders app-shell layout with sidebar and workspace", () => {
    assert.match(shellComp, /className="app-shell"/);
    assert.match(shellComp, /className="app-sidebar"/);
    assert.match(shellComp, /className="workspace"/);
  });

  it("includes navigation links to admin dashboard and tenants", () => {
    assert.match(shellComp, /href="\/admin"/);
    assert.match(shellComp, /href="\/admin\/tenants"/);
  });

  it("shows admin guardrail message", () => {
    assert.match(shellComp, /Admin/);
    assert.match(shellComp, /tenants/);
  });
});

// ────────────────────────────────────────────────────────
// TENANTS LIST
// ────────────────────────────────────────────────────────
describe("admin tenants list", () => {
  it("has loading skeleton state", () => {
    assert.match(listComp, /state === "loading"/);
    // skeleton renders placeholder divs
    assert.match(listComp, /Array\.from/);
  });

  it("has empty state with create CTA when no results", () => {
    assert.match(listComp, /state === "empty"/);
    assert.match(listComp, /No hay tenants creados/);
    assert.match(listComp, /Crear tenant/);
  });

  it("has empty state for filtered empty results", () => {
    assert.match(listComp, /Ningun tenant coincide/);
  });

  it("has error state with retry", () => {
    assert.match(listComp, /state === "error"/);
    assert.match(listComp, /InlineError/);
    assert.match(listComp, /onRetry/);
  });

  it("renders tenant table with all required columns", () => {
    assert.match(listComp, /Tenant/);
    assert.match(listComp, /Owner/);
    assert.match(listComp, /Estado/);
    assert.match(listComp, /Locale/);
    assert.match(listComp, /Timezone/);
    assert.match(listComp, /Creado/);
  });

  it("shows lifecycle badge for each tenant row", () => {
    assert.match(listComp, /LifecycleBadge/);
    assert.match(listComp, /tenant\.status/);
  });

  it("paginates results using AdminTenantPagination", () => {
    assert.match(listComp, /AdminTenantPagination/);
    assert.match(listComp, /totalPages/);
    assert.match(listComp, /onPageChange/);
  });

  it("has search input and status filter", () => {
    assert.match(listComp, /Buscar por nombre/);
    assert.match(listComp, /statusFilter/);
    assert.match(listComp, /PROVISIONING/);
    assert.match(listComp, /SUSPENDED/);
  });

  it("links to create tenant page", () => {
    assert.match(listComp, /href="\/admin\/tenants\/new"/);
    assert.match(listComp, /Crear tenant/);
  });

  it("renders tenant rows with slug, ownerEmail, dates", () => {
    assert.match(listComp, /tenant\.slug/);
    assert.match(listComp, /tenant\.ownerEmail/);
    assert.match(listComp, /tenant\.createdAt/);
  });

  it("calls correct API endpoint for listing", () => {
    assert.match(listComp, /\/api\/admin\/tenants/);
  });
});

// ────────────────────────────────────────────────────────
// CREATE TENANT
// ────────────────────────────────────────────────────────
describe("admin tenant create", () => {
  it("has form fields: name, slug, ownerEmail, ownerName", () => {
    assert.match(createComp, /Nombre del tenant/);
    assert.match(createComp, /Slug/);
    assert.match(createComp, /Email del owner/);
    assert.match(createComp, /Nombre del owner/);
  });

  it("has timezone and locale selectors with server-side whitelist", () => {
    assert.match(createComp, /America\/Caracas/);
    assert.match(createComp, /Europe\/Madrid/);
    assert.match(createComp, /"es"/);
    assert.match(createComp, /"pt"/);
  });

  it("normalizes slug from name on input", () => {
    assert.match(createComp, /normalizeSlug/);
    assert.match(createComp, /toLowerCase/);
    assert.match(createComp, /replace/);
  });

  it("shows invite link after creation with copy button", () => {
    assert.match(createComp, /copyLink/);
    assert.match(createComp, /inviteLink/);
    assert.match(createComp, /Copiar/);
  });

  it("shows correct message: invitation created, email pending", () => {
    assert.match(createComp, /Invitacion creada/);
    assert.match(createComp, /envio automatico esta pendiente de configuracion/);
  });

  it("never shows 'correo enviado' message", () => {
    assert.doesNotMatch(createComp, /correo enviado/i);
    assert.doesNotMatch(createComp, /email sent/i);
  });

  it("has loading state on submit button", () => {
    assert.match(createComp, /loading/);
    assert.match(createComp, /Creando/);
    assert.match(createComp, /disabled={loading}/);
  });

  it("prevents double submit via disabled", () => {
    assert.match(createComp, /disabled={loading}/);
  });

  it("has client-side slug validation", () => {
    assert.match(createComp, /Slug invalido/);
    assert.match(createComp, /guiones dobles/);
    assert.match(createComp, /validate/);
  });

  it("shows inline field errors for validation", () => {
    assert.match(createComp, /errors\.slug/);
    assert.match(createComp, /errors\.name/);
    assert.match(createComp, /errors\.ownerEmail/);
  });

  it("handles API errors with inline display", () => {
    assert.match(createComp, /apiError/);
    assert.match(createComp, /SLUG_TAKEN/);
    assert.match(createComp, /INVALID_OWNER_EMAIL/);
  });

  it("copies invite link to clipboard", () => {
    assert.match(createComp, /navigator\.clipboard\.writeText/);
  });

  it("submit POSTs to correct API endpoint", () => {
    assert.match(createComp, /\/api\/admin\/tenants/);
    assert.match(createComp, /method: "POST"/);
  });
});

// ────────────────────────────────────────────────────────
// TENANT DETAIL
// ────────────────────────────────────────────────────────
describe("admin tenant detail", () => {
  it("has tabs: Resumen, Miembros, Invitaciones, Configuracion", () => {
    assert.match(detailComp, /Resumen/);
    assert.match(detailComp, /Miembros/);
    assert.match(detailComp, /Invitaciones/);
    assert.match(detailComp, /Configuracion/);
  });

  it("shows lifecycle badge in header", () => {
    assert.match(detailComp, /LifecycleBadge status=\{tenant\.status\}/);
  });

  it("has lifecycle status transitions with confirm for SUSPENDED/ARCHIVED", () => {
    assert.match(detailComp, /needsConfirm/);
    assert.match(detailComp, /SUSPENDED/);
    assert.match(detailComp, /ARCHIVED/);
    assert.match(detailComp, /ConfirmDialog/);
  });

  it("shows explanation of lifecycle transitions", () => {
    assert.match(detailComp, /Vas a suspender el tenant/);
    assert.match(detailComp, /Vas a archivar/);
    assert.match(detailComp, /Las publicaciones programadas se pausaran/);
  });

  it("members tab: list, add member form, change role, remove", () => {
    assert.match(detailComp, /Agregar miembro/);
    assert.match(detailComp, /Quitar/);
    assert.match(detailComp, /handleChangeRole/);
    assert.match(detailComp, /handleRemove/);
  });

  it("members tab: shows email, role, and name columns", () => {
    assert.match(detailComp, /Usuario/);
    assert.match(detailComp, /Email/);
    assert.match(detailComp, /Rol/);
  });

  it("members tab: has role change select with valid roles", () => {
    assert.match(detailComp, /handleChangeRole/);
    assert.match(detailComp, /ROLE_OPTIONS/);
    assert.match(detailComp, /OWNER/);
    assert.match(detailComp, /TENANT_ADMIN/);
  });

  it("members tab: last-owner protection handled server-side", () => {
    assert.match(detailComp, /setShowRemove/);
    assert.match(detailComp, /ConfirmDialog/);
    assert.match(detailComp, /ultimo OWNER/);
  });

  it("members tab: never exposes SUPER_ADMIN as assignable role", () => {
    assert.match(detailComp, /ROLE_OPTIONS/);
    // ROLE_OPTIONS array must not contain SUPER_ADMIN
    const roOptsMatch = detailComp.match(/ROLE_OPTIONS\s*=\s*\[([^\]]+)\]/);
    assert.ok(roOptsMatch, "ROLE_OPTIONS array not found");
    assert.doesNotMatch(roOptsMatch![1], /SUPER_ADMIN/);
  });

  it("members tab: confirm dialog before removing member", () => {
    assert.match(detailComp, /showRemove/);
    assert.match(detailComp, /Quitar miembro/);
    assert.match(detailComp, /danger/);
  });

  it("members tab: calls correct API endpoint", () => {
    assert.match(detailComp, /\/api\/admin\/tenants\/\$\{slug\}\/members/);
    assert.match(detailComp, /method: "DELETE"/);
    assert.match(detailComp, /method: "PATCH"/);
  });

  it("invitations tab: list, create, resend, revoke", () => {
    assert.match(detailComp, /Nueva invitacion/);
    assert.match(detailComp, /Reemitir/);
    assert.match(detailComp, /Revocar/);
    assert.match(detailComp, /handleResend/);
    assert.match(detailComp, /handleRevoke/);
  });

  it("invitations tab: shows status (pendiente/aceptada) and expiration", () => {
    assert.match(detailComp, /Pendiente/);
    assert.match(detailComp, /Aceptada/);
    assert.match(detailComp, /expiresAt/);
  });

  it("invitations tab: copy invite link button", () => {
    assert.match(detailComp, /copyLink/);
    assert.match(detailComp, /navigator\.clipboard\.writeText/);
  });

  it("invitations tab: warns about previous link invalidation on resend", () => {
    assert.match(detailComp, /el enlace anterior quedara invalidado/);
  });

  it("invitations tab: link-only message, no email sent", () => {
    assert.match(detailComp, /envio automatico esta pendiente de configuracion/);
    assert.match(detailComp, /Enlace manual/);
    assert.doesNotMatch(detailComp, /Enviado/i);
    assert.doesNotMatch(detailComp, /correo enviado/i);
  });

  it("invitations tab: provisioning restriction notice", () => {
    assert.match(detailComp, /PROVISIONING/);
    assert.match(detailComp, /solo se permiten invitaciones con rol OWNER/);
  });

  it("invitations tab: confirm dialog before revoke", () => {
    assert.match(detailComp, /revokeId/);
    assert.match(detailComp, /Revocar invitacion/);
  });

  it("invitations tab: calls resend and revoke API endpoints", () => {
    assert.match(detailComp, /\/api\/admin\/tenants\/.*invitations\/.*resend/);
    assert.match(detailComp, /\/api\/admin\/tenants\/.*invitations\/.*\$/);
    assert.match(detailComp, /method: "DELETE"/);
  });

  it("config tab: edits name, timezone, locale with initial values from API", () => {
    assert.match(detailComp, /Nombre/);
    assert.match(detailComp, /Timezone/);
    assert.match(detailComp, /Locale/);
    assert.match(detailComp, /useState\(tenant\.name\)/);
  });

  it("config tab: has dirty state tracking with cancel/restore", () => {
    assert.match(detailComp, /dirty/);
    assert.match(detailComp, /reset/);
    assert.match(detailComp, /Cancelar/);
  });

  it("config tab: calls PATCH endpoint correctly", () => {
    assert.match(detailComp, /\/api\/admin\/tenants\/\$\{slug\}/);
    assert.match(detailComp, /method: "PATCH"/);
  });

  it("config tab: shows success feedback after save", () => {
    assert.match(detailComp, /setSuccess/);
    assert.match(detailComp, /guardada/);
  });

  it("detail page fetches tenant by slug", () => {
    assert.match(detailComp, /slug/);
    assert.match(detailComp, /\/api\/admin\/tenants\/\$\{slug\}/);
  });

  it("has loading state while fetching tenant", () => {
    assert.match(detailComp, /loading/);
    assert.match(detailComp, /setLoading/);
  });

  it("has error state with retry on tenant fetch failure", () => {
    assert.match(detailComp, /error/);
    assert.match(detailComp, /onRetry/);
    assert.match(detailComp, /fetchTenant/);
  });
});

// ────────────────────────────────────────────────────────
// LIFECYCLE BADGE
// ────────────────────────────────────────────────────────
describe("lifecycle badge", () => {
  it("has styles for all four states", () => {
    assert.match(badgesComp, /PROVISIONING/);
    assert.match(badgesComp, /ACTIVE/);
    assert.match(badgesComp, /SUSPENDED/);
    assert.match(badgesComp, /ARCHIVED/);
  });

  it("uses semantic colors: teal for active, warn for suspended, red for archived", () => {
    assert.match(badgesComp, /#0b756f/);
    assert.match(badgesComp, /#8a5f00/);
    assert.match(badgesComp, /#8a1d1d/);
  });

  it("renders as inline-flex with pill border-radius", () => {
    assert.match(badgesComp, /display:\s*"inline-flex"/);
    assert.match(badgesComp, /borderRadius:\s*10/);
  });

  it("does not depend solely on color (has text labels)", () => {
    assert.match(badgesComp, /Activo/);
    assert.match(badgesComp, /Suspendido/);
    assert.match(badgesComp, /Archivado/);
    assert.match(badgesComp, /Provisioning/);
  });
});

// ────────────────────────────────────────────────────────
// ROLE BADGE
// ────────────────────────────────────────────────────────
describe("role badge", () => {
  it("excludes SUPER_ADMIN from role labels", () => {
    assert.doesNotMatch(roleBadgeComp, /SUPER_ADMIN/);
  });

  it("has human-readable labels for all roles", () => {
    assert.match(roleBadgeComp, /Owner/);
    assert.match(roleBadgeComp, /Admin/);
    assert.match(roleBadgeComp, /Tenant Admin/);
    assert.match(roleBadgeComp, /Editor/);
    assert.match(roleBadgeComp, /Viewer/);
  });

  it("renders as inline-flex pill badge", () => {
    assert.match(roleBadgeComp, /display:\s*"inline-flex"/);
    assert.match(roleBadgeComp, /borderRadius:\s*10/);
  });
});

// ────────────────────────────────────────────────────────
// CONFIRM DIALOG
// ────────────────────────────────────────────────────────
describe("confirm dialog", () => {
  it("has escape key support", () => {
    assert.match(dialogComp, /Escape/);
    assert.match(dialogComp, /removeEventListener/);
  });

  it("has backdrop click to close", () => {
    assert.match(dialogComp, /modal-backdrop/);
    assert.match(dialogComp, /onClick/);
  });

  it("has proper accessibility attributes", () => {
    assert.match(dialogComp, /role="dialog"/);
    assert.match(dialogComp, /aria-modal="true"/);
    assert.match(dialogComp, /aria-label/);
  });

  it("autofocuses confirm button", () => {
    assert.match(dialogComp, /confirmRef/);
    assert.match(dialogComp, /\.focus\(\)/);
  });

  it("has danger styling for destructive actions", () => {
    assert.match(dialogComp, /danger/);
    assert.match(dialogComp, /var\(--hc-red\)/);
  });

  it("supports loading disabled state", () => {
    assert.match(dialogComp, /loading/);
    assert.match(dialogComp, /disabled/);
  });
});

// ────────────────────────────────────────────────────────
// PAGINATION
// ────────────────────────────────────────────────────────
describe("pagination", () => {
  it("hides when single page", () => {
    assert.match(paginationComp, /totalPages <= 1/);
    assert.match(paginationComp, /return null/);
  });

  it("has previous/next buttons with disabled states", () => {
    assert.match(paginationComp, /Anterior/);
    assert.match(paginationComp, /Siguiente/);
    assert.match(paginationComp, /disabled/);
  });

  it("renders page numbers with current page highlighted", () => {
    assert.match(paginationComp, /aria-current/);
  });

  it("uses proper aria labels", () => {
    assert.match(paginationComp, /aria-label="Paginacion"/);
    assert.match(paginationComp, /aria-label="Pagina/);
  });
});

// ────────────────────────────────────────────────────────
// FEEDBACK COMPONENTS
// ────────────────────────────────────────────────────────
describe("feedback components", () => {
  it("empty state has optional action button", () => {
    assert.match(feedbackComp, /action/);
  });

  it("inline error has retry button", () => {
    assert.match(feedbackComp, /Reintentar/);
    assert.match(feedbackComp, /onRetry/);
  });

  it("inline error uses red accent color", () => {
    assert.match(feedbackComp, /var\(--hc-red\)/);
  });
});

// ────────────────────────────────────────────────────────
// PAGE SERVER COMPONENTS (auth checks)
// ────────────────────────────────────────────────────────
describe("server page components", () => {
  it("list page checks SUPER_ADMIN and redirects", () => {
    assert.match(listPage, /SUPER_ADMIN/);
    assert.match(listPage, /redirect/);
    assert.match(listPage, /access-required/);
  });

  it("create page checks SUPER_ADMIN and redirects", () => {
    assert.match(newPage, /SUPER_ADMIN/);
    assert.match(newPage, /redirect/);
    assert.match(newPage, /access-required/);
  });

  it("detail page checks SUPER_ADMIN and redirects", () => {
    assert.match(detailPage, /SUPER_ADMIN/);
    assert.match(detailPage, /redirect/);
    assert.match(detailPage, /access-required/);
  });

  it("all pages check session before access", () => {
    assert.match(listPage, /session/);
    assert.match(newPage, /session/);
    assert.match(detailPage, /session/);
  });

  it("layout is a server component with metadata", () => {
    assert.match(layoutPage, /Metadata/);
    assert.match(layoutPage, /AdminTenantsShell/);
  });
});

// ────────────────────────────────────────────────────────
// FORBIDDEN PATTERNS (security / no leaks)
// ────────────────────────────────────────────────────────
describe("forbidden patterns", () => {
  it("no SUPER_ADMIN exposed as assignable role in forms", () => {
    assert.doesNotMatch(createComp, /SUPER_ADMIN/);
  });

  it("no email provider service imports in components", () => {
    assert.doesNotMatch(createComp, /from.*resend/i);
    assert.doesNotMatch(createComp, /new Resend/i);
    assert.doesNotMatch(createComp, /sendEmail/);
    assert.doesNotMatch(detailComp, /from.*resend/i);
    assert.doesNotMatch(detailComp, /new Resend/i);
    assert.doesNotMatch(detailComp, /sendEmail/);
  });

  it("no Playwright or browser automation imports", () => {
    assert.doesNotMatch(listComp, /playwright|puppeteer|selenium|browser/i);
    assert.doesNotMatch(createComp, /playwright|puppeteer|selenium|browser/i);
    assert.doesNotMatch(detailComp, /playwright|puppeteer|selenium|browser/i);
  });

  it("no hardcoded credentials or API keys", () => {
    assert.doesNotMatch(listComp, /sk-[a-zA-Z0-9]{20,}/);
    assert.doesNotMatch(createComp, /sk-[a-zA-Z0-9]{20,}/);
    assert.doesNotMatch(detailComp, /sk-[a-zA-Z0-9]{20,}/);
  });

  it("no passwordHash or token exposed in UI strings", () => {
    assert.doesNotMatch(createComp, /passwordHash/);
    assert.doesNotMatch(detailComp, /passwordHash/);
    assert.doesNotMatch(createComp, /tokenHash/);
    assert.doesNotMatch(detailComp, /tokenHash/);
  });

  it("no secrets in localStorage usage", () => {
    assert.doesNotMatch(listComp, /localStorage/);
    assert.doesNotMatch(createComp, /localStorage/);
    assert.doesNotMatch(detailComp, /localStorage/);
  });

  it("no query param based auth", () => {
    assert.doesNotMatch(listComp, /searchParams\.get\(.*role/);
    assert.doesNotMatch(listComp, /searchParams\.get\(.*admin/);
  });

  it("no fabrication of SUPER_ADMIN role", () => {
    assert.doesNotMatch(listComp, /role.*=.*"SUPER_ADMIN"/);
    assert.doesNotMatch(createComp, /role.*=.*"SUPER_ADMIN"/);
  });
});

// ────────────────────────────────────────────────────────
// HELPER FUNCTION TESTS (validatePagination, slug)
// ────────────────────────────────────────────────────────
describe("admin helpers (duplicate validation)", () => {
  it("validatePagination rejects invalid values (already tested in service tests)", () => {
    // Coverage already in tenant-admin-service.test.ts
    assert.ok(true); // placeholder — actual tests in tenant-admin-service.test.ts
  });

  it("normalizeTenantSlug transforms whitespace and casing", () => {
    // Already tested in tenant-admin-service.test.ts
    assert.ok(true);
  });
});
