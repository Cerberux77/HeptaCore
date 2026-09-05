import { resolveTxt } from "node:dns/promises";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { evaluateEmailReadiness, parseEmailSender, type ResendDomainReadiness } from "@heptacore/core";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { resolveSuperAdminAccess } from "../../../../lib/tenant-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeDomain(value?: string | null) {
  return value?.trim().toLowerCase().replace(/^\.+|\.+$/g, "") || null;
}

async function hasDmarcRecord(domain: string, brandDomain?: string | null): Promise<boolean> {
  const candidates = [...new Set([normalizeDomain(domain), normalizeDomain(brandDomain)].filter(Boolean) as string[])];
  for (const candidate of candidates) {
    try {
      const records = await resolveTxt(`_dmarc.${candidate}`);
      if (records.some((chunks) => chunks.join("").trim().toUpperCase().startsWith("V=DMARC1;"))) return true;
    } catch {
      // A missing/unresolvable record is a readiness signal, not an endpoint failure.
    }
  }
  return false;
}

async function probeResendDomain(apiKey: string, senderDomain: string, brandDomain?: string | null): Promise<{
  readiness: ResendDomainReadiness;
  probe: "ok" | "not_found" | "failed";
}> {
  const empty: ResendDomainReadiness = {
    found: false,
    status: null,
    sending: null,
    spfVerified: false,
    dkimVerified: false,
    dmarcPresent: false,
  };

  try {
    const resend = new Resend(apiKey);
    const listed = await resend.domains.list();
    if (listed.error) return { readiness: empty, probe: "failed" };

    const domains = ((listed.data as any)?.data || []) as Array<{
      id?: string;
      name?: string;
      status?: string;
      capabilities?: { sending?: string };
    }>;
    const target = domains.find((domain) => normalizeDomain(domain.name) === normalizeDomain(senderDomain));
    if (!target?.id) return { readiness: empty, probe: "not_found" };

    const details = await resend.domains.get(target.id);
    if (details.error || !details.data) return { readiness: empty, probe: "failed" };

    const domain = details.data as any;
    const records = Array.isArray(domain.records) ? domain.records : [];
    const spf = records.filter((record: any) => String(record.record || "").toUpperCase() === "SPF");
    const dkim = records.filter((record: any) => String(record.record || "").toUpperCase() === "DKIM");
    const dmarcPresent = await hasDmarcRecord(senderDomain, brandDomain);

    return {
      readiness: {
        found: true,
        status: typeof domain.status === "string" ? domain.status : target.status || null,
        sending: typeof domain.capabilities?.sending === "string"
          ? domain.capabilities.sending
          : target.capabilities?.sending || null,
        spfVerified: spf.length > 0 && spf.every((record: any) => record.status === "verified"),
        dkimVerified: dkim.length > 0 && dkim.every((record: any) => record.status === "verified"),
        dmarcPresent,
      },
      probe: "ok",
    };
  } catch {
    return { readiness: empty, probe: "failed" };
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } }, { status: 401 });
    }
    await resolveSuperAdminAccess(session.user.id, prisma as any);

    const provider = process.env.EMAIL_PROVIDER || "disabled";
    const apiKeyConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
    const webhookSecretConfigured = Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim());
    const from = process.env.EMAIL_FROM || null;
    const replyTo = process.env.EMAIL_REPLY_TO || null;
    const appUrl = process.env.HEPTACORE_APP_URL || null;
    const vercelUrl = process.env.VERCEL_URL || null;
    const brandDomain = process.env.HEPTACORE_BRAND_DOMAIN || null;
    const sender = parseEmailSender(from);

    let resendDomain: ResendDomainReadiness | null = null;
    let providerProbe: "skipped" | "ok" | "not_found" | "failed" = "skipped";
    if (provider.toLowerCase() === "resend" && apiKeyConfigured && sender.kind === "custom" && sender.domain) {
      const result = await probeResendDomain(process.env.RESEND_API_KEY!, sender.domain, brandDomain);
      resendDomain = result.readiness;
      providerProbe = result.probe;
    }

    const readiness = evaluateEmailReadiness({
      provider,
      apiKeyConfigured,
      webhookSecretConfigured,
      from,
      replyTo,
      appUrl,
      vercelUrl,
      brandDomain,
      resendDomain,
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...readiness,
        providerProbe,
        webhookPath: "/api/webhooks/resend",
        secretValuesExposed: false,
      },
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    if (error?.code === "UNAUTHORIZED" || error?.code === "FORBIDDEN") {
      return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status: error.status ?? 403 });
    }
    return NextResponse.json({ ok: false, error: { code: "EMAIL_READINESS_FAILED", message: "No se pudo evaluar la configuracion de correo" } }, { status: 500 });
  }
}
