export type Command =
  | { type: "play"; query: string }
  | { type: "revoke" }
  | { type: "skip" };

export function parseCommand(message: string): Command | null {
  const trimmed = message.trim();

  // !play Song - Artist
  const playMatch = trimmed.match(/^!play\s+(.+)$/i);
  if (playMatch) return { type: "play", query: playMatch[1].trim() };

  // !revoke
  if (/^!revoke$/i.test(trimmed)) return { type: "revoke" };

  // !skip
  if (/^!skip$/i.test(trimmed)) return { type: "skip" };

  return null;
}
