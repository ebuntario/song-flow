import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { TikTokService } from "./services/tiktok";
import { getSpotifyToken } from "./services/spotify";
import { authDerive } from "./lib/auth-middleware";
import {
  getAllActiveSessions,
  createLiveSession,
  endLiveSession,
  getQueueForSession,
  skipQueueItem,
  getUserTiktokUsername,
  getRequestsForSession,
  getGiftEventsForSession,
  getSessionReport,
} from "./db/queries";
import { logger } from "./lib/logger";

// WebSocket clients by userId
const wsClients = new Map<string, Set<{ send: (data: string) => void }>>();

// Event emitter for TikTok events
function emitToUser(userId: string, event: unknown) {
  const clients = wsClients.get(userId);
  if (!clients) return;

  const message = JSON.stringify(event);
  for (const client of clients) {
    client.send(message);
  }
}

// Initialize TikTok service
const tiktokService = new TikTokService(emitToUser);

// Normalize FRONTEND_URL (remove trailing slash if present)
const frontendUrl = (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
const testMode = process.env.TEST_MODE === "true";

// Log all config when TEST_MODE is enabled
if (testMode) {
  logger.info("Backend configuration (TEST_MODE)", {
    FRONTEND_URL: frontendUrl,
    PORT: process.env.PORT ?? 4000,
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "NOT SET",
    TEST_MODE: testMode,
  });
}

logger.info("CORS configuration loaded", { allowedOrigin: frontendUrl });

// Create Elysia app
const app = new Elysia()
  .use(cors({
    // Allow both the frontend URL and Railway internal networking
    origin: (request: Request) => {
      const origin = request.headers.get('origin');
      // Allow requests with no origin (same-origin or server-to-server)
      if (!origin) return true;
      // Allow configured frontend URL
      if (origin === frontendUrl) return true;
      // Allow Railway internal traffic
      if (origin.endsWith('.railway.internal')) return true;
      // Allow localhost for dev
      if (origin.startsWith('http://localhost')) return true;
      return false;
    },
    credentials: true,
  }))
  .use(authDerive)

  // Health endpoint
  .get("/health", () => ({
    status: "ok",
    activeConnections: tiktokService.activeConnections,
  }))

  // Start session
  .post("/session", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    // Check for existing session (re-fetch for freshness since authDerive may have stale data)
    const { getActiveSessionForUser } = await import("./db/queries");
    const existing = await getActiveSessionForUser(user.id);
    if (existing) {
      set.status = 409;
      return { error: "Session already active", session: existing };
    }

    // Get Spotify token
    const spotifyToken = await getSpotifyToken(user.id);
    if (!spotifyToken) {
      set.status = 400;
      return { error: "Spotify not connected" };
    }

    // Get TikTok username from user's profile (stored from OAuth)
    const tiktokUsername = await getUserTiktokUsername(user.id);

    if (!tiktokUsername) {
      set.status = 400;
      return { error: "TikTok username not found. Please re-login via TikTok." };
    }

    // Create session
    const session = await createLiveSession(user.id, tiktokUsername);

    // Start TikTok listener (H1: no spotifyToken param)
    try {
      await tiktokService.startListening(
        session.id,
        session.tiktokUsername,
        user.id
      );
    } catch {
      // Failed to connect - end session
      await endLiveSession(session.id);
      set.status = 503;
      return { error: "Failed to connect to TikTok Live" };
    }

    return { success: true, session };
  })

  // Stop session
  .delete("/session", async ({ user, activeSession, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!activeSession) {
      set.status = 404;
      return { error: "No active session" };
    }

    // Sequential shutdown: poller → finalize → flush → disconnect
    await tiktokService.stopListening(activeSession.id);
    await endLiveSession(activeSession.id);

    return { success: true };
  })

  // Get queue
  .get("/queue", async ({ user, activeSession }) => {
    if (!user) {
      return { queue: [], hasSession: false };
    }

    if (!activeSession) {
      return { queue: [], hasSession: false };
    }

    const queue = await getQueueForSession(activeSession.id);
    return { queue, hasSession: true, sessionId: activeSession.id };
  })

  // Remove from queue
  .delete("/queue/:id", async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    await skipQueueItem(params.id);
    return { success: true };
  })

  // Get song requests (paginated)
  .get("/requests", async ({ user, activeSession, query }) => {
    if (!user) {
      return { requests: [], hasSession: false };
    }

    if (!activeSession) {
      return { requests: [], hasSession: false };
    }

    const before = query.before ? new Date(query.before as string) : undefined;
    const limit = query.limit ? Number(query.limit) : 50;
    const requests = await getRequestsForSession(activeSession.id, before, limit);
    return { requests, hasSession: true, sessionId: activeSession.id };
  })

  // Get gift events
  .get("/gifts", async ({ user, activeSession }) => {
    if (!user) {
      return { gifts: [], hasSession: false };
    }

    if (!activeSession) {
      return { gifts: [], hasSession: false };
    }

    const gifts = await getGiftEventsForSession(activeSession.id);
    return { gifts, hasSession: true, sessionId: activeSession.id };
  })

  // Get session report
  .get("/report", async ({ user, activeSession, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!activeSession) {
      set.status = 404;
      return { error: "No active session" };
    }

    const report = await getSessionReport(activeSession.id);
    return { report, sessionId: activeSession.id };
  })

  // WebSocket for real-time updates
  .ws("/ws/dashboard", {
    async open(ws) {
      // Parse cookie from upgrade headers - type varies by runtime
      const headers = (ws.data as { headers?: { get?: (name: string) => string; cookie?: string } })?.headers;
      const cookieHeader = typeof headers?.get === "function"
        ? headers.get("cookie")
        : (headers?.cookie ?? "");

      const { validateRequest } = await import("./services/auth");
      const user = await validateRequest(cookieHeader ?? "");

      if (!user) {
        ws.close();
        return;
      }

      // Register client
      if (!wsClients.has(user.id)) {
        wsClients.set(user.id, new Set());
      }
      wsClients.get(user.id)!.add(ws);

      // Send current state
      const { getActiveSessionForUser } = await import("./db/queries");
      const session = await getActiveSessionForUser(user.id);
      if (session) {
        const queue = await getQueueForSession(session.id);
        const requests = await getRequestsForSession(session.id, undefined, 50);
        const gifts = await getGiftEventsForSession(session.id);
        ws.send(JSON.stringify({ type: "init", session, queue, requests, gifts }));
      }
    },
    async close(ws) {
      // Find and remove client
      for (const [userId, clients] of wsClients) {
        if (clients.has(ws as { send: (data: string) => void })) {
          clients.delete(ws as { send: (data: string) => void });
          if (clients.size === 0) {
            wsClients.delete(userId);
          }
          break;
        }
      }
    },
    message(ws, message) {
      // Handle client messages if needed
      logger.debug("WebSocket message received", { message });
    },
  })

  .listen(process.env.PORT ?? 4000);

logger.info("Backend server started", { port: app.server?.port });

// Startup recovery
async function recoverSessions() {
  const activeSessions = await getAllActiveSessions();
  logger.info("Starting session recovery", { count: activeSessions.length });

  for (const session of activeSessions) {
    const sessionLogger = logger.child({ sessionId: session.id, username: session.tiktokUsername });
    try {
      // H1: no spotifyToken in startListening — token is lazy-fetched
      await tiktokService.startListening(
        session.id,
        session.tiktokUsername,
        session.userId
      );
      sessionLogger.info("Session recovered successfully");
    } catch {
      sessionLogger.warn("Stream ended during recovery");
      await endLiveSession(session.id);
    }
  }
}

// Run recovery after startup
recoverSessions().catch((err) => logger.error("Session recovery failed", { error: String(err) }));

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down gracefully");

  // Notify connected clients
  for (const clients of wsClients.values()) {
    for (const client of clients) {
      client.send(JSON.stringify({ type: "server:shutdown" }));
    }
  }

  // Disconnect all TikTok connections (now async for poller finalization)
  await tiktokService.disconnectAll();

  // Close server
  app.stop();
  process.exit(0);
});

export type App = typeof app;

