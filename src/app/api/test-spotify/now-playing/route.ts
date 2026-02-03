import { auth } from "@/auth";
import { getSpotifyToken, getCurrentlyPlaying } from "@/lib/spotify/client";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getSpotifyToken(session.user.id);
  if (!token) {
    return NextResponse.json({ error: "Spotify not connected" }, { status: 401 });
  }

  try {
    const data = await getCurrentlyPlaying(token);
    return NextResponse.json(data ?? { item: null, is_playing: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get current track" },
      { status: 500 }
    );
  }
}
