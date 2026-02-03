import { auth } from "@/auth";
import { getSpotifyToken, skipTrack } from "@/lib/spotify/client";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getSpotifyToken(session.user.id);
  if (!token) {
    return NextResponse.json({ error: "Spotify not connected" }, { status: 401 });
  }

  try {
    await skipTrack(token);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Skip failed" },
      { status: 500 }
    );
  }
}
