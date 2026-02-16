import { pgTable, text, timestamp, integer, primaryKey, jsonb, index } from "drizzle-orm/pg-core";

// ============ NextAuth Tables (must match frontend) ============

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email"),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  tiktokUsername: text("tiktok_username"),
});

export const accounts = pgTable("account", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (account) => ({
  compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
}));

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// ============ Custom Tables ============

export const liveSessions = pgTable("live_session", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  tiktokUsername: text("tiktok_username").notNull(),
  status: text("status", { enum: ["active", "ended"] }).default("active").notNull(),
  startedAt: timestamp("started_at", { mode: "date" }).notNull(),
  endedAt: timestamp("ended_at", { mode: "date" }),
});

export const queueItems = pgTable("queue_item", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  liveSessionId: text("live_session_id").notNull().references(() => liveSessions.id, { onDelete: "cascade" }),
  viewerUsername: text("viewer_username"),
  spotifyTrackId: text("spotify_track_id").notNull(),
  trackTitle: text("track_title").notNull(),
  trackArtist: text("track_artist").notNull(),
  status: text("status", { enum: ["queued", "playing", "played", "skipped", "revoked"] }).default("queued").notNull(),
  position: integer("position").notNull(),
  requestedAt: timestamp("requested_at", { mode: "date" }).notNull(),
});

// ============ Song Request Logging Tables ============

export const songRequests = pgTable("song_request", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  liveSessionId: text("live_session_id").notNull().references(() => liveSessions.id, { onDelete: "cascade" }),
  viewerUsername: text("viewer_username").notNull(),
  rawMessage: text("raw_message").notNull(),
  parsedQuery: text("parsed_query").notNull(),
  spotifyTrackId: text("spotify_track_id"),
  trackName: text("track_name"),
  trackArtist: text("track_artist"),
  albumName: text("album_name"),
  albumImageUrl: text("album_image_url"),
  durationMs: integer("duration_ms"),
  spotifyUri: text("spotify_uri"),
  searchStatus: text("search_status", {
    enum: ["pending", "matched", "not_found", "error", "rate_limited"],
  }).default("pending").notNull(),
  playStatus: text("play_status", {
    enum: ["pending", "confirmed", "not_played"],
  }).default("pending").notNull(),
  requestedAt: timestamp("requested_at", { mode: "date" }).notNull(),
  matchedAt: timestamp("matched_at", { mode: "date" }),
  confirmedAt: timestamp("confirmed_at", { mode: "date" }),
}, (table) => ({
  sessionIdx: index("song_request_session_idx").on(table.liveSessionId),
  sessionTrackIdx: index("song_request_session_track_idx").on(table.liveSessionId, table.spotifyTrackId),
  dedupIdx: index("song_request_dedup_idx").on(table.liveSessionId, table.viewerUsername, table.parsedQuery),
}));

export const giftEvents = pgTable("gift_event", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  liveSessionId: text("live_session_id").notNull().references(() => liveSessions.id, { onDelete: "cascade" }),
  viewerUsername: text("viewer_username").notNull(),
  giftId: integer("gift_id").notNull(),
  giftName: text("gift_name"),
  diamondCount: integer("diamond_count"),
  repeatCount: integer("repeat_count").default(1).notNull(),
  receivedAt: timestamp("received_at", { mode: "date" }).notNull(),
}, (table) => ({
  sessionIdx: index("gift_event_session_idx").on(table.liveSessionId),
}));

export const tiktokRawEvents = pgTable("tiktok_raw_event", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  liveSessionId: text("live_session_id").notNull().references(() => liveSessions.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  viewerUsername: text("viewer_username"),
  payload: jsonb("payload"),
  receivedAt: timestamp("received_at", { mode: "date" }).notNull(),
}, (table) => ({
  sessionIdx: index("tiktok_raw_event_session_idx").on(table.liveSessionId),
  sessionEventIdx: index("tiktok_raw_event_session_event_idx").on(table.liveSessionId, table.eventType),
}));

// Types
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type LiveSession = typeof liveSessions.$inferSelect;
export type QueueItem = typeof queueItems.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type SongRequest = typeof songRequests.$inferSelect;
export type GiftEvent = typeof giftEvents.$inferSelect;
export type TikTokRawEvent = typeof tiktokRawEvents.$inferSelect;
