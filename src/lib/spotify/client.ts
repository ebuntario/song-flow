import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const API = "https://api.spotify.com/v1";

export async function getSpotifyToken(userId: string): Promise<string | null> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "spotify")))
    .limit(1);

  return account?.access_token ?? null;
}

export async function searchTracks(token: string, query: string) {
  const res = await fetch(
    `${API}/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Spotify search failed: ${res.status}`);
  return res.json();
}

export async function addToQueue(token: string, trackUri: string) {
  const res = await fetch(
    `${API}/me/player/queue?uri=${encodeURIComponent(trackUri)}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok && res.status !== 204) throw new Error(`Queue failed: ${res.status}`);
}

export async function skipTrack(token: string) {
  const res = await fetch(`${API}/me/player/next`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Skip failed: ${res.status}`);
}

export async function getCurrentlyPlaying(token: string) {
  const res = await fetch(`${API}/me/player/currently-playing`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Current playing failed: ${res.status}`);
  return res.json();
}
