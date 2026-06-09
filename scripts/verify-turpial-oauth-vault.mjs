import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const datasourceUrl = process.env.DATABASE_URL;

if (!datasourceUrl) {
  console.error("DATABASE_URL is required to verify the OAuth vault. No secret values were printed.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: datasourceUrl });
const prisma = new PrismaClient({ adapter });

try {
  const connection = await prisma.oAuthConnection.findFirst({
    where: {
      provider: "INSTAGRAM",
      tenant: {
        slug: "turpial-sound"
      }
    },
    orderBy: {
      updatedAt: "desc"
    },
    include: {
      tenant: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!connection) {
    console.log(JSON.stringify({
      ok: true,
      found: false,
      tenantSlug: "turpial-sound",
      provider: "instagram"
    }, null, 2));
    process.exit(0);
  }

  console.log(JSON.stringify({
    ok: true,
    found: true,
    tenantSlug: connection.tenant.slug,
    provider: "instagram",
    providerUserId: connection.providerUserId,
    status: connection.status,
    tokenRefPresent: Boolean(connection.tokenRef),
    expiresAt: connection.expiresAt,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
