import { auth } from "@/auth";
import { getSpotifyToken, addToQueue } from "@/lib/spotify/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const uri = body.uri;
  if (!uri) {
    return NextResponse.json({ error: "Missing track URI" }, { status: 400 });
  }

  const token = await getSpotifyToken(session.user.id);
  if (!token) {
    return NextResponse.json({ error: "Spotify not connected" }, { status: 401 });
  }

  try {
    await addToQueue(token, uri);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Queue failed" },
      { status: 500 }
    );
  }
}
