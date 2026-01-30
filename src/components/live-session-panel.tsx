"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBackendWS, type QueueItem } from "@/hooks/use-backend-ws";
import { Loader2, Music, Trash2, Wifi, WifiOff } from "lucide-react";

export function LiveSessionPanel() {
  const {
    session,
    queue,
    isConnected,
    isConnecting,
    error,
    startSession,
    endSession,
    removeFromQueue,
  } = useBackendWS();

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

      {/* Queue */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Queue ({queue.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No requests yet.
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((item) => (
                <QueueItemRow
                  key={item.id}
                  item={item}
                  onRemove={() => removeFromQueue(item.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
