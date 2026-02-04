"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface QueueItem {
  id: string;
  viewerUsername: string | null;
  spotifyTrackId: string;
  trackTitle: string;
  trackArtist: string;
  status: string;
  position: number;
  requestedAt: string;
}

export interface LiveSession {
  id: string;
  tiktokUsername: string;
  status: "active" | "ended";
  startedAt: string;
}

interface WSMessage {
  type: string;
  session?: LiveSession;
  queue?: QueueItem[];
  item?: QueueItem;
  roomId?: string;
  reason?: string;
}

interface UseBackendWSReturn {
  session: LiveSession | null;
  queue: QueueItem[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  removeFromQueue: (itemId: string) => Promise<void>;
}

// Backend URL configuration:
// - Production: NEXT_PUBLIC_BACKEND_URL=https://api.hotbun.xyz
// - Local dev: NEXT_PUBLIC_BACKEND_URL=http://localhost:4000 (or empty for same-origin)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

// Log config when TEST_MODE is enabled
if (TEST_MODE && typeof window !== "undefined") {
  console.log("[SongFlow] Frontend config:", {
    BACKEND_URL: BACKEND_URL || "(empty - same origin)",
    TEST_MODE,
    timestamp: new Date().toISOString(),
  });
}

export function useBackendWS(): UseBackendWSReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to WebSocket
  useEffect(() => {
    // Build WebSocket URL
    let wsUrl: string;
    if (BACKEND_URL) {
      // Use configured backend URL (e.g., https://api.hotbun.xyz -> wss://api.hotbun.xyz)
      wsUrl = BACKEND_URL.replace(/^http/, "ws") + "/ws/dashboard";
    } else {
      // Fallback: same-origin (for local dev without backend URL set)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${window.location.host}/ws/dashboard`;
    }
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setError("WebSocket connection failed");
    };

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);

        switch (data.type) {
          case "init":
            if (data.session) setSession(data.session);
            if (data.queue) setQueue(data.queue);
            break;
          case "session:connected":
            // Session started
            break;
          case "session:ended":
            setSession(null);
            setQueue([]);
            break;
          case "queue:add":
            if (data.item) {
              setQueue((prev) => [...prev, data.item!]);
            }
            break;
          case "queue:update":
            if (data.queue) setQueue(data.queue);
            break;
          case "server:shutdown":
            setError("Server is restarting...");
            break;
        }
      } catch (e) {
        console.error("Failed to parse WS message:", e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  // Start session
  const startSession = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/session`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to start session");
        return;
      }

      setSession(data.session);
    } catch {
      setError("Network error");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // End session
  const endSession = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/session`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setSession(null);
        setQueue([]);
      }
    } catch {
      setError("Failed to end session");
    }
  }, []);

  // Remove from queue
  const removeFromQueue = useCallback(async (itemId: string) => {
    try {
      await fetch(`${BACKEND_URL}/queue/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });

      setQueue((prev) => prev.filter((item) => item.id !== itemId));
    } catch (e) {
      console.error("Failed to remove from queue:", e);
    }
  }, []);

  return {
    session,
    queue,
    isConnected,
    isConnecting,
    error,
    startSession,
    endSession,
    removeFromQueue,
  };
}
