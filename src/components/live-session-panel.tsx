"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useBackendWS,
  type QueueItem,
  type SongRequest,
  type GiftEvent,
} from "@/hooks/use-backend-ws";
import {
  Loader2,
  Music,
  Trash2,
  Wifi,
  WifiOff,
  Gift,
  ListMusic,
  AlertTriangle,
} from "lucide-react";

type Tab = "requests" | "gifts" | "queue";

export function LiveSessionPanel() {
  const {
    session,
    queue,
    requests,
    gifts,
    isConnected,
    isConnecting,
    error,
    spotifyError,
    startSession,
    endSession,
    removeFromQueue,
  } = useBackendWS();

  const [activeTab, setActiveTab] = useState<Tab>("requests");

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Live Session</h2>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-500">Disconnected</span>
            </>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Spotify Error */}
      {spotifyError && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {spotifyError}
        </div>
      )}

      {/* Session Controls */}
      {session ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div>
              <p className="font-medium text-green-500">Session Active</p>
              <p className="text-sm text-muted-foreground">
                @{session.tiktokUsername}
              </p>
            </div>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
          </div>
          <Button
            variant="destructive"
            className="w-full"
            onClick={endSession}
          >
            End Session
          </Button>
        </div>
      ) : (
        <Button
          size="lg"
          className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
          onClick={startSession}
          disabled={isConnecting || !isConnected}
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            "Start Session"
          )}
        </Button>
      )}

      {/* Tabbed Content */}
      {session && (
        <Card className="mt-6">
          {/* Tab Headers */}
          <CardHeader className="pb-2">
            <div className="flex gap-1 border-b border-border">
              <TabButton
                active={activeTab === "requests"}
                onClick={() => setActiveTab("requests")}
                icon={<Music className="w-4 h-4" />}
                label="Requests"
                count={requests.length}
              />
              <TabButton
                active={activeTab === "gifts"}
                onClick={() => setActiveTab("gifts")}
                icon={<Gift className="w-4 h-4" />}
                label="Gifts"
                count={gifts.length}
              />
              <TabButton
                active={activeTab === "queue"}
                onClick={() => setActiveTab("queue")}
                icon={<ListMusic className="w-4 h-4" />}
                label="Queue"
                count={queue.length}
              />
            </div>
          </CardHeader>

          <CardContent>
            {activeTab === "requests" && (
              <RequestsList requests={requests} />
            )}
            {activeTab === "gifts" && <GiftsList gifts={gifts} />}
            {activeTab === "queue" && (
              <QueueList queue={queue} onRemove={removeFromQueue} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Show empty state when no session */}
      {!session && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Queue (0)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Start a session to see requests.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─────────────── Tab Button ─────────────── */

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
      {count > 0 && (
        <span
          className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
            active
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ─────────────── Requests Tab ─────────────── */

function RequestsList({ requests }: { requests: SongRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No song requests yet. Viewers can type <code>!play [song name]</code> in chat.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {requests.map((req) => (
        <RequestRow key={req.id} request={req} />
      ))}
    </div>
  );
}

function RequestRow({ request }: { request: SongRequest }) {
  return (
    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
      {/* Album art or placeholder */}
      <div className="w-10 h-10 rounded overflow-hidden shrink-0">
        {request.albumImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={request.albumImageUrl}
            alt={request.trackName ?? "Album"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <Music className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-sm">
          {request.trackName ?? request.parsedQuery}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {request.trackArtist ?? "Searching..."} • @{request.viewerUsername}
        </p>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        <SearchStatusBadge status={request.searchStatus} />
        {request.playStatus && request.playStatus !== "pending" && (
          <PlayStatusBadge status={request.playStatus} />
        )}
      </div>
    </div>
  );
}

function SearchStatusBadge({
  status,
}: {
  status: SongRequest["searchStatus"];
}) {
  const config = {
    pending: { label: "Searching", className: "bg-blue-500/15 text-blue-500" },
    matched: {
      label: "Matched",
      className: "bg-green-500/15 text-green-500",
    },
    not_found: {
      label: "Not found",
      className: "bg-amber-500/15 text-amber-500",
    },
    error: { label: "Error", className: "bg-red-500/15 text-red-500" },
    rate_limited: {
      label: "Rate limited",
      className: "bg-orange-500/15 text-orange-500",
    },
  }[status];

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${config.className}`}>
      {config.label}
    </span>
  );
}

function PlayStatusBadge({
  status,
}: {
  status: NonNullable<SongRequest["playStatus"]>;
}) {
  const config = {
    pending: { label: "⏳", className: "bg-blue-500/15 text-blue-500" },
    confirmed: { label: "▶ Played", className: "bg-emerald-500/15 text-emerald-500" },
    not_played: { label: "⏭ Skipped", className: "bg-zinc-500/15 text-zinc-400" },
  }[status];

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${config.className}`}>
      {config.label}
    </span>
  );
}

/* ─────────────── Gifts Tab ─────────────── */

function GiftsList({ gifts }: { gifts: GiftEvent[] }) {
  if (gifts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No gifts received yet.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {gifts.map((gift) => (
        <GiftRow key={gift.id} gift={gift} />
      ))}
    </div>
  );
}

function GiftRow({ gift }: { gift: GiftEvent }) {
  return (
    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
      <div className="w-10 h-10 bg-pink-500/10 rounded flex items-center justify-center shrink-0">
        <Gift className="w-5 h-5 text-pink-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-sm">
          {gift.giftName ?? `Gift #${gift.giftId}`}{" "}
          {gift.repeatCount > 1 && (
            <span className="text-muted-foreground">×{gift.repeatCount}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          @{gift.viewerUsername}
          {gift.diamondCount != null && ` • 💎 ${gift.diamondCount}`}
        </p>
      </div>
    </div>
  );
}

/* ─────────────── Queue Tab ─────────────── */

function QueueList({
  queue,
  onRemove,
}: {
  queue: QueueItem[];
  onRemove: (id: string) => void;
}) {
  if (queue.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No items in queue.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {queue.map((item) => (
        <QueueItemRow
          key={item.id}
          item={item}
          onRemove={() => onRemove(item.id)}
        />
      ))}
    </div>
  );
}

function QueueItemRow({
  item,
  onRemove,
}: {
  item: QueueItem;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
      <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
        <Music className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.trackTitle}</p>
        <p className="text-sm text-muted-foreground truncate">
          {item.trackArtist} • @{item.viewerUsername}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

