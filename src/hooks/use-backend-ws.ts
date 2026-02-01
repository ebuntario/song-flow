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

// Use env var if available, fallback to production URL (not localhost)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://song-flow-production.up.railway.app";

export function useBackendWS(): UseBackendWSReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to WebSocket
  useEffect(() => {
    const wsUrl = BACKEND_URL.replace(/^http/, "ws") + "/ws/dashboard";
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
