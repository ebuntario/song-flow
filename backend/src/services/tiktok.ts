import { WebcastPushConnection } from "tiktok-live-connector";
import { parseCommand } from "../lib/parser";
import { checkRateLimit } from "../lib/rate-limit";
import { addQueueItem, endLiveSession } from "../db/queries";
import { searchSpotifyTrack } from "./spotify";
import { logger } from "../lib/logger";

type EventEmitter = (userId: string, event: unknown) => void;

interface ConnectionInfo {
  connection: WebcastPushConnection;
  userId: string;
  sessionId: string;
}

export class TikTokService {
  private connections = new Map<string, ConnectionInfo>();
  private emitEvent: EventEmitter;

  constructor(emitEvent: EventEmitter) {
    this.emitEvent = emitEvent;
  }

  /**
   * Start listening to a TikTok Live stream
   */
  async startListening(
    sessionId: string,
    tiktokUsername: string,
    userId: string,
    spotifyToken: string
  ): Promise<void> {
    // Check if already listening
    if (this.connections.has(sessionId)) {
      logger.warn("Already listening to session", { sessionId });
      return;
    }

    const connection = new WebcastPushConnection(tiktokUsername);

    // Handle chat messages
    connection.on("chat", async (data) => {
      try {
        await this.handleChat(sessionId, userId, spotifyToken, data);
      } catch (err) {
        logger.error("Error handling chat", { sessionId, error: String(err) });
      }
    });

    // Handle stream end
    connection.on("streamEnd", async () => {
      logger.info("Stream ended", { sessionId, username: tiktokUsername });
      await this.handleStreamEnd(sessionId, userId);
    });

    // Handle disconnection
    connection.on("disconnected", () => {
      logger.info("Disconnected from stream", { sessionId, username: tiktokUsername });
    });

    // Connect
    try {
      const state = await connection.connect();
      logger.info("Connected to TikTok stream", { sessionId, username: tiktokUsername, roomId: state.roomId });
      
      this.connections.set(sessionId, { connection, userId, sessionId });
      
      // Notify frontend
      this.emitEvent(userId, {
        type: "session:connected",
        roomId: state.roomId,
      });
    } catch (err) {
      logger.error("Failed to connect to TikTok stream", { sessionId, username: tiktokUsername, error: String(err) });
      throw err;
    }
  }

  /**
   * Stop listening to a session
   */
  async stopListening(sessionId: string): Promise<void> {
    const info = this.connections.get(sessionId);
    if (!info) return;

    info.connection.disconnect();
    this.connections.delete(sessionId);
    
    logger.info("Stopped listening to session", { sessionId });
  }

  /**
   * Handle incoming chat message
   */
  private async handleChat(
    sessionId: string,
    userId: string,
    spotifyToken: string,
    data: { uniqueId: string; nickname: string; comment: string }
  ): Promise<void> {
    const command = parseCommand(data.comment);
    if (!command) return;

    const viewerId = data.uniqueId;

    // Rate limit check
    if (!checkRateLimit(viewerId)) {
      logger.debug("Rate limited viewer", { sessionId, viewerId });
      return;
    }

    if (command.type === "play") {
      // Search Spotify
      const track = await searchSpotifyTrack(spotifyToken, command.query);
      if (!track) {
        logger.debug("No track found for query", { sessionId, query: command.query });
        return;
      }

      // Add to queue
      const queueItem = await addQueueItem(sessionId, {
        viewerUsername: data.uniqueId,
        spotifyTrackId: track.id,
        trackTitle: track.name,
        trackArtist: track.artists.map((a) => a.name).join(", "),
      });

      // Notify frontend
      this.emitEvent(userId, {
        type: "queue:add",
        item: queueItem,
      });

      logger.info("Track queued", { 
        sessionId, 
        trackName: track.name, 
        artist: track.artists[0]?.name ?? "Unknown", 
        requestedBy: data.uniqueId 
      });
    }

    // TODO: Handle revoke and skip commands
  }

  /**
   * Handle stream ending
   */
  private async handleStreamEnd(sessionId: string, userId: string): Promise<void> {
    await endLiveSession(sessionId);
    this.connections.delete(sessionId);

    this.emitEvent(userId, {
      type: "session:ended",
      reason: "stream_ended",
    });
  }

  /**
   * Get number of active connections
   */
  get activeConnections(): number {
    return this.connections.size;
  }

  /**
   * Disconnect all connections (for shutdown)
   */
  disconnectAll(): void {
    for (const info of this.connections.values()) {
      info.connection.disconnect();
    }
    this.connections.clear();
  }

  /**
   * Get all active session IDs
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.connections.keys());
  }
}
