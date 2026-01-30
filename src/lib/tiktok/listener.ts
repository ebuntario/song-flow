import { WebcastPushConnection } from "tiktok-live-connector";
import { parseCommand } from "./parser";
import { db } from "@/lib/db";
import { liveSessions, queueItems } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { addToQueue, getSpotifyToken, searchTracks, skipTrack } from "@/lib/spotify/client";

export async function startListener(tiktokUsername: string, sessionId: string, userId: string) {
  const connection = new WebcastPushConnection(tiktokUsername);

  connection.on("chat", async (data) => {
    const command = parseCommand(data.comment);
    if (!command) return;

    const viewer = data.uniqueId || "anonymous";

    try {
      switch (command.type) {
        case "play":
          await handlePlay(sessionId, userId, viewer, command.query);
          break;
        case "revoke":
          await handleRevoke(sessionId, viewer);
          break;
        case "skip":
          // Only allow streamer to skip
          if (viewer === tiktokUsername) await handleSkip(userId);
          break;
      }
    } catch (error) {
      console.error(`Error handling ${command.type} from ${viewer}:`, error);
    }
  });

  connection.on("streamEnd", async () => {
    await db.update(liveSessions)
      .set({ status: "ended", endedAt: new Date() })
      .where(eq(liveSessions.id, sessionId));
    console.log(`Stream ended for session ${sessionId}`);
  });

  await connection.connect();
  console.log(`Connected to @${tiktokUsername} live stream`);
  return connection;
}

async function handlePlay(sessionId: string, userId: string, viewer: string, query: string) {
  const token = await getSpotifyToken(userId);
  if (!token) {
    console.error("No Spotify token available");
    return;
  }

  // Search for track
  const results = await searchTracks(token, query);
  const track = results.tracks?.items?.[0];
  if (!track) {
    console.log(`No track found for query: ${query}`);
    return;
  }

  // Get next position in queue
  const [lastItem] = await db.select({ position: queueItems.position })
    .from(queueItems)
    .where(eq(queueItems.liveSessionId, sessionId))
    .orderBy(desc(queueItems.position))
    .limit(1);

  const position = (lastItem?.position ?? 0) + 1;

  // Insert into database queue
  await db.insert(queueItems).values({
    liveSessionId: sessionId,
    viewerUsername: viewer,
    spotifyTrackId: track.id,
    trackTitle: track.name,
    trackArtist: track.artists.map((a: { name: string }) => a.name).join(", "),
    position,
    requestedAt: new Date(),
  });

  // Add to Spotify queue
  await addToQueue(token, track.uri);
  console.log(`Added "${track.name}" by ${track.artists[0]?.name} to queue (requested by ${viewer})`);
}

async function handleRevoke(sessionId: string, viewer: string) {
  // Find viewer's last queued request
  const [item] = await db.select().from(queueItems)
    .where(and(
      eq(queueItems.liveSessionId, sessionId),
      eq(queueItems.viewerUsername, viewer),
      eq(queueItems.status, "queued")
    ))
    .orderBy(desc(queueItems.requestedAt))
    .limit(1);

  if (item) {
    await db.update(queueItems).set({ status: "revoked" }).where(eq(queueItems.id, item.id));
    console.log(`Revoked request from ${viewer}: ${item.trackTitle}`);
  }
}

async function handleSkip(userId: string) {
  const token = await getSpotifyToken(userId);
  if (token) {
    await skipTrack(token);
    console.log("Skipped current track");
  }
}
