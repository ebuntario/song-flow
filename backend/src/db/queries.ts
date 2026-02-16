import { db } from "./client";
import {
  sessions,
  users,
  liveSessions,
  queueItems,
  songRequests,
  giftEvents,
  tiktokRawEvents,
} from "./schema";
import { eq, and, gt, gte, desc, sql, count, countDistinct } from "drizzle-orm";
import type {
  User,
  LiveSession,
  QueueItem,
  SongRequest,
  GiftEvent,
} from "./schema";

/**
 * Validate session token and return user
 */
export async function getUserFromSessionToken(sessionToken: string): Promise<User | null> {
  const result = await db
    .select({
      user: users,
      session: sessions,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.sessionToken, sessionToken),
        gt(sessions.expires, new Date())
      )
    )
    .limit(1);

  return result[0]?.user ?? null;
}

/**
 * Get user's TikTok username from their profile
 */
export async function getUserTiktokUsername(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ tiktokUsername: users.tiktokUsername })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.tiktokUsername ?? null;
}

/**
 * Get active session for a user
 */
export async function getActiveSessionForUser(userId: string): Promise<LiveSession | null> {
  const [session] = await db
    .select()
    .from(liveSessions)
    .where(
      and(
        eq(liveSessions.userId, userId),
        eq(liveSessions.status, "active")
      )
    )
    .limit(1);

  return session ?? null;
}

/**
 * Get all active live sessions (for recovery)
 */
export async function getAllActiveSessions(): Promise<LiveSession[]> {
  return db
    .select()
    .from(liveSessions)
    .where(eq(liveSessions.status, "active"));
}

/**
 * Create a new live session
 */
export async function createLiveSession(
  userId: string,
  tiktokUsername: string
): Promise<LiveSession> {
  const [session] = await db
    .insert(liveSessions)
    .values({
      userId,
      tiktokUsername,
      status: "active",
      startedAt: new Date(),
    })
    .returning();

  if (!session) throw new Error("Failed to create session");
  return session;
}

/**
 * End a live session
 */
export async function endLiveSession(sessionId: string): Promise<void> {
  await db
    .update(liveSessions)
    .set({
      status: "ended",
      endedAt: new Date(),
    })
    .where(eq(liveSessions.id, sessionId));
}

/**
 * Get queue items for a session
 */
export async function getQueueForSession(sessionId: string): Promise<QueueItem[]> {
  return db
    .select()
    .from(queueItems)
    .where(
      and(
        eq(queueItems.liveSessionId, sessionId),
        eq(queueItems.status, "queued")
      )
    )
    .orderBy(queueItems.position);
}

/**
 * Add item to queue
 */
export async function addQueueItem(
  sessionId: string,
  item: {
    viewerUsername: string | null;
    spotifyTrackId: string;
    trackTitle: string;
    trackArtist: string;
  }
): Promise<QueueItem> {
  // Get next position
  const existing = await db
    .select()
    .from(queueItems)
    .where(eq(queueItems.liveSessionId, sessionId));

  const position = existing.length;

  const [queueItem] = await db
    .insert(queueItems)
    .values({
      liveSessionId: sessionId,
      viewerUsername: item.viewerUsername,
      spotifyTrackId: item.spotifyTrackId,
      trackTitle: item.trackTitle,
      trackArtist: item.trackArtist,
      status: "queued",
      position,
      requestedAt: new Date(),
    })
    .returning();

  if (!queueItem) throw new Error("Failed to add queue item");
  return queueItem;
}

/**
 * Remove/skip item from queue
 */
export async function skipQueueItem(itemId: string): Promise<void> {
  await db
    .update(queueItems)
    .set({ status: "skipped" })
    .where(eq(queueItems.id, itemId));
}

// ============ Song Request Logging Queries ============

/**
 * Dedup check: find a recent request with same session + viewer + query
 * within the given window (default 5s). Returns the row if exists.
 */
export async function findRecentDuplicate(
  sessionId: string,
  viewerUsername: string,
  parsedQuery: string,
  windowMs = 5000
): Promise<SongRequest | null> {
  const cutoff = new Date(Date.now() - windowMs);
  const [existing] = await db
    .select()
    .from(songRequests)
    .where(
      and(
        eq(songRequests.liveSessionId, sessionId),
        eq(songRequests.viewerUsername, viewerUsername),
        eq(songRequests.parsedQuery, parsedQuery),
        gte(songRequests.requestedAt, cutoff)
      )
    )
    .limit(1);

  return existing ?? null;
}

/**
 * Insert a new song request row with initial pending status.
 */
export async function logSongRequest(
  sessionId: string,
  viewerUsername: string,
  rawMessage: string,
  parsedQuery: string
): Promise<SongRequest> {
  const [request] = await db
    .insert(songRequests)
    .values({
      liveSessionId: sessionId,
      viewerUsername,
      rawMessage,
      parsedQuery,
      searchStatus: "pending",
      playStatus: "pending",
      requestedAt: new Date(),
    })
    .returning();

  if (!request) throw new Error("Failed to log song request");
  return request;
}

/**
 * Update a request after Spotify search completes.
 * Discriminated union: matched result sets track columns, failed result sets status only.
 */
export type SearchResult =
  | {
      status: "matched";
      track: {
        id: string;
        name: string;
        artist: string;
        albumName: string;
        albumImageUrl: string | null;
        durationMs: number;
        uri: string;
      };
    }
  | { status: "not_found" | "error" | "rate_limited" };

