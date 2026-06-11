# Scraper Compliance Matrix — HeptaCore

> Sprint: S-HC-PROD-11 | Operator: Jean | Track: discovery-compliance

## Hard Stops

1. **No real scraping is enabled by default** — All discovery adapters start in `mock` mode
2. **No scraping without tenant consent** — `consent: "denied"` blocks all discovery for that source
3. **No scraping without Manuel approval** — `mode: "live"` is explicitly blocked
4. **No real scraping without paid provider credentials** — Mock adapters return simulated data only
5. **All scraping is audited** — Every discovery attempt generates an AuditLog entry

## Discovery Modes

| Mode | Scraping | Data Source | Audit Required |
|---|---|---|---|
| `mock` | No | Generated mock data | Yes (discovery_executed) |
| `dry-run` | No | Generated mock data | Yes (discovery_executed) |
| `live` | BLOCKED | — | Yes (discovery_live_blocked) |

## Allowed Sources (with consent)

| Source Type | Description | Consent Required | Provider |
|---|---|---|---|
| `competitor` | Competitor profile/public post analysis | Yes | Apify / BrightData |
| `trend` | Trending topics, hashtags, content formats | Yes | Apify / PhantomBuster |
| `audience_insight` | Audience demographics, interests, behavior | Yes | Meta Insights API |
| `hashtag` | Hashtag volume, related tags, top posts | Yes | Apify / Hashtagify |
| `location` | Geo-tagged content, local trends | Yes | Apify / BrightData |

## Forbidden Sources

| Source | Reason |
|---|---|
| Private profiles/DMs | Privacy violation, platform ToS |
| Personal contact info | GDPR/Privacy laws |
| Paywalled content | Copyright, ToS violation |
| Minor accounts (<18) | COPPA/GDPR, ethical hard stop |
| Competitor ad library (unauthorized) | Meta ToS restriction |
| Real-time location tracking | Privacy, legal liability |

## Tenant Consent Matrix

Each tenant must explicitly grant consent per source type. Default: all denied.

```json
{
  "tenantId": "turpial-sound",
  "consent": {
    "competitor": "granted",
    "trend": "granted",
    "audience_insight": "denied",
    "hashtag": "granted",
    "location": "denied"
  }
}
```

## Discovery Adapter Usage

```typescript
import { DiscoveryAdapter } from "@heptacore/integrations";

const adapter = new DiscoveryAdapter("mock"); // or "dry-run"

const result = adapter.discover({
  type: "competitor",
  network: "instagram",
  query: "estudios_grabacion_caracas",
  consent: "granted",
});

// result.ok === true (mock data returned)
// result.dryRun === true
// result.results => [3 mock items]
```

## Sensitive Action Gate

All discovery operations are gated:
1. **Consent gate:** `consent` must be `"granted"` (tenant-level)
2. **Mode gate:** `mode` must not be `"live"` (system-level)
3. **Approval gate:** Real scraping requires Manuel's explicit approval recorded in AuditLog
4. **Provider gate:** Real scraping requires paid provider API keys in env vars

## Audit Trail

| Action | When | Metadata |
|---|---|---|
| `discovery_executed` | Any discover() call | source, itemCount, mode, dryRun |
| `discovery_live_blocked` | Live mode attempted | reason, providerNote |
| `discovery_consent_blocked` | Consent denied | source type, query |

## Strategy Context Integration

Discovery results can feed into strategy generation without violating hard stops:

- Mock data provides realistic structure for testing
- Strategy agents consume `DiscoveryItem[]` as context
- Results include metrics (mock) that feed into content planning
- Output is tagged `scraped: false` to mark mock vs real data

## Provider Requirements

To enable real discovery (requires Manuel approval):
1. Choose a provider: Apify, BrightData, or PhantomBuster
2. Configure `DISCOVERY_PROVIDER_API_KEY` in environment
3. Set `DISCOVERY_MODE=live` (blocked by code gate)
4. Obtain tenant consent per source type
5. Record Manuel's approval in AuditLog as `discovery_unlocked`
