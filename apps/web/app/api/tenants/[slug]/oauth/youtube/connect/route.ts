import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../../lib/auth";
import { startYoutubeOAuth, youtubeOAuthConfig } from "../../../../../../../lib/youtube-oauth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const returnTo = req.nextUrl.searchParams.get("returnTo");

  try {
    const result = await startYoutubeOAuth({
      tenantSlug: slug,
      userId: session.user.id,
      requestOrigin: req.nextUrl.origin,
      requestUrl: req.url,
      requestedReturnTo: returnTo,
      reconnect: false,
    });

    const response = NextResponse.redirect(result.authorizationUrl);
    response.cookies.set({
      name: youtubeOAuthConfig.cookieName,
      value: result.state,
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      expires: new Date(Date.now() + 10 * 60 * 1000),
    });
    return response;
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;
    return NextResponse.json({ error: "YouTube OAuth could not be started." }, { status });
  }
}
