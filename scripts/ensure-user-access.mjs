import crypto from "node:crypto";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROLES = new Set([
  "OWNER",
  "ADMIN",
  "STRATEGIST",
  "EDITOR",
  "ANALYST",
  "APPROVER",
  "VIEWER",
  "SUPER_ADMIN",
  "TENANT_ADMIN",
  "PUBLISHER",
]);

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function maskEmail(email) {
  const normalized = normalizeEmail(email);
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return "***";
  const visible = local.length <= 2 ? local[0] : `${local[0]}${local.at(-1)}`;
  return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

export function shortId(id) {
  const value = String(id || "");
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    args.set(key.slice(2), argv[i + 1]);
    i += 1;
  }
  return {
    email: normalizeEmail(args.get("email")),
    tenantSlug: String(args.get("tenant") || "").trim(),
    role: String(args.get("role") || "").trim(),
  };
}

export function membershipWritePlan(existingRole, requestedRole) {
  if (!existingRole) return "create";
  if (existingRole === requestedRole) return "noop";
  return "update";
}

export async function ensureUserAccess({ pool, email, tenantSlug, role }) {
  if (!email) throw new Error("--email is required");
  if (!tenantSlug) throw new Error("--tenant is required");
  if (!ROLES.has(role)) throw new Error(`--role must be one of: ${Array.from(ROLES).join(", ")}`);

  const userResult = await pool.query('select id, email from "User" where lower(email) = $1 limit 1', [email]);
  const user = userResult.rows[0];
  if (!user) throw new Error(`User not found for ${maskEmail(email)}`);

  const tenantResult = await pool.query('select id, slug, name from "Tenant" where slug = $1 limit 1', [tenantSlug]);
  const tenant = tenantResult.rows[0];
  if (!tenant) throw new Error(`Tenant not found for slug "${tenantSlug}"`);

  const existingResult = await pool.query(
    'select id, role from "Membership" where "tenantId" = $1 and "userId" = $2 limit 1',
    [tenant.id, user.id],
  );
  const existing = existingResult.rows[0];
  const plan = membershipWritePlan(existing?.role, role);

  if (plan === "noop") {
    return { action: "unchanged", user, tenant, membership: existing, role };
  }

  if (plan === "update") {
    const updated = await pool.query('update "Membership" set role = $1::"UserRole" where id = $2 returning id, role', [
      role,
      existing.id,
    ]);
    return { action: "updated", user, tenant, membership: updated.rows[0], role };
  }

  const id = crypto.randomUUID();
  const created = await pool.query(
    'insert into "Membership" (id, "tenantId", "userId", role) values ($1, $2, $3, $4::"UserRole") returning id, role',
    [id, tenant.id, user.id, role],
  );
  return { action: "created", user, tenant, membership: created.rows[0], role };
}

function printResult(result) {
  console.log(`access:${result.action}`);
  console.log(`user=${shortId(result.user.id)} email=${maskEmail(result.user.email)}`);
  console.log(`tenant=${shortId(result.tenant.id)} slug=${result.tenant.slug}`);
  console.log(`membership=${shortId(result.membership.id)} role=${result.membership.role}`);
}

async function main() {
  const { email, tenantSlug, role } = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const result = await ensureUserAccess({ pool, email, tenantSlug, role });
    printResult(result);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(`access:error ${error.message}`);
    process.exitCode = 1;
  });
}
