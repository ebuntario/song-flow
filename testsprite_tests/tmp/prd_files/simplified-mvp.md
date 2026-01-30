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
├── src/                          # Source code
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   └── auth/[...nextauth]/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/               # shadcn/ui
│   │   └── ui/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts          # Drizzle client
│   │   │   └── schema.ts         # Drizzle schema
│   │   ├── tiktok/
│   │   │   ├── listener.ts
│   │   │   └── parser.ts
│   │   └── spotify/
│   │       └── client.ts
│   ├── auth.ts                   # Auth.js config
│   └── types/
│       └── next-auth.d.ts
├── docs/                         # Documentation
├── drizzle.config.ts
├── .env.example
└── package.json
```

---

## Minimal Configuration

### .env.local

```bash
# Auth.js
AUTH_SECRET=

# TikTok OAuth
AUTH_TIKTOK_ID=
AUTH_TIKTOK_SECRET=

# Spotify OAuth
AUTH_SPOTIFY_ID=
AUTH_SPOTIFY_SECRET=
```

### Local Development

```bash
pnpm install
pnpm dev
```

---

## Phase Breakdown

### Phase 1: Local MVP (2 weeks)

**Week 1: Foundation + Auth (Completed ✅)**

- [x] Initialize Next.js 14
- [x] Setup Drizzle + SQLite
- [x] Configure NextAuth.js (v5)
- [x] TikTok OAuth provider
- [x] Spotify OAuth + token storage
- [x] shadcn/ui + dark theme
- [x] Basic layout (Login, Dashboard)

**Week 2: Core Features (In Progress 🟡)**

- [ ] Session management (Start/Stop)
- [ ] TikTok Live chat listener (websocket)
- [ ] Command parser (!play, !revoke, !skip)
- [ ] Spotify search + queue connection
- [ ] Real-time queue updates

### Phase 2: Dashboard + Overlay (2 weeks)

**Week 3: Dashboard**

- [ ] Now Playing widget
- [ ] Queue list UI
- [ ] Request settings
- [ ] WebSocket integration

**Week 4: Overlay + Polish**

- [ ] Overlay page (OBS)
- [ ] Real-time sync
- [ ] Settings page
- [ ] Error handling
- [ ] Mobile responsive

### Phase 3: Deploy (1 week)

**Week 5: Production**

- [ ] Migrate SQLite → Neon
- [ ] Deploy to Vercel
- [ ] Domain setup
- [ ] Beta testers

---

## Updates

- **Jan 30 2026**: Completed Week 1 foundation. Decided to persist queue state
  in SQLite instead of in-memory Map for better resilience during development
  restarts. All UI components installed. Login and Dashboard pages created.
