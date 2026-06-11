import type { SocialNetwork } from "@heptacore/core";

export interface DiscoverySource {
  type: "competitor" | "trend" | "audience_insight" | "hashtag" | "location";
  network?: SocialNetwork;
  query: string;
  consent: "granted" | "denied" | "unknown";
}

export interface DiscoveryResult {
  ok: boolean;
  dryRun: boolean;
  source: DiscoverySource;
  results?: DiscoveryItem[];
  error?: string;
  providerNote?: string;
}

export interface DiscoveryItem {
  id: string;
  type: "post" | "profile" | "hashtag" | "trend";
  network: SocialNetwork;
  authorHandle?: string;
  body?: string;
  metrics?: Record<string, number>;
  url?: string;
  scraped: boolean;
}

export type DiscoveryMode = "mock" | "dry-run" | "live";

export class DiscoveryAdapter {
  readonly mode: DiscoveryMode;

  constructor(mode: DiscoveryMode = "mock") {
    this.mode = mode;
  }

  discover(source: DiscoverySource): DiscoveryResult {
    // Gate 1: Live scraping blocked
    if (this.mode === "live") {
      return {
        ok: false,
        dryRun: false,
        source,
        error: "Live scraping blocked. Real scraping requires paid provider credentials and explicit unlock.",
        providerNote: this.providerRequirements(),
      };
    }

    // Gate 2: Consent check
    if (source.consent === "denied") {
      return {
        ok: false,
        dryRun: true,
        source,
        error: `Discovery blocked: consent is "${source.consent}" for ${source.type}:${source.query}`,
      };
    }

    // Gate 3: Mock/dry-run returns simulated data
    const mockResults = this.generateMockResults(source);

    return {
      ok: true,
      dryRun: true,
      source,
      results: mockResults,
      providerNote: this.mode === "mock"
        ? "Mock data. For real discovery, configure a paid provider with tenant consent."
        : this.providerRequirements(),
    };
  }

  discoverForTenant(sources: DiscoverySource[]): DiscoveryResult[] {
    return sources.map((source) => this.discover(source));
  }

  private generateMockResults(source: DiscoverySource): DiscoveryItem[] {
    const prefix = source.query.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const network: SocialNetwork = source.network || "instagram";

    return [
      {
        id: `mock_${prefix}_1`,
        type: "post",
        network,
        authorHandle: `@${prefix}_creator`,
        body: `Mock content for "${source.query}" — HeptaCore Discovery (dry-run)`,
        metrics: { likes: 120, comments: 15, shares: 8 },
        url: `https://${network}.com/p/mock_${prefix}_1`,
        scraped: false,
      },
      {
        id: `mock_${prefix}_2`,
        type: "profile",
        network,
        authorHandle: `@${prefix}_brand`,
        metrics: { followers: 5000, posts: 120 },
        scraped: false,
      },
      {
        id: `mock_${prefix}_3`,
        type: source.type === "hashtag" ? "hashtag" : "trend",
        network,
        body: `#${source.query} trend data (mock)`,
        metrics: { volume: 2500, growth: 0.15 },
        scraped: false,
      },
    ];
  }

  providerRequirements(): string {
    return [
      "Real discovery/scraping requires a paid provider:",
      "- Apify (Instagram Scraper, Facebook Scraper)",
      "- BrightData (Social Media datasets)",
      "- PhantomBuster (Social automation)",
      "",
      "Requirements before enabling:",
      "1. Tenant must grant explicit consent per source type",
      "2. Provider API key must be configured in environment variables",
      "3. Sensitive action approval must be recorded in AuditLog",
      "4. Compliance with platform ToS (Meta, TikTok, etc.) must be verified",
      "5. Hard stop: no scraping without Manuel approval",
    ].join("\n");
  }
}

export class MockDiscoveryAdapter extends DiscoveryAdapter {
  constructor() {
    super("mock");
  }
}
