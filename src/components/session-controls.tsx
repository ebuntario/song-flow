"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface QueueItem {
  id: string;
  trackTitle: string;
  trackArtist: string;
  viewerUsername: string;
  status: string;
  position: number;
}

interface LiveSession {
  id: string;
  tiktokUsername: string;
  status: string;
  startedAt: string;
}

interface SessionControlsProps {
  initialTiktokUsername?: string;
}

export function SessionControls({ initialTiktokUsername }: SessionControlsProps) {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [tiktokUsername, setTiktokUsername] = useState(initialTiktokUsername || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current session and queue
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/session");
      const data = await res.json();
      setSession(data.session);
      setQueue(data.queue || []);
    } catch (err) {
      console.error("Failed to fetch session:", err);
    }
  }, []);

  // Poll for updates when session is active
  useEffect(() => {
    fetchSession();

    // Poll every 3 seconds when session is active
    const interval = setInterval(() => {
      if (session?.status === "active") {
        fetchSession();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchSession, session?.status]);

  // Start session
  const startSession = async () => {
    if (!tiktokUsername.trim()) {
      setError("Please enter your TikTok username");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiktokUsername: tiktokUsername.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start session");
      }

      setSession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setIsLoading(false);
    }
  };

  // Stop session
  const stopSession = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/session", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to stop session");
      }

      setSession(null);
      setQueue([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop session");
    } finally {
      setIsLoading(false);
    }
  };

  // Remove queue item
  const removeFromQueue = async (itemId: string) => {
    try {
      const res = await fetch(`/api/queue?id=${itemId}`, { method: "DELETE" });
      if (res.ok) {
        setQueue((prev) => prev.filter((item) => item.id !== itemId));
      }
    } catch (err) {
      console.error("Failed to remove from queue:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Session Status Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Live Session</h2>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                session?.status === "active" ? "bg-green-400" : "bg-red-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                session?.status === "active" ? "bg-green-500" : "bg-red-500"
              }`}
            />
          </span>
          <span
            className={`text-sm font-medium ${
              session?.status === "active" ? "text-green-500" : "text-red-500"
            }`}
          >
            {session?.status === "active" ? "Live" : "Offline"}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded">{error}</p>
      )}

      {/* Session Controls */}
      {!session ? (
        <div className="space-y-3">
          <Input
            placeholder="Your TikTok username (without @)"
            value={tiktokUsername}
            onChange={(e) => setTiktokUsername(e.target.value)}
            className="h-12"
          />
          <Button
            size="lg"
            className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
            onClick={startSession}
            disabled={isLoading}
          >
            {isLoading ? "Starting..." : "Start Session"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Listening to <span className="font-medium">@{session.tiktokUsername}</span>
          </p>
          <Button
            size="lg"
            variant="destructive"
            className="w-full h-14 text-lg"
            onClick={stopSession}
            disabled={isLoading}
          >
            {isLoading ? "Stopping..." : "End Session"}
          </Button>
        </div>
      )}

      {/* Queue Section */}
      {session?.status === "active" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Queue ({queue.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {queue.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">
                No requests yet. Chat <code className="bg-muted px-1 rounded">!play Song Name</code> on TikTok.
              </p>
            ) : (
              <ul className="space-y-2">
                {queue.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground w-6">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{item.trackTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.trackArtist} • by @{item.viewerUsername}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromQueue(item.id)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      ✕
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
