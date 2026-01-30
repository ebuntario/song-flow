import { db } from "./client";
import { sessions, users, liveSessions, queueItems } from "./schema";
import { eq, and, gt } from "drizzle-orm";
import type { User, LiveSession, QueueItem } from "./schema";

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
