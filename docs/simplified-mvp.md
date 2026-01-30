# SongFlow: Simplified Local-First MVP

A minimal-configuration approach that works completely locally, with easy
migration to cloud services later.

---

## Overview

**Timeline:** 4–5 weeks\
**Philosophy:** Start simple, migrate later\
**Goal:** Working local demo with minimal config

---

## Key Benefits

| Aspect           | Original Plan           | Simplified MVP      |
| ---------------- | ----------------------- | ------------------- |
| **Backend**      | Separate NestJS         | Next.js API routes  |
| **Database**     | Neon PostgreSQL         | SQLite (local file) |
| **Cache**        | Redis                   | In-memory (Map)     |
| **Config**       | Multiple cloud services | Just OAuth keys     |
| **Local dev**    | Docker + cloud          | Just `pnpm dev`     |
| **Time to demo** | 5 weeks                 | 2 weeks             |

---

## Tech Stack

### Core

| Component | Technology                  | Migration Path           |
| --------- | --------------------------- | ------------------------ |
| Framework | Next.js 14 (App Router)     | Same                     |
| ORM       | **Drizzle ORM**             | Same schema → PostgreSQL |
| Database  | **SQLite** (better-sqlite3) | → Neon PostgreSQL        |
| Auth      | **NextAuth.js v5**          | Same                     |
| WebSocket | Socket.io                   | Same                     |
| State     | In-memory (Map)             | → Redis                  |

### UI

| Component  | Technology   |
| ---------- | ------------ |
| Styling    | Tailwind CSS |
| Components | shadcn/ui    |
| Icons      | Lucide React |
| Theme      | Dark mode    |

---

## Project Structure

```
song-flow/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── callback/
│   │       ├── tiktok/page.tsx
│   │       └── spotify/page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx
│   │   ├── dashboard/[sessionId]/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── settings/page.tsx
│   ├── overlay/[sessionId]/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── sessions/route.ts
│   │   ├── sessions/[id]/route.ts
│   │   ├── spotify/search/route.ts
│   │   └── spotify/queue/route.ts
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/                       # shadcn/ui
│   ├── dashboard/
│   ├── overlay/
│   └── auth/
│
├── lib/
│   ├── db/
│   │   ├── index.ts              # Drizzle client
│   │   ├── schema.ts             # Drizzle schema
│   │   └── migrations/
│   ├── state.ts                  # In-memory state
│   ├── tiktok/
│   │   ├── client.ts
│   │   └── parser.ts
│   ├── spotify/
│   │   ├── client.ts
│   │   └── auth.ts
│   └── websocket/
│       └── server.ts
│
├── drizzle.config.ts
├── .env.example
└── package.json
```

---

## Minimal Configuration

### .env.example

```bash
# Only OAuth credentials needed!

# TikTok OAuth
TIKTOK_CLIENT_ID=
TIKTOK_CLIENT_SECRET=

# Spotify OAuth
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

# NextAuth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# Database (optional - defaults to SQLite)
# DATABASE_URL=file:./dev.db

# Redis (optional - uses in-memory if not set)
# REDIS_URL=
```

### Local Development

```bash
pnpm install
pnpm dev
# That's it! No Docker, no cloud.
```

---

## Drizzle Schema (SQLite → PostgreSQL)

```typescript
// lib/db/schema.ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    tiktokUserId: text("tiktok_user_id").unique().notNull(),
    tiktokDisplayName: text("tiktok_display_name").notNull(),
    email: text("email"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const spotifyAccounts = sqliteTable("spotify_accounts", {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id).notNull(),
    spotifyUserId: text("spotify_user_id").unique().notNull(),
    refreshToken: text("refresh_token").notNull(),
    accessToken: text("access_token"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const liveSessions = sqliteTable("live_sessions", {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id).notNull(),
    tiktokLiveId: text("tiktok_live_id").notNull(),
    spotifyAccountId: text("spotify_account_id").references(() =>
        spotifyAccounts.id
    ).notNull(),
    status: text("status").default("pending").notNull(),
    config: text("config", { mode: "json" }),
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    endedAt: integer("ended_at", { mode: "timestamp" }),
});

export const songRequests = sqliteTable("song_requests", {
    id: text("id").primaryKey(),
    liveSessionId: text("live_session_id").references(() => liveSessions.id)
        .notNull(),
    viewerTiktokId: text("viewer_tiktok_id"),
    viewerDisplayName: text("viewer_display_name"),
    spotifyTrackId: text("spotify_track_id").notNull(),
    trackTitle: text("track_title").notNull(),
    trackArtist: text("track_artist").notNull(),
    status: text("status").default("queued").notNull(),
    isVip: integer("is_vip", { mode: "boolean" }).default(false),
    requestedAt: integer("requested_at", { mode: "timestamp" }).notNull(),
});
```

**Migration to PostgreSQL:** Change import + connection string.

---

## In-Memory State (Replace Redis)

