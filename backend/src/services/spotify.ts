import { db } from "../db/client";
import { accounts } from "../db/schema";
import { eq, and } from "drizzle-orm";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Get Spotify access token for a user
 */
export async function getSpotifyToken(userId: string): Promise<string | null> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.provider, "spotify")
      )
    )
    .limit(1);

  if (!account?.access_token) return null;

  // Check if token is expired
  if (account.expires_at && account.expires_at * 1000 < Date.now()) {
    // Token expired, try to refresh
    if (account.refresh_token) {
      const newToken = await refreshSpotifyToken(userId, account.refresh_token);
      return newToken;
    }
    return null;
  }

  return account.access_token;
}

/**
 * Refresh Spotify access token
 */
async function refreshSpotifyToken(userId: string, refreshToken: string): Promise<string | null> {
  const clientId = process.env.AUTH_SPOTIFY_ID;
  const clientSecret = process.env.AUTH_SPOTIFY_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Spotify credentials not configured");
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
      console.error("Failed to refresh Spotify token:", response.status);
      return null;
    }

    const data = await response.json() as SpotifyTokenResponse;

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

    return data.access_token;
  } catch (err) {
    console.error("Error refreshing Spotify token:", err);
    return null;
  }
}

/**
 * Search for a track on Spotify
 */
export async function searchSpotifyTrack(
  accessToken: string,
  query: string
): Promise<SpotifyTrack | null> {
  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Spotify search failed:", response.status);
      return null;
    }

interface SpotifySearchResponse {
  tracks?: {
    items?: SpotifyTrack[];
  };
}

    const data = await response.json() as SpotifySearchResponse;
    return data.tracks?.items?.[0] ?? null;
  } catch (err) {
    console.error("Error searching Spotify:", err);
    return null;
  }
}

/**
 * Add track to Spotify queue
 */
export async function addToSpotifyQueue(
  accessToken: string,
  trackUri: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/player/queue?uri=${encodeURIComponent(trackUri)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.ok;
  } catch (err) {
    console.error("Error adding to Spotify queue:", err);
    return false;
  }
}

// Types
interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
}
