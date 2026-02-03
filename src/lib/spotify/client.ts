import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const API = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export async function getSpotifyToken(userId: string): Promise<string | null> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "spotify")))
    .limit(1);

  if (!account?.access_token) return null;

  // Check if token is expired (with 60s buffer)
  if (account.expires_at && account.expires_at * 1000 < Date.now() + 60000) {
    // Token expired, try to refresh
    if (account.refresh_token) {
      const newToken = await refreshSpotifyToken(userId, account.refresh_token);
      return newToken;
    }
    return null;
  }

  return account.access_token;
}

async function refreshSpotifyToken(userId: string, refreshToken: string): Promise<string | null> {
  const clientId = process.env.AUTH_SPOTIFY_ID;
  const clientSecret = process.env.AUTH_SPOTIFY_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[Spotify] Credentials not configured for token refresh");
    return null;
  }

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.error("[Spotify] Token refresh failed:", response.status);
      return null;
    }

    const data = await response.json();

    // Update token in database
    await db
      .update(accounts)
      .set({
        access_token: data.access_token,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        ...(data.refresh_token && { refresh_token: data.refresh_token }),
      })
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.provider, "spotify")
        )
      );

    console.log("[Spotify] Token refreshed successfully");
    return data.access_token;
  } catch (err) {
    console.error("[Spotify] Error refreshing token:", err);
    return null;
  }
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
  if (!res.ok) {
    const errorBody = await res.text();
    console.error("[Spotify] getCurrentlyPlaying error:", {
      status: res.status,
      statusText: res.statusText,
      body: errorBody,
    });
    throw new Error(`Current playing failed: ${res.status} - ${errorBody}`);
  }
  return res.json();
}
