import { WebcastPushConnection } from "tiktok-live-connector";
import { parseCommand } from "../lib/parser";
import { checkRateLimit } from "../lib/rate-limit";
import {
  endLiveSession,
  logSongRequest,
  updateRequestAfterSearch,
  findRecentDuplicate,
  logGiftEvent,
  logRawTikTokEvents,
} from "../db/queries";
import { searchSpotifyTrack, getSpotifyToken } from "./spotify";
import { SpotifyPoller } from "./spotify-poller";
import { logger } from "../lib/logger";

const RAW_EVENT_FLUSH_INTERVAL_MS = 1_000;
const MAX_RAW_PAYLOAD_BYTES = 10_240; // 10KB

type EventEmitter = (userId: string, event: unknown) => void;

interface ConnectionInfo {
  connection: WebcastPushConnection;
  userId: string;
  sessionId: string;
  poller: SpotifyPoller;
  rawEventBuffer: RawEventBufferItem[];
  rawEventTimer: ReturnType<typeof setInterval> | null;
}

interface RawEventBufferItem {
  liveSessionId: string;
  eventType: string;
  viewerUsername: string | null;
  payload: unknown;
}

export class TikTokService {
  private connections = new Map<string, ConnectionInfo>();
  private emitEvent: EventEmitter;

  constructor(emitEvent: EventEmitter) {
    this.emitEvent = emitEvent;
  }

  /**
   * Start listening to a TikTok Live stream.
   * H1 fix: no spotifyToken param — token is lazy-fetched per search/poll.
   */
  async startListening(
    sessionId: string,
    tiktokUsername: string,
    userId: string
  ): Promise<void> {
    if (this.connections.has(sessionId)) {
      logger.warn("Already listening to session", { sessionId });
      return;
    }

    const connection = new WebcastPushConnection(tiktokUsername, {
      enableExtendedGiftInfo: true,
    });

    // Create poller (started after connection succeeds)
    const poller = new SpotifyPoller(sessionId, userId, (message) => {
      this.emitEvent(userId, { type: "session:spotify_error", message });
    });

    // Raw event buffer
    const rawEventBuffer: RawEventBufferItem[] = [];
    const rawEventTimer = setInterval(() => {
      this.flushRawEvents(rawEventBuffer, sessionId);
    }, RAW_EVENT_FLUSH_INTERVAL_MS);

    // ---- Event handlers ----

    // Chat messages (song requests)
    connection.on("chat", async (data) => {
      try {
        this.bufferRawEvent(rawEventBuffer, sessionId, "chat", data.uniqueId, data);
        await this.handleChat(sessionId, userId, data);
      } catch (err) {
        logger.error("Error handling chat", { sessionId, error: String(err) });
      }
    });

    // Gift events
    connection.on("gift", async (data) => {
      try {
        this.bufferRawEvent(rawEventBuffer, sessionId, "gift", data.uniqueId, data);
        await this.handleGift(sessionId, userId, data);
      } catch (err) {
        logger.error("Error handling gift", { sessionId, error: String(err) });
      }
    });

    // Other events → raw log only
    for (const eventType of ["member", "like", "share", "roomUser", "follow", "subscribe"] as const) {
      connection.on(eventType, (data: Record<string, unknown>) => {
        const username = typeof data.uniqueId === "string" ? data.uniqueId : null;
        this.bufferRawEvent(rawEventBuffer, sessionId, eventType, username, data);
      });
    }

    // Stream end
    connection.on("streamEnd", async () => {
      logger.info("Stream ended", { sessionId, username: tiktokUsername });
      await this.handleStreamEnd(sessionId, userId);
    });

    // Disconnection
    connection.on("disconnected", () => {
      logger.info("Disconnected from stream", { sessionId, username: tiktokUsername });
    });

    // ---- Connect ----
    try {
      const state = await connection.connect();
      logger.info("Connected to TikTok stream", {
        sessionId,
        username: tiktokUsername,
        roomId: state.roomId,
      });

      this.connections.set(sessionId, {
        connection,
        userId,
        sessionId,
        poller,
        rawEventBuffer,
        rawEventTimer,
      });

      // Start poller after successful connection
      poller.start();

      // Notify frontend
      this.emitEvent(userId, {
        type: "session:connected",
        roomId: state.roomId,
      });
    } catch (err) {
      clearInterval(rawEventTimer);
      logger.error("Failed to connect to TikTok stream", {
        sessionId,
        username: tiktokUsername,
        error: String(err),
      });
      throw err;
    }
  }

  /**
   * Stop listening to a session and finalize all data.
   * Calls sequential shutdown: poller → flush raw events → end session.
   */
  async stopListening(sessionId: string): Promise<void> {
    const info = this.connections.get(sessionId);
    if (!info) return;

    // Sequential shutdown (H3 fix)
    await info.poller.stopAndFinalize();

    // Flush remaining raw events
    if (info.rawEventTimer) clearInterval(info.rawEventTimer);
    await this.flushRawEvents(info.rawEventBuffer, sessionId);

    info.connection.disconnect();
    this.connections.delete(sessionId);

    logger.info("Stopped listening to session", { sessionId });
  }

