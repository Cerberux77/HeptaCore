# Production Environment Checklist — HeptaCore

> Sprint: S-HC-PROD-02 | Operator: Jean | Track: production-infra

## Required Environment Variables

| Variable | Description | Example | Sensitive |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string with SSL | `postgresql://user:pass@host/db?sslmode=require` | YES |
| `DIRECT_URL` | Direct PostgreSQL connection (non-pooled, for migrations) | `postgresql://user:pass@host/db?sslmode=require` | YES |
| `REDIS_URL` | Redis connection for BullMQ worker queue | `redis://user:pass@host:port` | YES |
| `AUTH_SECRET` | NextAuth JWT signing secret (min 32 chars) | `openssl rand -base64 32` | YES |
| `HEPTACORE_TENANT_SLUG` | Default tenant slug for seeding | `turpial` | NO |
| `HEPTACORE_ADMIN_EMAIL` | Admin user email for seed | `jean@heptacore.dev` | NO |
| `HEPTACORE_ADMIN_PASSWORD` | Admin user password for seed | — | YES |
| `HEPTACORE_ADMIN_ROLE` | Admin user role | `SUPER_ADMIN` | NO |
| `BOT_MODE` | Bot publishing mode | `draft` | NO |
| `BOT_DRY_RUN` | Dry-run gate | `true` | NO |

## Hosted DB Requirements

- PostgreSQL 15+ with SSL enforced
- Connection pooling (PgBouncer or Supavisor) for DATABASE_URL
- Direct (non-pooled) connection for DIRECT_URL (migrations)
- Database must be created before running migrations

## Verification Steps

1. Set all environment variables in hosting platform (Vercel/Railway)
2. Run Prisma migrations: `npx prisma migrate deploy`
3. Verify migrations applied: `npx prisma migrate status`
4. Run admin seed: `node scripts/seed-admin.mjs`
5. Run Turpial seed: `node scripts/seed-turpial.mjs`
6. Run verification: `node scripts/verify-prod-smoke.mjs`
7. Visit `/login` and sign in with admin credentials
8. Confirm dashboard loads with Turpial tenant data

## Hard Stops

- Never commit `.env` or any file containing real credentials
- Never log DATABASE_URL or AUTH_SECRET in output
- Dry-run must remain `true` and BOT_MODE must remain `draft`
- Real RRSS publishing remains blocked by design
