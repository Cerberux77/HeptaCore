import { NextResponse } from "next/server";
import { auth } from "../../../../../../../lib/auth";
import { getYoutubeConnectionStatus } from "../../../../../../../lib/youtube-oauth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  try {
    const connection = await getYoutubeConnectionStatus({
      tenantSlug: slug,
      userId: session.user.id,
    });
    return NextResponse.json({ ok: true, connection });
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;
    return NextResponse.json({ error: "Could not load YouTube connection status." }, { status });
  }
}
