# Worker Hosting Plan — HeptaCore

> Sprint: S-HC-PROD-04 | Operator: Jean | Track: worker

## Why Not Vercel Serverless

HeptaCore's worker uses BullMQ with Redis for persistent job processing. Vercel serverless functions:
- Have a 10s/60s execution timeout (insufficient for multi-minute publishing jobs)
- Cannot maintain persistent Redis connections (each invocation gets a new ephemeral instance)
- Cannot run background processes or long-polling loops

**The worker must be hosted on a persistent runtime, not Vercel serverless.**

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Vercel (Serverless)                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │ Next.js App │  │ API Routes │  │ Middleware (Proxy) │ │
│  └────────────┘  └─────┬──────┘  └────────────────────┘ │
│                        │ enqueue jobs                     │
└────────────────────────┼─────────────────────────────────┘
                         │
                    ┌────▼─────┐
                    │  Redis   │  ◄── Upstash / Railway / Redis Cloud
                    └────┬─────┘
                         │
┌────────────────────────┼─────────────────────────────────┐
│  Persistent Host (Railway / Fly.io / Render / Hetzner)   │
│  ┌─────────────────────▼──────────────────────────────┐  │
│  │  BullMQ Worker                                      │  │
│  │  - heptacore-publish queue                          │  │
│  │  - heptacore-validate queue                         │  │
│  │  - heptacore-test queue                             │  │
│  │  - AuditLog writer                                  │  │
│  │  - Dry-run only (Mock adapters)                     │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Redis Hosting Options

| Provider | Free Tier | Latency | Best For |
|---|---|---|---|
| **Upstash** | 256 MB, 10k commands/day | Low | Serverless-friendly, Vercel integration |
| **Railway Redis** | $0.008/hr (~$6/mo) | Low | All-in-one with worker on Railway |
| **Redis Cloud** | 30 MB free | Medium | Trial/development |
| **Aiven** | $0/month hobby | Medium | EU hosting |

**Recommendation: Upstash** — integrates with Vercel, serverless-friendly, global edge.

## Worker Hosting Options

| Provider | Plan | Persistent | Best For |
|---|---|---|---|
| **Railway** | $5/mo Hobby | Yes | All-in-one: worker + Redis in same project |
| **Fly.io** | Free (3 VMs) | Yes | Global edge, Docker-based |
| **Render** | Free (750h) | Yes, but sleeps after 15min | Low-traffic development |
| **Hetzner + Docker** | ~€4/mo VPS | Yes | Self-managed, cheapest |

**Recommendation: Railway** — simple, includes Redis, no Docker needed.

## Environment Variables

Worker requires these environment variables in the hosting platform:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection with SSL | `postgresql://...` (same as web app) |
| `DIRECT_URL` | Direct PostgreSQL (non-pooled) | `postgresql://...` |
| `REDIS_URL` | Redis connection string | `redis://user:pass@host:port` (or `rediss://` for Upstash) |
| `AUTH_SECRET` | NextAuth JWT secret | Same as web app |
| `HEPTACORE_TENANT_SLUG` | Tenant slug | `turpial` |
| `BOT_MODE` | Publishing mode | `draft` |
| `BOT_DRY_RUN` | Dry-run gate | `true` |

## Running the Worker

```bash
# Start BullMQ worker (consumes jobs from Redis)
npm run queue:dev -- --worker

# Enqueue all DRAFT drafts for publishing
npm run queue:enqueue

# Check queue statistics
npm run queue:stats

# Validate Turpial queue (file-based)
npm run worker:validate
```

## Dry-Run Guarantee

The worker uses `MockMetaAdapter` and `MockFacebookAdapter` from `@heptacore/integrations`. These adapters:

1. **Gate 1 — Approval:** If draft.approvalStatus !== "approved", return error
2. **Gate 2 — Dry-run:** In draft/dry-run mode, generate mock post IDs without real API calls
3. **Gate 3 — Live blocked:** Return error: "Live publishing requires real OAuth tokens"

**No real RRSS API call is possible from this worker without:**
- Explicit code changes (not just env vars)
- Real OAuth tokens (not present in env)

## Deployment Commands

```bash
# Railway
railway up --service worker

# Fly.io
fly deploy --config fly.worker.toml

# Render
# Use render.yaml or Blueprint with start command:
# node apps/worker/src/queue/index.ts --worker
```

## Monitoring

- BullMQ provides built-in job metrics via Redis
- Worker emits AuditLog entries for every job (completed, failed)
- `npm run queue:stats` shows waiting/active/completed/failed counts per queue
- `npm run report` generates queue summary reports

## Cost Estimate

| Resource | Provider | Monthly |
|---|---|---|
| Worker hosting | Railway Hobby | $5.00 |
| Redis | Upstash (256MB) | $0.00 (free tier) |
| **Total** | | **~$5/mo** |

Prices as of 2026. Free tiers may change.
