import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tenant = {
  slug: "turpial-sound",
  name: "Turpial Sound",
  instagramHandle: "turpialsound",
  facebookPageId: "1129437930248909",
  instagramBusinessAccountId: "17841472923130843"
};

async function main() {
  const record = await prisma.tenant.upsert({
    where: { slug: tenant.slug },
    update: { name: tenant.name },
    create: {
      slug: tenant.slug,
      name: tenant.name,
      plan: "PILOT",
      automationMode: "APPROVAL_REQUIRED"
    }
  });

  await prisma.socialAccount.upsert({
    where: {
      tenantId_network_externalAccountId: {
        tenantId: record.id,
        network: "INSTAGRAM",
        externalAccountId: tenant.instagramBusinessAccountId
      }
    },
    update: {
      handle: tenant.instagramHandle,
      status: "needs_oauth"
    },
    create: {
      tenantId: record.id,
      network: "INSTAGRAM",
      handle: tenant.instagramHandle,
      externalAccountId: tenant.instagramBusinessAccountId,
      status: "needs_oauth",
      scopes: []
    }
  });

  await prisma.socialAccount.upsert({
    where: {
      tenantId_network_externalAccountId: {
        tenantId: record.id,
        network: "FACEBOOK",
        externalAccountId: tenant.facebookPageId
      }
    },
    update: {
      status: "needs_oauth"
    },
    create: {
      tenantId: record.id,
      network: "FACEBOOK",
      externalAccountId: tenant.facebookPageId,
      status: "needs_oauth",
      scopes: []
    }
  });

  await prisma.brandProfile.upsert({
    where: { id: `${record.id}:brand` },
    update: {},
    create: {
      id: `${record.id}:brand`,
      tenantId: record.id,
      brandName: "Turpial Sound",
      industry: "music studio",
      servicesProducts: ["recording", "mixing", "production", "creative space"],
      targetAudience: ["artists", "bands", "producers", "music creators"],
      geography: "Venezuela",
      toneOfVoice: ["professional", "warm", "creative", "community-driven"],
      socialChannels: ["FACEBOOK", "INSTAGRAM"],
      assetAvailability: { currentAssets: "examples/tenants/turpial/content/inbox" },
      approvalContact: { status: "pending" },
      publishingPermissions: { realPublishing: false, reason: "Hard stop active until OAuth, approvals and Meta readiness pass." }
    }
  });

  await prisma.strategyBrief.upsert({
    where: { id: `${record.id}:strategy-brief` },
    update: {},
    create: {
      id: `${record.id}:strategy-brief`,
      tenantId: record.id,
      title: "Turpial Sound initial strategy brief",
      status: "DRAFT",
      businessGoals: ["grow awareness", "show studio capabilities", "drive booking inquiries"],
      channels: ["FACEBOOK", "INSTAGRAM"],
      assetChecklist: ["brand avatar", "studio photos", "reels", "stories", "marketplace assets"]
    }
  });

  for (const [priority, name] of ["Estudio", "Servicios", "Comunidad", "Prueba social"].entries()) {
    await prisma.contentPillar.upsert({
      where: {
        tenantId_name: {
          tenantId: record.id,
          name
        }
      },
      update: { priority },
      create: {
        tenantId: record.id,
        name,
        priority
      }
    });
  }

  console.log(JSON.stringify({ ok: true, tenantSlug: tenant.slug, secretsSeeded: false }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

