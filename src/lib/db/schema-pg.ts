import { pgTable, text, timestamp, primaryKey, integer } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ============ NextAuth Required Tables ============

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email"),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable("account", {
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
