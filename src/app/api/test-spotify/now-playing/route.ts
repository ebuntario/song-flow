import { auth } from "@/auth";
import { getSpotifyToken, getCurrentlyPlaying } from "@/lib/spotify/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Debug: Check raw account state in DB
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "spotify")))
    .limit(1);

  console.log("[Debug] Spotify account state:", {
    hasAccount: !!account,
    hasAccessToken: !!account?.access_token,
    hasRefreshToken: !!account?.refresh_token,
    expiresAt: account?.expires_at,
    expiresAtDate: account?.expires_at ? new Date(account.expires_at * 1000).toISOString() : null,
    now: new Date().toISOString(),
    isExpired: account?.expires_at ? account.expires_at * 1000 < Date.now() : "no expiry set",
  });

  const token = await getSpotifyToken(session.user.id);
  
  console.log("[Debug] Token after getSpotifyToken:", {
    hasToken: !!token,
    tokenLength: token?.length,
  });

  if (!token) {
    return NextResponse.json({ error: "Spotify not connected or token refresh failed" }, { status: 401 });
  }

  try {
    const data = await getCurrentlyPlaying(token);
    return NextResponse.json(data ?? { item: null, is_playing: false });
  } catch (err) {
    console.error("[Debug] getCurrentlyPlaying error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get current track" },
      { status: 500 }
    );
  }
}