export async function updateRequestAfterSearch(
  requestId: string,
  result: SearchResult
): Promise<void> {
  if (result.status === "matched") {
    await db
      .update(songRequests)
      .set({
        spotifyTrackId: result.track.id,
        trackName: result.track.name,
        trackArtist: result.track.artist,
        albumName: result.track.albumName,
        albumImageUrl: result.track.albumImageUrl,
        durationMs: result.track.durationMs,
        spotifyUri: result.track.uri,
        searchStatus: "matched",
        matchedAt: new Date(),
      })
      .where(eq(songRequests.id, requestId));
  } else {
    await db
      .update(songRequests)
      .set({ searchStatus: result.status })
      .where(eq(songRequests.id, requestId));
  }
}

/**
 * Update play status (confirmed or not_played).
 */
export async function updatePlayStatus(
  requestId: string,
  status: "confirmed" | "not_played"
): Promise<void> {
  await db
    .update(songRequests)
    .set({
      playStatus: status,
      ...(status === "confirmed" ? { confirmedAt: new Date() } : {}),
    })
    .where(eq(songRequests.id, requestId));
}

/**
 * Get all pending requests that were matched (for poller to check against
 * recently-played).
 */
export async function getPendingRequests(sessionId: string): Promise<SongRequest[]> {
  return db
    .select()
    .from(songRequests)
    .where(
      and(
        eq(songRequests.liveSessionId, sessionId),
        eq(songRequests.playStatus, "pending"),
        eq(songRequests.searchStatus, "matched")
      )
    );
}

/**
 * Get requests for a session, paginated by cursor (requestedAt desc).
 */
export async function getRequestsForSession(
  sessionId: string,
  beforeDate?: Date,
  limit = 50
): Promise<SongRequest[]> {
  const conditions = [eq(songRequests.liveSessionId, sessionId)];
  if (beforeDate) {
    // Use < for cursor pagination (strictly before)
    conditions.push(sql`${songRequests.requestedAt} < ${beforeDate}`);
  }

  return db
    .select()
    .from(songRequests)
    .where(and(...conditions))
    .orderBy(desc(songRequests.requestedAt))
    .limit(limit);
}

/**
 * Log a gift event.
 */
export async function logGiftEvent(
  sessionId: string,
  viewerUsername: string,
  giftId: number,
  giftName: string | null,
  diamondCount: number | null,
  repeatCount: number
): Promise<GiftEvent> {
  const [gift] = await db
    .insert(giftEvents)
    .values({
      liveSessionId: sessionId,
      viewerUsername,
      giftId,
      giftName,
      diamondCount,
      repeatCount,
      receivedAt: new Date(),
    })
    .returning();

  if (!gift) throw new Error("Failed to log gift event");
  return gift;
}

/**
 * Get all gift events for a session.
 */
export async function getGiftEventsForSession(sessionId: string): Promise<GiftEvent[]> {
  return db
    .select()
    .from(giftEvents)
    .where(eq(giftEvents.liveSessionId, sessionId))
    .orderBy(desc(giftEvents.receivedAt));
}

/**
 * Batch-insert raw TikTok events.
 */
export async function logRawTikTokEvents(
  batch: {
    liveSessionId: string;
    eventType: string;
    viewerUsername: string | null;
    payload: unknown;
  }[]
): Promise<void> {
  if (batch.length === 0) return;

  await db.insert(tiktokRawEvents).values(
    batch.map((e) => ({
      liveSessionId: e.liveSessionId,
      eventType: e.eventType,
      viewerUsername: e.viewerUsername,
      payload: e.payload,
      receivedAt: new Date(),
    }))
  );
}

/**
 * Session report: aggregated track data + gift summary.
 * Only groups matched requests (searchStatus = 'matched') to avoid
 * collapsing failed requests (null spotifyTrackId) into one row.
 */
export async function getSessionReport(sessionId: string) {
  // Track-level aggregation (matched only)
  const tracks = await db
    .select({
      spotifyTrackId: songRequests.spotifyTrackId,
      trackName: songRequests.trackName,
      trackArtist: songRequests.trackArtist,
      albumImageUrl: songRequests.albumImageUrl,
      playStatus: songRequests.playStatus,
      requestCount: count(songRequests.id),
      uniqueViewers: countDistinct(songRequests.viewerUsername),
    })
    .from(songRequests)
    .where(
      and(
        eq(songRequests.liveSessionId, sessionId),
        eq(songRequests.searchStatus, "matched")
      )
    )
    .groupBy(
      songRequests.spotifyTrackId,
      songRequests.trackName,
      songRequests.trackArtist,
      songRequests.albumImageUrl,
      songRequests.playStatus
    );

  // Count failed requests separately
  const [failedResult] = await db
    .select({ failedCount: count(songRequests.id) })
    .from(songRequests)
    .where(
      and(
        eq(songRequests.liveSessionId, sessionId),
        sql`${songRequests.searchStatus} != 'matched'`
      )
    );

  // Gift summary
  const [giftSummary] = await db
    .select({
      totalDiamonds: sql<number>`COALESCE(SUM(${giftEvents.diamondCount}), 0)`,
      giftCount: count(giftEvents.id),
    })
    .from(giftEvents)
    .where(eq(giftEvents.liveSessionId, sessionId));

  return {
    tracks,
    failedCount: failedResult?.failedCount ?? 0,
    gifts: {
      totalDiamonds: giftSummary?.totalDiamonds ?? 0,
      giftCount: giftSummary?.giftCount ?? 0,
    },
  };
}
