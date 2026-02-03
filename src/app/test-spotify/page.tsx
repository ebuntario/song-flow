"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Track {
  id: string;
  name: string;
  uri: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
}

interface NowPlaying {
  item?: {
    name: string;
    artists: { name: string }[];
    album: { images: { url: string }[] };
  };
  is_playing: boolean;
}

export default function TestSpotifyPage() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/test-spotify/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTracks(data.tracks?.items || []);
    } catch (err) {
      showMessage(`Search failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQueue = async (track: Track) => {
    try {
      const res = await fetch("/api/test-spotify/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri: track.uri }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMessage(`✅ Queued: ${track.name}`);
    } catch (err) {
      showMessage(`Queue failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleSkip = async () => {
    try {
      const res = await fetch("/api/test-spotify/skip", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMessage("⏭️ Skipped to next track");
      fetchNowPlaying();
    } catch (err) {
      showMessage(`Skip failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const fetchNowPlaying = async () => {
    try {
      const res = await fetch("/api/test-spotify/now-playing");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNowPlaying(data);
    } catch (err) {
      showMessage(`Fetch failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto p-4 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">🎵 Spotify Test Page</h1>
        <p className="text-sm text-muted-foreground">Test Spotify integration in isolation</p>
      </header>

      {message && (
        <div className="p-3 rounded-md bg-primary/10 text-primary text-sm">
          {message}
        </div>
      )}

      {/* Now Playing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            Now Playing
            <Button variant="outline" size="sm" onClick={fetchNowPlaying}>
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nowPlaying?.item ? (
            <div className="flex items-center gap-3">
              {nowPlaying.item.album.images[0] && (
                <img
                  src={nowPlaying.item.album.images[0].url}
                  alt="Album"
                  className="w-12 h-12 rounded"
                />
              )}
              <div className="flex-1">
                <p className="font-medium">{nowPlaying.item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {nowPlaying.item.artists.map((a) => a.name).join(", ")}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip ⏭️
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Nothing playing. Click Refresh to check.</p>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Search & Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for a song..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "..." : "Search"}
            </Button>
          </div>

          {tracks.length > 0 && (
            <div className="space-y-2">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted/50"
                >
                  {track.album.images[0] && (
                    <img
                      src={track.album.images[0].url}
                      alt="Album"
                      className="w-10 h-10 rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {track.artists.map((a) => a.name).join(", ")}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => handleQueue(track)}>
                    Queue
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        Make sure Spotify is playing on a device before queuing.
      </p>
    </div>
  );
}
