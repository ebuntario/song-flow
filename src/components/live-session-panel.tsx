"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Download,
} from "lucide-react";
import { WaveformBar } from "./waveform-bar";

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
  const [confirmEnd, setConfirmEnd] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleEndSession = useCallback(() => {
    if (!confirmEnd) {
      setConfirmEnd(true);
      confirmTimer.current = setTimeout(() => setConfirmEnd(false), 3000);
      return;
    }
    clearTimeout(confirmTimer.current);
    setConfirmEnd(false);
    endSession();
  }, [confirmEnd, endSession]);

  // Determine waveform state
  const waveformState = !session
    ? "idle"
    : requests.length > 0 &&
        requests.filter(
          (r) =>
            Date.now() - new Date(r.requestedAt).getTime() < 60_000
        ).length > 3
      ? "busy"
      : "active";

  return (
    <div className="space-y-4">
      {/* Waveform pulse bar — signature visual element */}
      <WaveformBar state={session ? waveformState : "idle"} />

      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Live Session
        </h2>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-[hsl(var(--spotify-green))]" />
              <span className="text-sm text-[hsl(var(--spotify-green))]">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-[hsl(var(--status-error))]" />
              <span className="text-sm text-[hsl(var(--status-error))]">Disconnected</span>
            </>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-[hsl(var(--status-error)/0.1)] border border-[hsl(var(--status-error)/0.2)] rounded-lg text-[hsl(var(--status-error))] text-sm">
          {error}
        </div>
      )}

      {/* Spotify Error */}
      {spotifyError && (
        <div className="p-3 bg-[hsl(var(--status-pending)/0.1)] border border-[hsl(var(--status-pending)/0.2)] rounded-lg text-[hsl(var(--status-pending))] text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {spotifyError}
        </div>
      )}

      {/* Session Controls */}
      {session ? (
        <div className="animate-slide-up space-y-3">
          <div
            className="flex items-center justify-between p-6 rounded-lg border border-[hsl(var(--spotify-green)/0.2)] bg-[hsl(var(--spotify-green)/0.05)]"
            style={{
              boxShadow: "0 0 60px -20px hsl(var(--spotify-green) / 0.3)",
            }}
          >
            <div>
              <p
                className="font-semibold text-[hsl(var(--spotify-green))]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Session Active
              </p>
              <p className="text-sm text-muted-foreground">
                @{session.tiktokUsername}
              </p>
            </div>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--spotify-green))] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[hsl(var(--spotify-green))]" />
            </span>
          </div>

          {/* 2-tap End Session confirm */}
          <Button
            variant="destructive"
            className={`w-full min-h-[44px] transition-colors ${
              confirmEnd
                ? "bg-[hsl(var(--status-error))] hover:bg-[hsl(var(--status-error)/0.9)]"
                : ""
            }`}
            onClick={handleEndSession}
          >
            {confirmEnd ? "Confirm End?" : "End Session"}
          </Button>
        </div>
      ) : (
        <Button
          size="lg"
          className="w-full h-14 text-lg bg-[hsl(var(--spotify-green))] hover:bg-[hsl(var(--spotify-green)/0.9)] text-white"
          style={{ fontFamily: "var(--font-display)" }}
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
        <Card className="mt-6 animate-slide-up" style={{ animationDelay: "100ms", animationFillMode: "backwards" }}>
          {/* Tab Headers */}
          <CardHeader className="pb-2">
            <div className="flex gap-1 border-b border-border items-center">
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
              {/* CSV Export */}
              <div className="ml-auto">
                <button
                  onClick={() => downloadReportCSV(requests, gifts, session?.tiktokUsername)}
                  className="p-2 min-h-[44px] text-muted-foreground hover:text-foreground transition-colors"
                  title="Export CSV"
                  aria-label="Export session report as CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3">
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
          <CardContent className="pt-6">
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
      className={`flex items-center gap-1.5 px-3 min-h-[44px] text-sm border-b-2 transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
      style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
    >
      {icon}
      {label}
      {count > 0 && (
        <span
          className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-mono-display ${
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
        <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-[hsl(var(--spotify-green)/0.1)] flex items-center justify-center">
          <Music className="w-6 h-6 text-[hsl(var(--spotify-green)/0.5)]" />
        </div>
        No requests yet
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {requests.map((req, i) => (
        <RequestRow key={req.id} request={req} index={i} />
      ))}
    </div>
  );
}

function RequestRow({ request, index }: { request: SongRequest; index: number }) {
  return (
    <div
      className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg min-h-[44px] animate-slide-in-left"
      style={{ animationDelay: `${Math.min(index * 50, 250)}ms`, animationFillMode: "backwards" }}
    >
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
          <div className="w-full h-full bg-[hsl(var(--spotify-green)/0.1)] flex items-center justify-center rounded">
            <Music className="w-5 h-5 text-[hsl(var(--spotify-green))]" />
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
        {request.requestedAt && (
          <p className="text-xs text-muted-foreground font-mono-display">
            {formatTimeAgo(request.requestedAt)}
          </p>
        )}
      </div>

      {/* Status dot */}
      <div className="shrink-0" title={getStatusLabel(request)}>
        <StatusDot request={request} />
      </div>
    </div>
  );
}

function StatusDot({ request }: { request: SongRequest }) {
  if (request.searchStatus === "not_found") {
    return <span className="block w-2.5 h-2.5 rounded-full bg-[hsl(var(--status-error))]" />;
  }
  if (request.searchStatus === "rate_limited") {
    return <span className="block w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />;
  }
  if (request.searchStatus === "error") {
    return <span className="block w-2.5 h-2.5 rounded-full bg-[hsl(var(--status-error))]" />;
  }
  if (request.playStatus === "confirmed") {
    return (
      <span className="block w-2.5 h-2.5 rounded-full bg-[hsl(var(--spotify-green))] animate-glow-pulse shadow-[0_0_6px_hsl(var(--spotify-green)/0.5)]" />
    );
  }
  // matched + pending
  return (
    <span className="block w-2.5 h-2.5 rounded-full bg-[hsl(var(--status-pending))]"
      style={{ animation: "glow-pulse 1.5s ease-in-out infinite" }}
    />
  );
}

function getStatusLabel(request: SongRequest): string {
  if (request.searchStatus === "not_found") return "Not found on Spotify";
  if (request.searchStatus === "rate_limited") return "Rate limited";
  if (request.searchStatus === "error") return "Search error";
  if (request.playStatus === "confirmed") return "Played ✓";
  if (request.playStatus === "not_played") return "Not played";
  return "Pending";
}

function formatTimeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

/* ─────────────── CSV Export ─────────────── */

function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadReportCSV(
  requests: SongRequest[],
  gifts: GiftEvent[],
  tiktokUsername?: string
) {
  const lines: string[] = [];
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const filename = `songflow-report-${tiktokUsername ?? "session"}-${timestamp}.csv`;

  // Requests section
  lines.push("SONG REQUESTS");
  lines.push("Track,Artist,Viewer,Search Status,Play Status,Requested At");
  for (const req of requests) {
    lines.push(
      [
        escapeCSV(req.trackName ?? req.parsedQuery),
        escapeCSV(req.trackArtist),
        escapeCSV(req.viewerUsername),
        escapeCSV(req.searchStatus),
        escapeCSV(req.playStatus),
        escapeCSV(req.requestedAt),
      ].join(",")
    );
  }

  // Blank line separator
  lines.push("");

  // Gifts section
  lines.push("GIFTS");
  lines.push("Gift Name,Viewer,Diamonds,Repeat Count,Received At");
  for (const gift of gifts) {
    lines.push(
      [
        escapeCSV(gift.giftName ?? `Gift #${gift.giftId}`),
        escapeCSV(gift.viewerUsername),
        escapeCSV(gift.diamondCount),
        escapeCSV(gift.repeatCount),
        escapeCSV(gift.receivedAt),
      ].join(",")
    );
  }

  // Summary line
  lines.push("");
  lines.push("SUMMARY");
  const totalDiamonds = gifts.reduce(
    (sum, g) => sum + (g.diamondCount ?? 0) * g.repeatCount,
    0
  );
  lines.push(`Total Requests,${requests.length}`);
  lines.push(`Total Gifts,${gifts.length}`);
  lines.push(`Total Diamonds,${totalDiamonds}`);

  // Trigger download
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────── Gifts Tab ─────────────── */