  /**
   * Handle incoming chat message — song request flow.
   * H1: token lazy-fetched. H2: dedup check before insert.
   */
  private async handleChat(
    sessionId: string,
    userId: string,
    data: { uniqueId: string; nickname: string; comment: string }
  ): Promise<void> {
    const command = parseCommand(data.comment);
    if (!command || command.type !== "play") return;

    const viewerUsername = data.uniqueId;

    // Rate limit check
    if (!checkRateLimit(viewerUsername)) {
      // Still log the request, but mark as rate_limited
      const request = await logSongRequest(sessionId, viewerUsername, data.comment, command.query);
      await updateRequestAfterSearch(request.id, { status: "rate_limited" });
      logger.debug("Rate limited viewer", { sessionId, viewerUsername });
      return;
    }

    // Dedup check (H2): same viewer + same query within 5s
    const duplicate = await findRecentDuplicate(sessionId, viewerUsername, command.query);
    if (duplicate) {
      logger.debug("Duplicate request suppressed", { sessionId, viewerUsername, query: command.query });
      return;
    }

    // Log the request
    const request = await logSongRequest(sessionId, viewerUsername, data.comment, command.query);

    // Get Spotify token (H1: lazy fetch, handles refresh)
    const token = await getSpotifyToken(userId);
    if (!token) {
      await updateRequestAfterSearch(request.id, { status: "error" });
      this.emitEvent(userId, {
        type: "session:spotify_error",
        message: "Spotify token unavailable",
      });
      return;
    }

    // Search Spotify
    const track = await searchSpotifyTrack(token, command.query);
    if (!track) {
      await updateRequestAfterSearch(request.id, { status: "not_found" });
      // Still emit to show the failed request in the dashboard
      const updatedRequest = { ...request, searchStatus: "not_found" as const };
      this.emitEvent(userId, { type: "request:new", request: updatedRequest });
      logger.debug("No track found for query", { sessionId, query: command.query });
      return;
    }

    // Update with match data
    await updateRequestAfterSearch(request.id, {
      status: "matched",
      track: {
        id: track.id,
        name: track.name,
        artist: track.artists.map((a) => a.name).join(", "),
        albumName: track.album.name,
        albumImageUrl: track.album.images[0]?.url ?? null,
        durationMs: track.duration_ms,
        uri: track.uri,
      },
    });

    // Emit the fully-hydrated request to the dashboard
    const matchedRequest = {
      ...request,
      spotifyTrackId: track.id,
      trackName: track.name,
      trackArtist: track.artists.map((a) => a.name).join(", "),
      albumName: track.album.name,
      albumImageUrl: track.album.images[0]?.url ?? null,
      durationMs: track.duration_ms,
      spotifyUri: track.uri,
      searchStatus: "matched" as const,
      matchedAt: new Date(),
    };

    this.emitEvent(userId, { type: "request:new", request: matchedRequest });

    logger.info("Song request logged", {
      sessionId,
      trackName: track.name,
      artist: track.artists[0]?.name ?? "Unknown",
      requestedBy: viewerUsername,
    });
  }

  /**
   * Handle gift event
   */
  private async handleGift(
    sessionId: string,
    userId: string,
    data: {
      uniqueId: string;
      giftId: number;
      giftName?: string;
      diamondCount?: number;
      repeatCount?: number;
      repeatEnd?: boolean;
    }
  ): Promise<void> {
    // Only log when the gift repeat sequence ends (or for non-repeatable gifts)
    if (data.repeatEnd === false) return;

    const gift = await logGiftEvent(
      sessionId,
      data.uniqueId,
      data.giftId,
      data.giftName ?? null,
      data.diamondCount ?? null,
      data.repeatCount ?? 1
    );

    this.emitEvent(userId, { type: "gift:new", gift });

    logger.info("Gift received", {
      sessionId,
      giftName: data.giftName,
      diamonds: data.diamondCount,
      from: data.uniqueId,
    });
  }

  /**
   * Handle stream ending — sequential shutdown (H3 fix).
   */
  private async handleStreamEnd(sessionId: string, userId: string): Promise<void> {
    const info = this.connections.get(sessionId);
    if (info) {
      // Sequential: poller stop → final poll → finalize remaining
      await info.poller.stopAndFinalize();

      // Flush remaining raw events
      if (info.rawEventTimer) clearInterval(info.rawEventTimer);
      await this.flushRawEvents(info.rawEventBuffer, sessionId);

      this.connections.delete(sessionId);
    }

    await endLiveSession(sessionId);

    this.emitEvent(userId, {
      type: "session:ended",
      reason: "stream_ended",
    });
  }

  /**
   * Buffer a raw event for async batch insert.
   * Payload is capped at 10KB to prevent bloat.
   */
  private bufferRawEvent(
    buffer: RawEventBufferItem[],
    sessionId: string,
    eventType: string,
    viewerUsername: string | null,
    data: unknown
  ): void {
    let payload = data;
    try {
      const serialized = JSON.stringify(data);
      if (serialized.length > MAX_RAW_PAYLOAD_BYTES) {
        payload = { _truncated: true, _originalSize: serialized.length };
      }
    } catch {
      payload = { _serializationError: true };
    }

    buffer.push({
      liveSessionId: sessionId,
      eventType,
      viewerUsername,
      payload,
    });
  }

  /**
   * Flush buffered raw events to the database.
   * Fire-and-forget — errors logged but never block main flow.
   */
  private async flushRawEvents(buffer: RawEventBufferItem[], sessionId: string): Promise<void> {
    if (buffer.length === 0) return;

    const batch = buffer.splice(0, buffer.length);
    try {
      await logRawTikTokEvents(batch);
    } catch (err) {
      logger.error("Failed to flush raw events", {
        sessionId,
        count: batch.length,
        error: String(err),
      });
    }
  }

  /**
   * Get number of active connections
   */
  get activeConnections(): number {
    return this.connections.size;
  }

  /**
   * Disconnect all connections (for server shutdown)
   */
  async disconnectAll(): Promise<void> {
    for (const info of this.connections.values()) {
      await info.poller.stopAndFinalize();
      if (info.rawEventTimer) clearInterval(info.rawEventTimer);
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

  /**
   * Get poller for a session (used by endpoint for manual stop).
   */
  getPoller(sessionId: string): SpotifyPoller | null {
    return this.connections.get(sessionId)?.poller ?? null;
  }
}

