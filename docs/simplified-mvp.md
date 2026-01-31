# SongFlow: Simplified Local-First MVP

A minimal-configuration approach that works completely locally, with easy
migration to cloud services later.

---

## Overview

**Timeline:** 4–5 weeks\
**Philosophy:** Start simple, migrate later\
**Goal:** Working local demo with minimal config

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │  Dashboard  │  │  Login Page  │  │  Auth (NextAuth)  │   │
│  └──────┬──────┘  └──────────────┘  └───────────────────┘   │
│         │ WebSocket                                          │
└─────────┼───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Bun + Elysia)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │  TikTok WS  │  │  Spotify API │  │  Session Manager  │   │
│  │  Listener   │  │  Integration │  │  + Rate Limiter   │   │
│  └──────┬──────┘  └──────────────┘  └───────────────────┘   │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               PostgreSQL (Neon)                      │    │
│  │   users, sessions, accounts, live_sessions, queue    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Core

| Component | Technology              | Status |
| --------- | ----------------------- | ------ |
| Frontend  | Next.js 14 (App Router) | ✅     |
| Backend   | **Bun + Elysia**        | ✅     |
| Database  | PostgreSQL (Neon)       | ✅     |
| ORM       | Drizzle ORM             | ✅     |
| Auth      | NextAuth.js v5          | ✅     |
| WebSocket | Elysia WS + pub/sub     | ✅     |
| TikTok    | tiktok-live-connector   | ✅     |

### UI

| Component  | Technology   | Status |
| ---------- | ------------ | ------ |
| Styling    | Tailwind CSS | ✅     |
| Components | shadcn/ui    | ✅     |
| Icons      | Lucide React | ✅     |
| Theme      | Dark mode    | ✅     |

---

## Project Structure

```
song-flow/
├── src/                              # Frontend (Next.js)
│   ├── app/
│   │   ├── dashboard/page.tsx        # Main dashboard
│   │   ├── login/page.tsx            # Login page
│   │   └── api/
│   │       ├── auth/[...nextauth]/   # NextAuth routes
│   │       └── test-auth/login/      # E2E test auth
│   ├── components/
│   │   ├── live-session-panel.tsx    # WebSocket-powered session UI
│   │   └── ui/                       # shadcn components
│   ├── hooks/
│   │   └── use-backend-ws.ts         # Backend WebSocket hook
│   ├── lib/
│   │   ├── db/                       # SQLite (local dev fallback)
│   │   ├── tiktok/parser.ts          # Command parser
│   │   └── spotify/client.ts         # Spotify token helper
│   └── auth.ts                       # NextAuth config
│
├── backend/                          # Backend (Bun + Elysia)
│   ├── src/
│   │   ├── index.ts                  # Main app + routes + WS
│   │   ├── db/
│   │   │   ├── schema.ts             # PostgreSQL schema
│   │   │   ├── client.ts             # Drizzle client
│   │   │   └── queries.ts            # Reusable queries
│   │   ├── services/
│   │   │   ├── auth.ts               # Session validation
│   │   │   ├── tiktok.ts             # TikTok listener manager
│   │   │   └── spotify.ts            # Spotify API wrapper
│   │   └── lib/
│   │       ├── parser.ts             # Command parser
│   │       └── rate-limit.ts         # In-memory rate limiter
│   ├── Dockerfile                    # Railway deployment
│   └── package.json
│
├── e2e/                              # Playwright E2E tests
├── docs/                             # Documentation
└── package.json
```

---

## Configuration

### Frontend (.env.local)

```bash
AUTH_SECRET=your_secret
AUTH_TIKTOK_ID=your_tiktok_client_id
AUTH_TIKTOK_SECRET=your_tiktok_secret
AUTH_SPOTIFY_ID=your_spotify_client_id
AUTH_SPOTIFY_SECRET=your_spotify_secret
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### Backend (.env)

```bash
DATABASE_URL=postgresql://...
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
FRONTEND_URL=http://localhost:3000
PORT=4000
```

---

## Phase Breakdown

### Phase 1: Foundation (Completed ✅)

- [x] Initialize Next.js 14
- [x] Setup Drizzle + SQLite (frontend)
- [x] Configure NextAuth.js v5
- [x] TikTok + Spotify OAuth providers
- [x] shadcn/ui + dark theme
- [x] Login and Dashboard pages

### Phase 2: Backend Service (Completed ✅)

- [x] Bun + Elysia backend setup
- [x] PostgreSQL schema + Drizzle
- [x] Auth service (session validation)
- [x] TikTok service (persistent WebSocket connections)
- [x] Spotify service (token refresh, search)
- [x] Session routes (start/stop)
- [x] Queue routes (get/remove)
- [x] WebSocket gateway for real-time updates
- [x] Rate limiting
- [x] Graceful shutdown + session recovery

### Phase 3: Frontend Integration (Completed ✅)

- [x] WebSocket hook (`useBackendWS`)
- [x] LiveSessionPanel component
- [x] Real-time queue updates
- [x] Connection status indicator

### Phase 4: Testing (Completed ✅)

- [x] Unit tests (Vitest): 31/31 passing
- [x] E2E tests (Playwright): 22/22 passing
- [x] Test auth endpoint for E2E

### Phase 5: Deploy (Completed ✅)

- [x] Deploy backend to Railway (Bun + Elysia)
- [x] Configure production environment variables
- [x] Deploy frontend to Vercel
- [x] Setup Neon PostgreSQL for production
- [x] Pre-commit hooks (Husky + lint-staged)
- [ ] Domain setup (optional)
- [ ] Beta testing (upcoming)

---

## Tests

```bash
# Unit tests
npm run test

# E2E tests
TEST_MODE=true npm run test:e2e
```

---

## Updates

- **Jan 30 2026**: Completed Week 1 foundation. Decided to persist queue state
  in SQLite instead of in-memory Map for better resilience during development
  restarts.

- **Jan 31 2026**: Major architecture pivot to Bun + Elysia backend after design
  review. Implemented complete backend service with TikTok WebSocket listener,
  Spotify integration, session management, and real-time updates. Frontend now
  connects via WebSocket for live queue updates. All tests passing (31 unit + 22
  E2E).

- **Jan 31 2026**: Production deployment complete! Backend deployed to Railway
  (Bun + Elysia via Dockerfile), frontend to Vercel, database to Neon
  PostgreSQL. Added conditional database connection (SQLite for dev, Neon for
  prod). Set up pre-commit hooks with Husky + lint-staged for ESLint
  enforcement.