function GiftsList({ gifts }: { gifts: GiftEvent[] }) {
  if (gifts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No gifts yet
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {gifts.map((gift, i) => (
        <GiftRow key={gift.id} gift={gift} index={i} />
      ))}
    </div>
  );
}

function GiftRow({ gift, index }: { gift: GiftEvent; index: number }) {
  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg min-h-[44px] animate-gift-flash"
      style={{ animationDelay: `${Math.min(index * 50, 250)}ms`, animationFillMode: "backwards" }}
    >
      <div className="w-10 h-10 bg-[hsl(var(--tiktok-pink)/0.1)] rounded flex items-center justify-center shrink-0">
        <Gift className="w-5 h-5 text-[hsl(var(--tiktok-pink))]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-sm">
          {gift.giftName ?? `Gift #${gift.giftId}`}{" "}
          {gift.repeatCount > 1 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-[hsl(var(--tiktok-pink)/0.15)] text-[hsl(var(--tiktok-pink))]">
              ×{gift.repeatCount}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          @{gift.viewerUsername}
        </p>
      </div>
      {gift.diamondCount != null && (
        <span className="text-sm font-mono-display text-[hsl(var(--tiktok-cyan))] shrink-0">
          💎 {gift.diamondCount}
        </span>
      )}
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
    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg min-h-[44px]">
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