```typescript
// lib/state.ts
import type { SessionMetadata, SongRequest } from "./types";

interface RateLimitState {
    count: number;
    lastRequestAt: number;
}

// In-memory stores
const sessionQueues = new Map<string, SongRequest[]>();
const sessionMetadata = new Map<string, SessionMetadata>();
const rateLimits = new Map<string, RateLimitState>();

export const state = {
    // Queue operations
    getQueue: (sessionId: string): SongRequest[] => {
        return sessionQueues.get(sessionId) ?? [];
    },

    addToQueue: (sessionId: string, request: SongRequest): void => {
        const queue = sessionQueues.get(sessionId) ?? [];
        queue.push(request);
        sessionQueues.set(sessionId, queue);
    },

    removeFromQueue: (sessionId: string, requestId: string): void => {
        const queue = sessionQueues.get(sessionId) ?? [];
        const filtered = queue.filter((r) => r.id !== requestId);
        sessionQueues.set(sessionId, filtered);
    },

    popQueue: (sessionId: string): SongRequest | undefined => {
        const queue = sessionQueues.get(sessionId) ?? [];
        return queue.shift();
    },

    // Metadata
    getMetadata: (sessionId: string): SessionMetadata | undefined => {
        return sessionMetadata.get(sessionId);
    },

    setMetadata: (sessionId: string, metadata: SessionMetadata): void => {
        sessionMetadata.set(sessionId, metadata);
    },

    // Rate limiting
    checkRateLimit: (
        viewerId: string,
        sessionId: string,
        cooldownMs = 60000,
    ): boolean => {
        const key = `${viewerId}:${sessionId}`;
        const state = rateLimits.get(key);

        if (!state) {
            rateLimits.set(key, { count: 1, lastRequestAt: Date.now() });
            return true; // allowed
        }

        const elapsed = Date.now() - state.lastRequestAt;
        if (elapsed < cooldownMs) {
            return false; // rate limited
        }

        state.count++;
        state.lastRequestAt = Date.now();
        return true;
    },

    // Cleanup
    clearSession: (sessionId: string): void => {
        sessionQueues.delete(sessionId);
        sessionMetadata.delete(sessionId);
        // Clear rate limits for this session
        for (const key of rateLimits.keys()) {
            if (key.endsWith(`:${sessionId}`)) {
                rateLimits.delete(key);
            }
        }
    },
};
```

---

## Phase Breakdown

### Phase 1: Local MVP (2 weeks)

**Week 1: Foundation + Auth**

- [ ] Initialize Next.js 14
- [ ] Setup Drizzle + SQLite
- [ ] Configure NextAuth.js
- [ ] TikTok OAuth provider
- [ ] Spotify OAuth + token storage
- [ ] shadcn/ui + dark theme
- [ ] Basic layout

**Week 2: Core Features**

- [ ] Session management
- [ ] TikTok Live chat listener
- [ ] Command parser (!lagu, !song)
- [ ] Spotify search + queue
- [ ] In-memory queue state
- [ ] Basic rate limiting

### Phase 2: Dashboard + Overlay (2 weeks)

**Week 3: Dashboard**

- [ ] Dashboard page
- [ ] Now Playing widget
- [ ] Queue list
- [ ] Request settings
- [ ] WebSocket integration

**Week 4: Overlay + Polish**

- [ ] Overlay page
- [ ] Real-time updates
- [ ] Settings page
- [ ] Error handling
- [ ] Mobile responsive

### Phase 3: Deploy (1 week)

**Week 5: Production**

- [ ] Migrate SQLite → Neon
- [ ] Deploy to Vercel
- [ ] Domain setup
- [ ] Landing page
- [ ] Beta testers

---

## Migration Guide

### SQLite → Neon PostgreSQL

1. **Create Neon project** at https://neon.tech

2. **Update schema imports:**

```typescript
// Before (SQLite)
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// After (PostgreSQL)
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
```

3. **Update drizzle.config.ts:**

```typescript
export default {
    schema: "./lib/db/schema.ts",
    out: "./lib/db/migrations",
    driver: "pg", // was 'better-sqlite'
    dbCredentials: {
        connectionString: process.env.DATABASE_URL!,
    },
};
```

4. **Update .env:**

```bash
DATABASE_URL=postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb
```

5. **Push schema:**

```bash
pnpm drizzle-kit push
```

### In-Memory → Redis

1. **Add Redis client:**

```bash
pnpm add ioredis
```

2. **Update state.ts** to use Redis commands instead of Map operations.

---

## Success Criteria

- [ ] Local demo working in 2 weeks
- [ ] Zero cloud config for development
- [ ] Smooth migration to Neon
- [ ] 20+ beta testers
- [ ] < 2s request latency

---

## When to Use This Approach

✅ **Use simplified MVP if:**

- Solo developer
- Want fast iteration
- Need working demo quickly
- Limited cloud budget initially

❌ **Use full architecture if:**

- Team of 2+ developers
- Need production-ready from day 1
- High scale expected immediately
- Have DevOps resources

---

## Reference

- [Full Development Plan](./development-progress.md)
- [PRD](./prd-tikfinity-clone.md)
- [TAD](./songflow-tad-part1.md)
- [UX Guidelines](../ux-guidelines.md)

---

_Last Updated: January 30, 2026_
