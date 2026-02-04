import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ============ NextAuth Required Tables ============

export const users = sqliteTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email"),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  tiktokUsername: text("tiktok_username"),
});

export const accounts = sqliteTable("account", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<AdapterAccountType>().notNull(),
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

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

// ============ Custom Tables ============

export const liveSessions = sqliteTable("live_session", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  tiktokUsername: text("tiktok_username").notNull(),
  status: text("status", { enum: ["active", "ended"] }).default("active").notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
});

export const queueItems = sqliteTable("queue_item", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  liveSessionId: text("live_session_id").notNull().references(() => liveSessions.id, { onDelete: "cascade" }),
  viewerUsername: text("viewer_username"),
  spotifyTrackId: text("spotify_track_id").notNull(),
  trackTitle: text("track_title").notNull(),
  trackArtist: text("track_artist").notNull(),
  status: text("status", { enum: ["queued", "playing", "played", "skipped", "revoked"] }).default("queued").notNull(),
  position: integer("position").notNull(),
  requestedAt: integer("requested_at", { mode: "timestamp_ms" }).notNull(),
});
