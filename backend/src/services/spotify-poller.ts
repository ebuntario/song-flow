import { getSpotifyToken } from "./spotify";
import { getRecentlyPlayed } from "./spotify";
import { getPendingRequests, updatePlayStatus } from "../db/queries";
import { logger } from "../lib/logger";

const POLL_INTERVAL_MS = 30_000; // 30 seconds

type SpotifyErrorEmitter = (message: string) => void;

/**
 * Polls Spotify recently-played to confirm which requested songs were
 * actually played. Uses sequential `stopAndFinalize()` shutdown to avoid
 * the poller/stream-end race condition (H3).
 */
export class SpotifyPoller {
  private timer: ReturnType<typeof setInterval> | null = null;
  private afterTimestamp: number | null = null;
  private readonly sessionId: string;
  private readonly userId: string;
  private readonly onSpotifyError: SpotifyErrorEmitter;
  private stopped = false;

  constructor(
    sessionId: string,
    userId: string,
    onSpotifyError: SpotifyErrorEmitter
  ) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.onSpotifyError = onSpotifyError;
  }

  /**
   * Start polling. Call once after session begins.
   */
  start(): void {
    if (this.timer) return;
    this.afterTimestamp = Date.now();

    this.timer = setInterval(() => {
      this.poll().catch((err) => {
        logger.error("Poller tick failed", {
          sessionId: this.sessionId,
          error: String(err),
        });
      });
    }, POLL_INTERVAL_MS);

    logger.info("Spotify poller started", { sessionId: this.sessionId });
  }

  /**
   * Sequential shutdown: stop → final poll → finalize remaining as not_played.
   * Must be awaited. Safe to call multiple times (idempotent after first).
   */
  async stopAndFinalize(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;

    // 1. Stop future polls
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // 2. Run one final poll to catch last-minute plays
    await this.poll();

    // 3. Mark all remaining pending requests as not_played
    await this.finalizeRemaining();

    logger.info("Spotify poller stopped and finalized", {
      sessionId: this.sessionId,
    });
  }

  /**
   * Single poll cycle: fetch recently-played, cross-reference with pending
   * requests, confirm matches.
   */
  private async poll(): Promise<void> {
    const token = await getSpotifyToken(this.userId);
    if (!token) {
      this.onSpotifyError("Spotify token unavailable — play confirmation paused");
      logger.warn("Spotify token null during poll, skipping", {
        sessionId: this.sessionId,
      });
      return;
    }

    const result = await getRecentlyPlayed(token, this.afterTimestamp ?? undefined);
    if (!result) {
      // getRecentlyPlayed returns null on error (including 403 / no Premium)
      return;
    }

    const { items, cursors } = result;

    // Update cursor for next poll
    if (cursors?.after) {
      this.afterTimestamp = Number(cursors.after);
    }

    if (items.length === 0) return;

    // Get pending requests that we're waiting to confirm
    const pending = await getPendingRequests(this.sessionId);
    if (pending.length === 0) return;

    // Build a set of recently-played track IDs
    const playedTrackIds = new Set(items.map((item) => item.track.id));

    // Cross-reference
    for (const request of pending) {
      if (request.spotifyTrackId && playedTrackIds.has(request.spotifyTrackId)) {
        await updatePlayStatus(request.id, "confirmed");
        logger.info("Play confirmed", {
          sessionId: this.sessionId,
          trackId: request.spotifyTrackId,
          trackName: request.trackName,
        });
      }
    }
  }

  /**
   * Mark all remaining pending+matched requests as not_played.
   */
  private async finalizeRemaining(): Promise<void> {
    const pending = await getPendingRequests(this.sessionId);
    for (const request of pending) {
      await updatePlayStatus(request.id, "not_played");
    }
    if (pending.length > 0) {
      logger.info("Finalized remaining requests as not_played", {
        sessionId: this.sessionId,
        count: pending.length,
      });
    }
  }
}
