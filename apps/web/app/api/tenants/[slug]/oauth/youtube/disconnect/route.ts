import { NextResponse } from "next/server";
import { auth } from "../../../../../../../lib/auth";
import { disconnectYoutubeOAuth } from "../../../../../../../lib/youtube-oauth";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  try {
    await disconnectYoutubeOAuth({
      tenantSlug: slug,
      userId: session.user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;
    return NextResponse.json({ error: "Could not disconnect YouTube." }, { status });
  }
}
