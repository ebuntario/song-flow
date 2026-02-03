import { auth } from "@/auth";
import { getSpotifyToken, searchTracks } from "@/lib/spotify/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const token = await getSpotifyToken(session.user.id);
  if (!token) {
    return NextResponse.json({ error: "Spotify not connected" }, { status: 401 });
  }

  try {
    const data = await searchTracks(token, query);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 }
    );
  }
}
