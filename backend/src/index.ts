import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { TikTokService } from "./services/tiktok";
import { getSpotifyToken } from "./services/spotify";
import { validateRequest } from "./services/auth";
import {
  getActiveSessionForUser,
  getAllActiveSessions,
  createLiveSession,
  endLiveSession,
  getQueueForSession,
  skipQueueItem,
} from "./db/queries";

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
console.log(`[CORS] Allowed origin: ${frontendUrl}`);

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

  // Health endpoint
  .get("/health", () => ({
    status: "ok",
    activeConnections: tiktokService.activeConnections,
  }))

  // Start session
  .post("/session", async ({ cookie, set }) => {
    const cookieHeader = Object.entries(cookie)
      .map(([name, c]) => `${name}=${c.value}`)
      .join("; ");

    const user = await validateRequest(cookieHeader);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    // Check for existing session
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

    // For now, derive username from user name (TODO: get from TikTok OAuth)
    const tiktokUsername = user.name?.replace(/\s+/g, "_").toLowerCase() ?? "unknown";

    // Create session
    const session = await createLiveSession(user.id, tiktokUsername);

    // Start TikTok listener
    try {
      await tiktokService.startListening(
        session.id,
        session.tiktokUsername,
        user.id,
        spotifyToken
      );
    } catch (err) {
      // Failed to connect - end session
      await endLiveSession(session.id);
      set.status = 503;
      return { error: "Failed to connect to TikTok Live" };
    }

    return { success: true, session };
  })

  // Stop session
  .delete("/session", async ({ cookie, set }) => {
    const cookieHeader = Object.entries(cookie)
      .map(([name, c]) => `${name}=${c.value}`)
      .join("; ");

    const user = await validateRequest(cookieHeader);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const session = await getActiveSessionForUser(user.id);
    if (!session) {
      set.status = 404;
      return { error: "No active session" };
    }

    await tiktokService.stopListening(session.id);
    await endLiveSession(session.id);

    return { success: true };
  })

  // Get queue
  .get("/queue", async ({ cookie, set }) => {
    const cookieHeader = Object.entries(cookie)
      .map(([name, c]) => `${name}=${c.value}`)
      .join("; ");

    const user = await validateRequest(cookieHeader);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const session = await getActiveSessionForUser(user.id);
    if (!session) {
      return { queue: [], hasSession: false };
    }

    const queue = await getQueueForSession(session.id);
    return { queue, hasSession: true, sessionId: session.id };
  })

  // Remove from queue
  .delete("/queue/:id", async ({ cookie, params, set }) => {
    const cookieHeader = Object.entries(cookie)
      .map(([name, c]) => `${name}=${c.value}`)
      .join("; ");

    const user = await validateRequest(cookieHeader);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    await skipQueueItem(params.id);
    return { success: true };
  })

  // WebSocket for real-time updates
  .ws("/ws/dashboard", {
    async open(ws) {
      // Parse cookie from upgrade headers - type varies by runtime
      const headers = (ws.data as any)?.headers;
      const cookieHeader = typeof headers?.get === "function" 
        ? headers.get("cookie") 
        : (headers?.cookie ?? "");
      const user = await validateRequest(cookieHeader);
      
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
      const session = await getActiveSessionForUser(user.id);
      if (session) {
        const queue = await getQueueForSession(session.id);
        ws.send(JSON.stringify({ type: "init", session, queue }));
      }
    },
    async close(ws) {
      // Find and remove client
      for (const [userId, clients] of wsClients) {
        if (clients.has(ws as any)) {
          clients.delete(ws as any);
          if (clients.size === 0) {
            wsClients.delete(userId);
          }
          break;
        }
      }
    },
    message(ws, message) {
      // Handle client messages if needed
      console.log("WS message:", message);
    },
  })

  .listen(process.env.PORT ?? 4000);

console.log(`🚀 Backend running at http://localhost:${app.server?.port}`);

// Startup recovery
async function recoverSessions() {
  const activeSessions = await getAllActiveSessions();
  console.log(`Recovering ${activeSessions.length} sessions...`);

  for (const session of activeSessions) {
    try {
      const spotifyToken = await getSpotifyToken(session.userId);
      if (!spotifyToken) {
        console.log(`✗ No Spotify token for ${session.tiktokUsername}, ending session`);
        await endLiveSession(session.id);
        continue;
      }

      await tiktokService.startListening(
        session.id,
        session.tiktokUsername,
        session.userId,
        spotifyToken
      );
      console.log(`✓ Recovered: ${session.tiktokUsername}`);
    } catch (err) {
      console.log(`✗ Stream ended: ${session.tiktokUsername}`);
      await endLiveSession(session.id);
    }
  }
}

// Run recovery after startup
recoverSessions().catch(console.error);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");

  // Notify connected clients
  for (const [userId, clients] of wsClients) {
    for (const client of clients) {
      client.send(JSON.stringify({ type: "server:shutdown" }));
    }
  }

  // Disconnect all TikTok connections
  tiktokService.disconnectAll();

  // Close server
  app.stop();
  process.exit(0);
});

export type App = typeof app;
