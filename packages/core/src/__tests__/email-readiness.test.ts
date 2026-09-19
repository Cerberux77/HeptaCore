import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateEmailReadiness, parseEmailOrigin, parseEmailSender } from "../email-readiness";

describe("email sender classification", () => {
  it("allows the Resend provider test sender only as development identity", () => {
    const sender = parseEmailSender("HeptaCore <onboarding@resend.dev>");
    assert.equal(sender.address, "onboarding@resend.dev");
    assert.equal(sender.kind, "provider_test");
  });

  it("rejects a shared Vercel domain as an email sender identity", () => {
    const sender = parseEmailSender("HeptaCore <noreply@heptacore.vercel.app>");
    assert.equal(sender.kind, "shared_platform");
  });

  it("recognizes an owned custom sender domain", () => {
    const sender = parseEmailSender("HeptaCore <hello@mail.heptacore.com>");
    assert.equal(sender.kind, "custom");
    assert.equal(sender.domain, "mail.heptacore.com");
  });
});

describe("email web origin normalization", () => {
  it("normalizes a Vercel hostname to HTTPS", () => {
    const origin = parseEmailOrigin(null, "heptacore-preview.vercel.app");
    assert.equal(origin.origin, "https://heptacore-preview.vercel.app");
    assert.equal(origin.kind, "vercel_default");
    assert.equal(origin.secure, true);
  });

  it("allows localhost only as a development origin", () => {
    const origin = parseEmailOrigin("http://localhost:3000", null);
    assert.equal(origin.kind, "localhost");
  });

  it("rejects insecure non-local origins", () => {
    const origin = parseEmailOrigin("http://heptacore.example", null);
    assert.equal(origin.kind, "invalid");
  });
});

describe("transactional email readiness", () => {
  it("is development-ready with explicit Resend test sender and Vercel web origin", () => {
    const report = evaluateEmailReadiness({
      provider: "resend",
      apiKeyConfigured: true,
      webhookSecretConfigured: true,
      from: "HeptaCore <onboarding@resend.dev>",
      vercelUrl: "heptacore-preview.vercel.app",
    });
    assert.equal(report.developmentReady, true);
    assert.equal(report.productionReady, false);
    assert.ok(report.productionBlockers.includes("PROVIDER_TEST_SENDER_NOT_ALLOWED_IN_PRODUCTION"));
    assert.ok(report.productionBlockers.includes("OFFICIAL_WEB_DOMAIN_DEFERRED"));
  });

  it("fails development readiness when a vercel.app address is used as sender", () => {
    const report = evaluateEmailReadiness({
      provider: "resend",
      apiKeyConfigured: true,
      webhookSecretConfigured: true,
      from: "HeptaCore <noreply@heptacore.vercel.app>",
      vercelUrl: "heptacore.vercel.app",
    });
    assert.equal(report.developmentReady, false);
    assert.ok(report.developmentBlockers.includes("VERCEL_APP_CANNOT_BE_EMAIL_SENDER"));
  });

  it("requires verified Resend domain state before a custom sender is development-ready", () => {
    const report = evaluateEmailReadiness({
      provider: "resend",
      apiKeyConfigured: true,
      webhookSecretConfigured: true,
      from: "HeptaCore <hello@mail.heptacore.com>",
      appUrl: "https://app.heptacore.com",
      brandDomain: "heptacore.com",
      resendDomain: {
        found: true,
        status: "pending",
        sending: "enabled",
        spfVerified: false,
        dkimVerified: false,
        dmarcPresent: false,
      },
    });
    assert.equal(report.developmentReady, false);
    assert.ok(report.developmentBlockers.includes("RESEND_DOMAIN_NOT_VERIFIED"));
  });

  it("is production-ready only with owned branded domain, verified DNS and official HTTPS origin", () => {
    const report = evaluateEmailReadiness({
      provider: "resend",
      apiKeyConfigured: true,
      webhookSecretConfigured: true,
      from: "HeptaCore <hello@mail.heptacore.com>",
      replyTo: "support@heptacore.com",
      appUrl: "https://app.heptacore.com",
      brandDomain: "heptacore.com",
      resendDomain: {
        found: true,
        status: "verified",
        sending: "enabled",
        spfVerified: true,
        dkimVerified: true,
        dmarcPresent: true,
      },
    });
    assert.equal(report.developmentReady, true);
    assert.equal(report.productionReady, true);
    assert.deepEqual(report.productionBlockers, []);
    assert.equal(report.brandAligned, true);
  });

  it("does not expose or require secret values, only configuration booleans", () => {
    const report = evaluateEmailReadiness({
      provider: "disabled",
      apiKeyConfigured: false,
      webhookSecretConfigured: false,
      from: null,
      appUrl: null,
    });
    const serialized = JSON.stringify(report);
    assert.doesNotMatch(serialized, /RESEND_API_KEY=/);
    assert.equal(report.productionReady, false);
  });
});
