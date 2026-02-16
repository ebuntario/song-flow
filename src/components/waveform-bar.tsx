"use client";

/**
 * WaveformBar — Signature visual element.
 * A 4px-tall bar at the top of the viewport that pulses with session state.
 *
 * States:
 * - idle:   slow sine-wave opacity breathing (3s cycle)
 * - active: faster pulse (1s cycle), spotify-green glow
 * - busy:   rapid heartbeat (0.5s), triggered when request rate >3/min
 * - ended:  flat-line fade to 0 over 2s
 */

type WaveformState = "idle" | "active" | "busy" | "ended";

const stateStyles: Record<WaveformState, string> = {
  idle: "bg-[hsl(var(--muted-foreground))] opacity-30",
  active: "bg-[hsl(var(--spotify-green))] shadow-[0_0_12px_hsl(var(--spotify-green)/0.5)]",
  busy: "bg-[hsl(var(--status-pending))] shadow-[0_0_12px_hsl(var(--status-pending)/0.5)]",
  ended: "bg-[hsl(var(--muted-foreground))] opacity-0",
};

const stateDurations: Record<WaveformState, string> = {
  idle: "3s",
  active: "1s",
  busy: "0.5s",
  ended: "2s",
};

export function WaveformBar({ state = "idle" }: { state?: WaveformState }) {
  return (
    <div
      className="sticky top-0 z-50 w-full h-1 overflow-hidden"
      role="presentation"
      aria-hidden="true"
    >
      <div
        className={`h-full w-full transition-all duration-500 ${stateStyles[state]}`}
        style={{
          animation:
            state === "ended"
              ? "none"
              : `pulse-wave ${stateDurations[state]} ease-in-out infinite`,
          transformOrigin: "center",
        }}
      />
    </div>
  );
}
