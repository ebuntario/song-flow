# Technical Architecture Document (TAD)
## SongFlow: TikTok Song Requests Platform

**Document Type:** Technical Architecture & Design Document  
**Project Name:** SongFlow (TikTok Song Requests Platform)  
**Version:** 1.0  
**Last Updated:** January 30, 2026  
**Author:** Engineering Team  
**Status:** Design Phase  
**Companion Document:** Product Requirements Document (PRD) v1.0

---

## Document Purpose & Scope

This Technical Architecture Document (TAD) defines the complete technical design, architecture decisions, implementation patterns, and engineering guidelines for SongFlow. It serves as the authoritative reference for the engineering team during implementation.

**Target Audience:**
- Backend Engineers
- Frontend Engineers
- DevOps Engineers
- QA Engineers
- Security Engineers
- Technical Leadership

**Scope:**
- System architecture and component design
- Technology stack justification and trade-offs
- Data models and flow diagrams
- API contracts and interface specifications
- Security architecture and threat model
- Performance and scalability requirements
- Deployment and infrastructure design
- Monitoring and observability strategy

**Out of Scope:**
- Product requirements and user stories (see PRD)
- Project management and timelines (see PRD)
- Business model and pricing (see PRD)
- Marketing and GTM strategy (see PRD)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Principles](#2-architecture-principles)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [Component Architecture](#5-component-architecture)
6. [Data Architecture](#6-data-architecture)
7. [API Design](#7-api-design)
8. [Real-Time Communication](#8-real-time-communication)
9. [External Service Integration](#9-external-service-integration)
10. [Security Architecture](#10-security-architecture)
11. [Performance & Scalability](#11-performance--scalability)
12. [Infrastructure & Deployment](#12-infrastructure--deployment)
13. [Monitoring & Observability](#13-monitoring--observability)
14. [Development Guidelines](#14-development-guidelines)
15. [Testing Strategy](#15-testing-strategy)
16. [Disaster Recovery](#16-disaster-recovery)
17. [Migration & Rollout](#17-migration--rollout)
18. [Appendices](#18-appendices)

---

## 1. Executive Summary

### 1.1 System Overview

SongFlow is a **real-time event-driven middleware platform** that bridges TikTok Live chat with Spotify Web API, enabling viewers to request songs during live streams. The system must handle:

- **Concurrent connections:** 1,000+ simultaneous streamers (Month 6 target)
- **Real-time latency:** <2 seconds from chat message to dashboard update
- **Request throughput:** 50+ requests/second during peak (5,000 DAS × 50 req/session / 3600s)
- **Uptime requirement:** 99.5% (Month 6), 99.9% (Month 12)

### 1.2 Key Technical Challenges

| Challenge | Solution Approach |
|-----------|------------------|
| **Real-time bidirectional communication** | WebSocket architecture with fallback polling |
| **TikTok Live chat integration** | Unofficial WebSocket library with reconnection logic |
| **Spotify token management** | Encrypted storage, automatic refresh, graceful degradation |
| **Rate limiting at scale** | Redis-based distributed rate limiting |
| **State consistency** | Redis as source of truth for session state, PostgreSQL for persistence |
| **Horizontal scalability** | Stateless backend services, sticky sessions for WebSocket |
| **Security** | OAuth2 flows, JWT authentication, encrypted PII, CORS, CSP |

### 1.3 Architecture Style

**Microservices-lite** (modular monolith with clear service boundaries):
- Start with monolithic NestJS application with well-defined modules
- Each module is independently deployable as a microservice if needed
- Shared infrastructure (PostgreSQL, Redis) with connection pooling
- Clear API contracts between modules (internal + external)

**Rationale:** Faster initial development, lower operational complexity, easy to split later if traffic demands.

---

## 2. Architecture Principles

### 2.1 Core Principles

1. **Resilience First**
   - Graceful degradation when external services fail
   - Circuit breakers for TikTok/Spotify APIs
   - Automatic reconnection for WebSocket
   - Fallback mechanisms (polling when WebSocket unavailable)

2. **Stateless Services**
   - Backend services hold no session state (stored in Redis)
   - Horizontal scaling without session affinity (except WebSocket)
   - Easy rollout and rollback

3. **Data Sovereignty**
   - User data stored in Singapore region (closest to Indonesia)
   - Compliance with Indonesia PDP law
   - Encrypted PII at rest (Spotify tokens, emails)

4. **Observable by Default**
   - Structured logging (JSON format)
   - Distributed tracing (OpenTelemetry)
   - Metrics for every critical path
   - Real-time alerting for SLA violations

5. **Security in Depth**
   - OAuth2 for third-party auth
   - JWT for internal auth
   - HTTPS/WSS only
   - Input validation at every boundary
   - Rate limiting at multiple layers

6. **Developer Experience**
   - TypeScript end-to-end (type safety)
   - Auto-generated API documentation (Swagger)
   - Local development with Docker Compose
   - Hot reload for frontend and backend
   - Pre-commit hooks for linting and tests

### 2.2 Technology Selection Criteria

When choosing technologies, prioritize:
1. **Team expertise** (Node.js/TypeScript/React)
2. **Community support** (large ecosystem, active maintenance)
3. **Production readiness** (battle-tested, not bleeding edge)
4. **Operational simplicity** (managed services preferred)
5. **Cost efficiency** (serverless where appropriate)

### 2.3 Trade-offs & Decisions

| Decision | Alternative Considered | Rationale |
|----------|----------------------|-----------|
| **Monolithic NestJS** | Microservices from day 1 | Faster initial development; split later if needed |
| **PostgreSQL** | MongoDB, DynamoDB | Relational data model fits use case; JSONB for flexibility |
| **Redis** | Memcached, DynamoDB | Rich data structures (lists, sets); pub/sub for WebSocket |
| **Socket.io** | Native WebSocket, Server-Sent Events | Automatic fallback, room management, reconnection logic |
| **Google Cloud** | AWS, Azure | Singapore region, Cloud Run serverless, KMS for encryption |
| **Vercel** | Self-hosted Next.js | Zero-config deployment, edge network, automatic scaling |

---

## 3. System Architecture Overview

### 3.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐       ┌─────────────────┐                        │
│  │  TikTok API     │       │  Spotify API    │                        │
│  │  (OAuth + Live) │       │  (OAuth + Web)  │                        │
│  └────────┬────────┘       └────────┬────────┘                        │
│           │                         │                                  │
└───────────┼─────────────────────────┼──────────────────────────────────┘
            │                         │
            │                         │
┌───────────▼─────────────────────────▼──────────────────────────────────┐
│                          SONGFLOW BACKEND                               │
│                      (Node.js / NestJS / TypeScript)                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    API GATEWAY / ROUTER                       │    │
│  │              (Rate Limiting, Auth, CORS, Logging)             │    │
│  └───────┬───────────────────────┬──────────────────────────────┘    │
│          │                       │                                     │
│  ┌───────▼────────┐  ┌──────────▼─────────┐  ┌──────────────────┐   │
│  │  Auth Module   │  │  Session Module    │  │  Spotify Module  │   │
│  │  - TikTok      │  │  - Start/End       │  │  - Search        │   │
│  │  - Spotify     │  │  - Config          │  │  - Queue         │   │
│  │  - JWT         │  │  - State           │  │  - Token Refresh │   │
│  └────────────────┘  └────────────────────┘  └──────────────────┘   │
│                                                                         │
│  ┌────────────────┐  ┌─────────────────────┐  ┌──────────────────┐  │
│  │ TikTok Module  │  │  Request Module     │  │  Analytics       │  │
│  │ - Chat Listen  │  │  - Parse Command    │  │  - Metrics       │  │
│  │ - Reconnect    │  │  - Rate Limit       │  │  - Insights      │  │
│  │ - Gift Events  │  │  - Queue Mgmt       │  │  - Export        │  │
│  └────────────────┘  └─────────────────────┘  └──────────────────┘  │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                   WebSocket Gateway                             │  │
│  │             (Socket.io / Sticky Sessions / Rooms)               │  │
│  │  - Dashboard connections (streamer control)                     │  │
│  │  - Overlay connections (browser source)                         │  │
│  │  - Pub/Sub for multi-instance coordination (Redis)              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────┬───────────────────────────┬───────────────────────────────┘
              │                           │
              │                           │
    ┌─────────▼────────┐      ┌──────────▼──────────┐
    │   PostgreSQL 15  │      │     Redis 7         │
    │   (Primary DB)   │      │  (Session State,    │
    │   - Users        │      │   Cache, Queue,     │
    │   - Sessions     │      │   Rate Limit,       │
    │   - Requests     │      │   Pub/Sub)          │
    │   - Analytics    │      │                     │
    └──────────────────┘      └─────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                          SONGFLOW FRONTEND                              │
│                      (Next.js 14 / React 18 / TypeScript)               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                     App Router (Next.js)                      │    │
│  └───────┬───────────────────────┬──────────────────────────────┘    │
│          │                       │                                     │
│  ┌───────▼────────┐  ┌──────────▼─────────┐  ┌──────────────────┐   │
│  │  Auth Pages    │  │  Dashboard Pages   │  │  Overlay Page    │   │
│  │  /login        │  │  /dashboard        │  │  /overlay/[id]   │   │
│  │  /callback     │  │  /analytics        │  │  (Public)        │   │
│  └────────────────┘  │  /settings         │  └──────────────────┘   │
│                      └────────────────────┘                           │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                  State Management Layer                         │  │
│  │  - TanStack Query (server state)                                │  │
│  │  - Zustand (client state, optional)                             │  │
│  │  - WebSocket hooks (real-time sync)                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    UI Component Library                         │  │
│  │  - Tailwind CSS (styling)                                       │  │
│  │  - Lucide React (icons)                                         │  │
│  │  - React Hook Form + Zod (forms)                                │  │
│  │  - Recharts (analytics)                                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE & MONITORING                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ Google Cloud │  │   Vercel     │  │   DataDog    │                │
│  │ - Cloud Run  │  │ - Frontend   │  │ - Logs       │                │
│  │ - Cloud SQL  │  │ - Edge Cache │  │ - Metrics    │                │
│  │ - Memorystore│  │ - Auto-scale │  │ - Traces     │                │
│  │ - Cloud KMS  │  └──────────────┘  │ - Alerts     │                │
│  │ - Cloud Armor│                     └──────────────┘                │
│  └──────────────┘                                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Interaction Flow

#### 3.2.1 Song Request Happy Path (End-to-End)

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Viewer   │      │ TikTok   │      │ SongFlow │      │ Spotify  │      │ Streamer │
│ (Chat)   │      │ Live WS  │      │ Backend  │      │ API      │      │ (Browser)│
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │                 │                 │
     │ !lagu shape of you                │                 │                 │
     ├────────────────>│                 │                 │                 │
     │                 │                 │                 │                 │
     │                 │ Comment Event   │                 │                 │
     │                 ├────────────────>│                 │                 │
     │                 │                 │                 │                 │
     │                 │                 │ Parse Command   │                 │
     │                 │                 │ Extract "shape of you"            │
     │                 │                 │                 │                 │
     │                 │                 │ Check Rate Limit (Redis)          │
     │                 │                 │ ✓ OK            │                 │
     │                 │                 │                 │                 │
     │                 │                 │ GET /v1/search?q=shape+of+you&market=ID
     │                 │                 ├────────────────>│                 │
     │                 │                 │                 │                 │
     │                 │                 │ 200 OK          │                 │
     │                 │                 │ {tracks: [...]} │                 │
     │                 │                 │<────────────────┤                 │
     │                 │                 │                 │                 │
     │                 │                 │ Select top result: 4cOdK2wGLETK... │
     │                 │                 │                 │                 │
     │                 │                 │ POST /v1/me/player/queue          │
     │                 │                 │ Authorization: Bearer {token}     │
     │                 │                 ├────────────────>│                 │
     │                 │                 │                 │                 │
     │                 │                 │ 204 No Content  │                 │
     │                 │                 │<────────────────┤                 │
     │                 │                 │                 │                 │
     │                 │                 │ Update Redis:   │                 │
     │                 │                 │ session:abc:queue.push(track)     │
     │                 │                 │                 │                 │
     │                 │                 │ Save to PostgreSQL:               │
     │                 │                 │ INSERT INTO song_requests (...)   │
     │                 │                 │                 │                 │
     │                 │                 │ Emit WebSocket: │                 │
     │                 │                 │ QUEUE_UPDATED   │                 │
     │                 │                 ├─────────────────┼────────────────>│
     │                 │                 │                 │                 │
     │                 │                 │                 │   Dashboard updates
     │                 │                 │                 │   Shows: "Next: Shape of You (by @viewer)"
     │                 │                 │                 │                 │
     │                 │                 │                 │ Overlay updates │
     │                 │                 │                 │ (via separate WebSocket)
     │                 │                 │                 │                 │
     └─────────────────┴─────────────────┴─────────────────┴─────────────────┘

Total latency: ~1–2 seconds (300ms TikTok, 200ms Spotify search, 100ms queue, 400ms WebSocket)
```

#### 3.2.2 Session Start Flow

```
1. Streamer opens dashboard → Frontend loads
2. Frontend: Check if authenticated (JWT in cookie)
   ├─ No JWT → Redirect to /login
   └─ Valid JWT → Continue
3. Frontend: Fetch user data (GET /api/users/me)
4. Backend: Verify JWT, return user + connected accounts
5. Frontend: Display onboarding if no Spotify connected
   ├─ User clicks "Connect Spotify"
   ├─ Redirect to Spotify OAuth
   ├─ User approves
   └─ Callback: Backend stores refresh_token (encrypted)
6. User clicks "Start Session"
7. Frontend: POST /api/sessions/start {tiktokLiveUrl, config}
8. Backend:
   ├─ Validate TikTok Live URL
   ├─ Check if Spotify device is active (GET /v1/me/player)
   ├─ Create live_sessions record in PostgreSQL
   ├─ Initialize Redis: session:{id}:metadata, session:{id}:queue
   ├─ Connect to TikTok Live WebSocket (using library)
   └─ Return sessionId
9. Frontend: Redirect to /dashboard/{sessionId}
10. Frontend: Establish WebSocket connection (wss://api.songflow.id/ws/{sessionId}/dashboard)
11. Backend: Authenticate WebSocket (JWT), join room
12. Dashboard now live: Receives real-time updates
```

### 3.3 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW LAYERS                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 1: EVENT INGESTION                                          │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ TikTok Live Events → TikTok Module → Event Parser         │   │
│  │ - Chat comments                                            │   │
│  │ - Gift events                                              │   │
│  │ - Viewer join/leave                                        │   │
│  └───────────────────────┬───────────────────────────────────┘   │
│                          │                                         │
│  Layer 2: BUSINESS LOGIC                                           │
│  ┌───────────────────────▼───────────────────────────────────┐   │
│  │ Request Module → Validation → Rate Limiting (Redis)       │   │
│  │                → Content Filter                            │   │
│  │                → VIP Priority                              │   │
│  │                → Spotify Search                            │   │
│  │                → Queue Management                          │   │
│  └───────────────────────┬───────────────────────────────────┘   │
│                          │                                         │
│  Layer 3: PERSISTENCE                                              │
│  ┌───────────────────────▼───────────────────────────────────┐   │
│  │ Redis (hot path - immediate state)                        │   │
│  │  - session:{id}:queue (list)                              │   │
│  │  - session:{id}:metadata (hash)                           │   │
│  │  - viewer:{id}:requests:{session} (hash + TTL)            │   │
│  │                                                            │   │
│  │ PostgreSQL (cold path - audit & analytics)                │   │
│  │  - song_requests (INSERT on queue)                        │   │
│  │  - session_analytics (UPDATE on completion)               │   │
│  └───────────────────────┬───────────────────────────────────┘   │
│                          │                                         │
│  Layer 4: EXTERNAL ACTIONS                                         │
│  ┌───────────────────────▼───────────────────────────────────┐   │
│  │ Spotify API Call → POST /v1/me/player/queue               │   │
│  │                 → Update track status in Redis             │   │
│  └───────────────────────┬───────────────────────────────────┘   │
│                          │                                         │
│  Layer 5: REAL-TIME BROADCAST                                      │
│  ┌───────────────────────▼───────────────────────────────────┐   │
│  │ WebSocket Gateway → Emit to room (sessionId)              │   │
│  │  - QUEUE_UPDATED event → Dashboard clients                │   │
│  │  - QUEUE_UPDATED event → Overlay clients                  │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Read paths:
- Dashboard load: PostgreSQL (session config) + Redis (live queue)
- Analytics: PostgreSQL (aggregated queries)
- Rate limit check: Redis (O(1) lookup)

Write paths:
- Song request: Redis (immediate) → PostgreSQL (async, via Bull queue)
- Session end: Redis (clear state) → PostgreSQL (UPDATE ended_at)
```

---

## 4. Technology Stack

### 4.1 Backend Stack

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Runtime** | Node.js | 20 LTS | Non-blocking I/O, large ecosystem, team expertise |
| **Framework** | NestJS | 10.x | Modular architecture, TypeScript, built-in DI, decorators |
| **Language** | TypeScript | 5.x | Type safety, better DX, refactoring confidence |
| **Database** | PostgreSQL | 15 | ACID guarantees, JSONB flexibility, mature ecosystem |
| **Cache/State** | Redis | 7.x | Rich data structures, pub/sub, atomic operations |
| **Message Queue** | Bull | 4.x | Redis-backed, job scheduling, retry logic |
| **WebSocket** | Socket.io | 4.x | Auto-reconnect, room management, fallback to polling |
| **ORM** | TypeORM | 0.3.x | TypeScript-first, migrations, repository pattern |
| **Validation** | class-validator + class-transformer | Latest | Decorator-based validation, aligns with NestJS |
| **Auth** | Passport.js + JWT | Latest | OAuth2 strategies, JWT middleware |
| **HTTP Client** | Axios | 1.x | Interceptors for token refresh, retry logic |
| **Logging** | Winston | 3.x | Structured JSON logging, multiple transports |
| **Testing** | Jest + Supertest | Latest | Unit + integration tests, mocking |

### 4.2 Frontend Stack

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Framework** | Next.js | 14.x (App Router) | SSR, API routes, file-based routing, optimizations |
| **Library** | React | 18.x | Team expertise, large ecosystem, concurrent features |
| **Language** | TypeScript | 5.x | Type safety across frontend/backend |
| **Styling** | Tailwind CSS | 3.x | Utility-first, fast iteration, small bundle |
| **State (Server)** | TanStack Query (React Query) | 5.x | Server state management, caching, optimistic updates |
| **State (Client)** | Zustand | 4.x (optional) | Lightweight, minimal boilerplate |
| **Forms** | React Hook Form | 7.x | Performance (uncontrolled), easy validation |
| **Validation** | Zod | 3.x | TypeScript schema validation, type inference |
| **WebSocket** | Socket.io-client | 4.x | Matches backend, automatic reconnection |
| **Charts** | Recharts | 2.x | Lightweight, composable, good for analytics |
| **Icons** | Lucide React | Latest | Consistent icon set, tree-shakable |
| **Testing** | Vitest + Testing Library | Latest | Fast, Vite-based, React Testing Library |

### 4.3 Infrastructure Stack

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Hosting (Backend)** | Google Cloud Run | Serverless, auto-scaling, pay-per-use, Singapore region |
| **Hosting (Frontend)** | Vercel | Optimal Next.js support, edge network, automatic scaling |
| **Database** | Google Cloud SQL (PostgreSQL) | Managed, automatic backups, read replicas |
| **Cache** | Google Cloud Memorystore (Redis) | Managed, high availability, VPC-only access |
| **Secrets** | Google Cloud Secret Manager | Encrypted storage, IAM integration |
| **Encryption** | Google Cloud KMS | Hardware-backed encryption for PII |
| **CDN** | Vercel Edge Network | Automatic for frontend; CloudFlare for overlay |
| **DDoS Protection** | Google Cloud Armor | WAF, rate limiting, geo-blocking |
| **Monitoring** | DataDog | APM, logs, metrics, traces, alerting |
| **Error Tracking** | Sentry | Error tracking, release tracking, performance monitoring |
| **CI/CD** | GitHub Actions | Native GitHub integration, free for public repos |

### 4.4 Development Tools

| Tool | Purpose |
|------|---------|
| **Docker + Docker Compose** | Local development environment |
| **Postman / Insomnia** | API testing |
| **k6 / Artillery** | Load testing |
| **ESLint + Prettier** | Code linting and formatting |
| **Husky** | Pre-commit hooks |
| **Commitlint** | Conventional commit messages |
| **TypeDoc** | API documentation generation |
| **Swagger / OpenAPI** | REST API documentation |

---

## 5. Component Architecture

### 5.1 Backend Module Structure (NestJS)

```
src/
├── main.ts                      # Application entry point
├── app.module.ts                # Root module
│
├── common/                      # Shared utilities
│   ├── decorators/              # Custom decorators
│   ├── filters/                 # Exception filters
│   ├── guards/                  # Auth guards
│   ├── interceptors/            # Logging, transform interceptors
│   ├── pipes/                   # Validation pipes
│   └── middleware/              # Request middleware
│
├── config/                      # Configuration
│   ├── database.config.ts
│   ├── redis.config.ts
│   ├── jwt.config.ts
│   └── env.validation.ts        # Environment variable schema
│
├── modules/
│   │
│   ├── auth/                    # Authentication module
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts   # /auth/tiktok/login, /auth/spotify/connect
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── tiktok.strategy.ts
│   │   │   ├── spotify.strategy.ts
│   │   │   └── jwt.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── token.dto.ts
│   │
│   ├── users/                   # User management
│   │   ├── users.module.ts
│   │   ├── users.controller.ts  # GET /users/me, PATCH /users/me
│   │   ├── users.service.ts
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │   └── spotify-account.entity.ts
│   │   └── dto/
│   │       └── update-user.dto.ts
│   │
│   ├── sessions/                # Live session management
│   │   ├── sessions.module.ts
│   │   ├── sessions.controller.ts  # POST /sessions/start, GET /sessions/{id}
│   │   ├── sessions.service.ts
│   │   ├── sessions.gateway.ts     # WebSocket gateway
│   │   ├── entities/
│   │   │   └── live-session.entity.ts
│   │   └── dto/
│   │       ├── start-session.dto.ts
│   │       └── session-config.dto.ts
│   │
│   ├── tiktok/                  # TikTok integration
│   │   ├── tiktok.module.ts
│   │   ├── tiktok.service.ts
│   │   ├── tiktok-listener.service.ts  # WebSocket to TikTok Live
│   │   ├── parsers/
│   │   │   ├── command.parser.ts       # Parse !lagu, !song
│   │   │   └── gift.parser.ts
│   │   └── dto/
│   │       ├── comment-event.dto.ts
│   │       └── gift-event.dto.ts
│   │
│   ├── spotify/                 # Spotify integration
│   │   ├── spotify.module.ts
│   │   ├── spotify.controller.ts   # GET /spotify/search, POST /spotify/queue
│   │   ├── spotify.service.ts
│   │   ├── spotify-auth.service.ts  # Token refresh logic
│   │   ├── spotify-player.service.ts
│   │   └── dto/
│   │       ├── search-track.dto.ts
│   │       └── queue-track.dto.ts
│   │
│   ├── requests/                # Song request processing
│   │   ├── requests.module.ts
│   │   ├── requests.controller.ts  # POST /sessions/{id}/requests (internal)
│   │   ├── requests.service.ts
│   │   ├── queue-manager.service.ts
│   │   ├── rate-limiter.service.ts
│   │   ├── content-filter.service.ts
│   │   ├── entities/
│   │   │   └── song-request.entity.ts
│   │   └── dto/
│   │       ├── create-request.dto.ts
│   │       └── request-status.dto.ts
│   │
│   ├── analytics/               # Analytics & reporting
│   │   ├── analytics.module.ts
│   │   ├── analytics.controller.ts  # GET /sessions/{id}/analytics
│   │   ├── analytics.service.ts
│   │   ├── entities/
│   │   │   └── session-analytics.entity.ts
│   │   └── dto/
│   │       └── analytics-response.dto.ts
│   │
│   └── health/                  # Health checks
│       ├── health.module.ts
│       ├── health.controller.ts     # GET /health
│       └── indicators/
│           ├── database.indicator.ts
│           ├── redis.indicator.ts
│           └── spotify.indicator.ts
│
└── database/
    ├── migrations/              # TypeORM migrations
    └── seeds/                   # Test data seeds
```

### 5.2 Frontend Structure (Next.js App Router)

```
app/
├── (auth)/                      # Auth route group
│   ├── login/
│   │   └── page.tsx             # /login
│   ├── callback/
│   │   ├── tiktok/
│   │   │   └── page.tsx         # /callback/tiktok
│   │   └── spotify/
│   │       └── page.tsx         # /callback/spotify
│   └── layout.tsx               # Auth layout (centered)
│
├── (dashboard)/                 # Dashboard route group (auth required)
│   ├── dashboard/
│   │   └── page.tsx             # /dashboard (session list)
│   ├── dashboard/[sessionId]/
│   │   └── page.tsx             # /dashboard/{sessionId} (live controls)
│   ├── analytics/
│   │   └── page.tsx             # /analytics (historical)
│   ├── settings/
│   │   └── page.tsx             # /settings (account settings)
│   └── layout.tsx               # Dashboard layout (sidebar + header)
│
├── overlay/
│   └── [sessionId]/
│       └── page.tsx             # /overlay/{sessionId} (public, no auth)
│
├── api/                         # API routes (Next.js backend)
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.ts         # NextAuth.js handlers (optional)
│   └── revalidate/
│       └── route.ts             # Revalidation webhook
│
├── layout.tsx                   # Root layout
├── page.tsx                     # Landing page (/)
├── error.tsx                    # Error boundary
├── loading.tsx                  # Loading UI
└── not-found.tsx                # 404 page

components/
├── auth/
│   ├── LoginButton.tsx
│   └── SpotifyConnectButton.tsx
│
├── dashboard/
│   ├── LiveSessionCard.tsx
│   ├── NowPlaying.tsx
│   ├── QueueList.tsx
│   ├── RequestSettings.tsx
│   └── TopRequesters.tsx
│
├── overlay/
│   ├── OverlayCompact.tsx
│   ├── OverlayWide.tsx
│   └── OverlayVertical.tsx
│
├── analytics/
│   ├── SessionSummary.tsx
│   ├── TopSongsChart.tsx
│   └── EngagementGraph.tsx
│
└── ui/                          # Reusable UI components
    ├── Button.tsx
    ├── Card.tsx
    ├── Input.tsx
    ├── Select.tsx
    └── Modal.tsx

hooks/
├── useWebSocket.ts              # WebSocket connection hook
├── useSession.ts                # Session data hook
├── useQueue.ts                  # Queue management hook
├── useAuth.ts                   # Auth state hook
└── useAnalytics.ts              # Analytics data hook

lib/
├── api-client.ts                # Axios instance with interceptors
├── websocket-client.ts          # Socket.io client wrapper
├── utils.ts                     # Utility functions
└── constants.ts                 # App constants

types/
├── session.ts                   # Session types
├── request.ts                   # Request types
├── user.ts                      # User types
└── websocket.ts                 # WebSocket event types
```

### 5.3 Module Interaction Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         MODULE DEPENDENCIES                          │
└──────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   Auth Module       │
                    │ - TikTok OAuth      │
                    │ - Spotify OAuth     │
                    │ - JWT Strategy      │
                    └──────────┬──────────┘
                               │ provides JWT
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ Users Module  │      │Sessions Module│◄─────┤TikTok Module  │
│ - Profile     │      │ - Start/End   │      │ - Chat Listen │
│ - Settings    │      │ - WebSocket   │      │ - Events      │
└───────┬───────┘      └───────┬───────┘      └───────────────┘
        │                      │
        │                      │ creates session
        │                      │
        │              ┌───────▼───────┐
        │              │Request Module │
        │              │ - Parse       │◄──────────┐
        │              │ - Rate Limit  │           │
        │              │ - Queue Mgmt  │           │
        │              └───────┬───────┘           │
        │                      │                   │
        │                      │ calls          ┌──┴────────────┐
        │                      │                │Spotify Module │
        │                      └───────────────►│ - Search      │
        │                                       │ - Queue       │
        │                                       │ - Token Mgmt  │
        │                                       └───────────────┘
        │
        │
        └──────────────────────┬───────────────────────┐
                               │                       │
                       ┌───────▼───────┐       ┌──────▼──────┐
                       │Analytics Module│       │Health Module│
                       │ - Metrics      │       │ - Readiness │
                       │ - Insights     │       │ - Liveness  │
                       └────────────────┘       └─────────────┘

Shared Dependencies (all modules):
- Common utilities (decorators, guards, filters)
- Database connection (TypeORM)
- Redis connection
- Logger (Winston)
```

---

## 6. Data Architecture

### 6.1 Database Design (PostgreSQL)

#### 6.1.1 Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                     POSTGRESQL SCHEMA (ER Diagram)                   │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│      users          │
├─────────────────────┤
│ id (PK, UUID)       │
│ tiktok_user_id      │◄────────┐
│ tiktok_display_name │         │
│ email               │         │
│ locale              │         │
│ profile_image_url   │         │
│ created_at          │         │
│ updated_at          │         │
│ deleted_at          │         │
└──────┬──────────────┘         │
       │ 1                      │
       │                        │
       │ N                      │
       ▼                        │
┌─────────────────────┐         │
│ spotify_accounts    │         │
├─────────────────────┤         │
│ id (PK, UUID)       │         │
│ user_id (FK)        │─────────┘
│ spotify_user_id     │
│ refresh_token       │  ◄── ENCRYPTED
│ access_token        │
│ scopes[]            │
│ product_type        │  (premium/free)
│ created_at          │
│ updated_at          │
└──────┬──────────────┘
       │ 1
       │
       │ N
       ▼
┌─────────────────────┐
│   live_sessions     │
├─────────────────────┤
│ id (PK, UUID)       │
│ user_id (FK)        │◄────────┐
│ tiktok_live_id      │         │
│ spotify_account_id  │─────────┤
│ status              │         │
│ config (JSONB)      │         │
│ started_at          │         │
│ ended_at            │         │
│ created_at          │         │
└──────┬──────────────┘         │
       │ 1                      │
       │                        │
       │ N                      │
       ▼                        │
┌─────────────────────┐         │
│   song_requests     │         │
├─────────────────────┤         │
│ id (PK, UUID)       │         │
│ live_session_id(FK) │─────────┘
│ viewer_tiktok_id    │
│ viewer_display_name │
│ spotify_track_id    │
│ track_title         │
│ track_artist        │
│ track_image_url     │
│ status              │  (queued/playing/skipped/completed/rejected)
│ rejection_reason    │
│ position_in_queue   │
│ is_vip              │
│ requested_at        │
│ queued_at           │
│ started_playing_at  │
│ completed_at        │
└─────────────────────┘


┌─────────────────────┐
│      viewers        │
├─────────────────────┤
│ id (PK, UUID)       │
│ tiktok_user_id      │  ◄── UNIQUE
│ display_name        │
│ follower_count      │
│ is_banned           │
│ created_at          │
│ updated_at          │
└─────────────────────┘


┌─────────────────────┐         ┌─────────────────────┐
│ session_analytics   │         │ rate_limit_state    │
├─────────────────────┤         ├─────────────────────┤
│ id (PK, UUID)       │         │ id (PK, UUID)       │
│ live_session_id(FK) │         │ live_session_id(FK) │
│ total_requests      │         │ viewer_tiktok_id    │
│ unique_requesters   │         │ request_count       │
│ peak_concurrent_req │         │ last_request_at     │
│ estimated_peak_view │         │ expires_at          │  ◄── TTL
│ avg_req_per_minute  │         └─────────────────────┘
│ created_at          │         (Composite PK: live_session_id + viewer_tiktok_id)
└─────────────────────┘
```

#### 6.1.2 Table Definitions with Constraints

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_user_id BIGINT UNIQUE NOT NULL,
  tiktok_display_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  locale VARCHAR(10) DEFAULT 'id' NOT NULL,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT users_locale_valid CHECK (locale IN ('id', 'en', 'ms', 'th', 'vi'))
);

CREATE INDEX idx_users_tiktok_id ON users(tiktok_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- Spotify accounts table
CREATE TABLE spotify_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spotify_user_id VARCHAR(255) UNIQUE NOT NULL,
  refresh_token TEXT NOT NULL, -- Encrypted via application layer
  access_token TEXT,
  scopes TEXT[] NOT NULL,
  product_type VARCHAR(50) CHECK (product_type IN ('premium', 'free')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  CONSTRAINT spotify_accounts_user_unique UNIQUE (user_id, spotify_user_id)
);

CREATE INDEX idx_spotify_accounts_user_id ON spotify_accounts(user_id);
CREATE INDEX idx_spotify_accounts_spotify_id ON spotify_accounts(spotify_user_id);

-- Live sessions table
CREATE TABLE live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tiktok_live_id VARCHAR(255) NOT NULL,
  spotify_account_id UUID NOT NULL REFERENCES spotify_accounts(id) ON DELETE RESTRICT,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'active', 'paused', 'ended', 'error')),
  config JSONB DEFAULT '{}' NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  CONSTRAINT live_sessions_ended_after_start CHECK (ended_at IS NULL OR ended_at > started_at)
);

CREATE INDEX idx_live_sessions_user_id ON live_sessions(user_id);
CREATE INDEX idx_live_sessions_status ON live_sessions(status) WHERE status IN ('active', 'paused');
CREATE INDEX idx_live_sessions_started_at ON live_sessions(started_at DESC);

-- Song requests table
CREATE TABLE song_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  viewer_tiktok_id BIGINT,
  viewer_display_name VARCHAR(255),
  spotify_track_id VARCHAR(255) NOT NULL,
  track_title VARCHAR(500) NOT NULL,
  track_artist VARCHAR(500) NOT NULL,
  track_image_url TEXT,
  status VARCHAR(50) DEFAULT 'queued' NOT NULL CHECK (status IN ('queued', 'playing', 'skipped', 'completed', 'rejected')),
  rejection_reason VARCHAR(500),
  position_in_queue INT,
  is_vip BOOLEAN DEFAULT FALSE NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  queued_at TIMESTAMP WITH TIME ZONE,
  started_playing_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT song_requests_position_positive CHECK (position_in_queue IS NULL OR position_in_queue >= 0)
);

CREATE INDEX idx_song_requests_live_session_id ON song_requests(live_session_id);
CREATE INDEX idx_song_requests_status ON song_requests(status);
CREATE INDEX idx_song_requests_requested_at ON song_requests(requested_at DESC);
CREATE INDEX idx_song_requests_viewer_id ON song_requests(viewer_tiktok_id);

-- Viewers table (for tracking across sessions)
CREATE TABLE viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_user_id BIGINT UNIQUE NOT NULL,
  display_name VARCHAR(255),
  follower_count INT DEFAULT 0,
  is_banned BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_viewers_tiktok_id ON viewers(tiktok_user_id);
CREATE INDEX idx_viewers_banned ON viewers(is_banned) WHERE is_banned = TRUE;

-- Session analytics table
CREATE TABLE session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  total_requests INT DEFAULT 0 NOT NULL,
  unique_requesters INT DEFAULT 0 NOT NULL,
  peak_concurrent_requests INT DEFAULT 0 NOT NULL,
  estimated_peak_viewers INT DEFAULT 0 NOT NULL,
  avg_requests_per_minute DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  CONSTRAINT session_analytics_unique_session UNIQUE (live_session_id)
);

CREATE INDEX idx_session_analytics_session_id ON session_analytics(live_session_id);

-- Rate limiting state table (short-lived, per session)
CREATE TABLE rate_limit_state (
  live_session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  viewer_tiktok_id BIGINT NOT NULL,
  request_count INT DEFAULT 0 NOT NULL,
  last_request_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  PRIMARY KEY (live_session_id, viewer_tiktok_id)
);

CREATE INDEX idx_rate_limit_state_expires_at ON rate_limit_state(expires_at);

-- Automatic cleanup of expired rate limit records
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_state WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_spotify_accounts
BEFORE UPDATE ON spotify_accounts
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_viewers
BEFORE UPDATE ON viewers
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
```

#### 6.1.3 JSONB Config Schema (live_sessions.config)

```typescript
interface SessionConfig {
  // Request settings
  requests: {
    enabled: boolean;                    // Toggle requests on/off
    maxPerUser: number;                  // Max requests per user per session (default: 5)
    cooldownSeconds: number;             // Seconds between requests (default: 60)
    maxQueueSize: number;                // Max total queue size (default: 100)
    maxSongDurationMinutes: number;      // Reject songs longer than X min (default: 10)
  };
  
  // Content filtering
  content: {
    allowExplicit: boolean;              // Allow explicit tracks (default: true)
    bannedWords: string[];               // Words to reject (default: [])
    bannedViewers: string[];             // TikTok usernames to ban (default: [])
  };
  
  // VIP / prioritization
  vip: {
    enabled: boolean;                    // Enable VIP queue jumping (default: false, premium)
    giftThreshold: number;               // Minimum gift value in Rp (default: 10000)
    vipViewers: string[];                // TikTok usernames always VIP (default: [])
  };
  
  // Viewer requirements
  requirements: {
    minFollowerCount: number | null;     // Min follower count (default: null)
    minAccountAgeDays: number | null;    // Min TikTok account age (default: null)
  };
  
  // Skip voting (premium)
  skipVoting: {
    enabled: boolean;                    // Enable viewer voting to skip (default: false)
    threshold: number;                   // Percentage of viewers needed (default: 20)
    minVotes: number;                    // Minimum absolute votes (default: 5)
  };
  
  // Greeting messages
  messages: {
    firstRequestGreeting: string | null; // Message for first-time requester (default: null)
    rejectionMessage: string | null;     // Custom rejection message (default: null)
  };
}
```

### 6.2 Redis Data Structures

#### 6.2.1 Key Naming Convention

```
Pattern: {entity}:{id}:{attribute}

Examples:
- session:abc-123:queue
- session:abc-123:metadata
- session:abc-123:current_track
- viewer:789:requests:abc-123
- session:abc-123:skip_votes
- token:spotify:user-456
```

#### 6.2.2 Data Structures by Use Case

```javascript
// ==========================================
// Session Queue (List)
// ==========================================
// Key: session:{sessionId}:queue
// Type: LIST (LPUSH for queue end, RPOP for dequeue)
// TTL: 24 hours after session end

[
  {
    "requestId": "req-uuid-1",
    "trackId": "4cOdK2wGLETKBW3PvgPWqL",
    "trackTitle": "Shape of You",
    "trackArtist": "Ed Sheeran",
    "trackImageUrl": "https://...",
    "trackDuration": 234,
    "requesterTiktokId": "123456789",
    "requesterDisplayName": "@viewer_123",
    "isVIP": false,
    "requestedAt": 1706433599,
    "position": 1
  },
  // ... more tracks
]

// Operations:
// - LPUSH session:{id}:queue {track_json}     # Add to queue
// - LRANGE session:{id}:queue 0 9             # Get next 10 tracks
// - LLEN session:{id}:queue                   # Get queue length
// - LREM session:{id}:queue 1 {track_json}    # Remove specific track
// - RPOP session:{id}:queue                   # Dequeue (when track starts)


// ==========================================
// Session Metadata (Hash)
// ==========================================
// Key: session:{sessionId}:metadata
// Type: HASH
// TTL: 24 hours after session end

{
  "status": "active",                    # active | paused | ended
  "startedAt": "1706433599",
  "tiktokLiveId": "7321234567890",
  "userId": "user-uuid",
  "spotifyAccountId": "spotify-acc-uuid",
  "estimatedViewers": "1234",            # Updated every 30 sec
  "totalRequests": "89",
  "lastRequestAt": "1706433899"
}

// Operations:
// - HSET session:{id}:metadata field value
// - HGETALL session:{id}:metadata
// - HINCRBY session:{id}:metadata totalRequests 1


// ==========================================
// Current Track (Hash)
// ==========================================
// Key: session:{sessionId}:current_track
// Type: HASH
// TTL: 24 hours after session end

{
  "trackId": "4cOdK2wGLETKBW3PvgPWqL",
  "trackTitle": "Shape of You",
  "trackArtist": "Ed Sheeran",
  "trackImageUrl": "https://...",
  "trackDuration": "234",
  "requesterTiktokId": "123456789",
  "requesterDisplayName": "@viewer_123",
  "startedAt": "1706433599",
  "currentTime": "45"                    # Updated every 5 sec (polling Spotify)
}

// Operations:
// - HSET session:{id}:current_track field value
// - HGETALL session:{id}:current_track
// - DEL session:{id}:current_track      # When track ends


// ==========================================
// Rate Limiting (Hash with TTL)
// ==========================================
// Key: viewer:{tiktokUserId}:requests:{sessionId}
// Type: HASH
// TTL: Session duration + 1 hour

{
  "count": "2",                          # Number of requests this session
  "lastRequestAt": "1706433599",         # Unix timestamp
  "cooldownUntil": "1706433659"          # Unix timestamp (lastRequestAt + cooldown)
}

// Operations:
// - HGET viewer:{id}:requests:{session} count
// - HINCRBY viewer:{id}:requests:{session} count 1
// - HSET viewer:{id}:requests:{session} lastRequestAt {timestamp}
// - EXPIRE viewer:{id}:requests:{session} 86400


// ==========================================
// Skip Votes (Set)
// ==========================================
// Key: session:{sessionId}:skip_votes
// Type: SET (ensures uniqueness)
// TTL: Until track ends

["123456789", "987654321", "555555555"]  # TikTok user IDs who voted

// Operations:
// - SADD session:{id}:skip_votes {tiktokUserId}
// - SCARD session:{id}:skip_votes              # Get vote count
// - SISMEMBER session:{id}:skip_votes {userId} # Check if already voted
// - DEL session:{id}:skip_votes                # When track changes


// ==========================================
// Spotify Token Cache (String)
// ==========================================
// Key: token:spotify:{spotifyUserId}
// Type: STRING (JSON)
// TTL: 55 minutes (tokens expire in 60 min)

{
  "accessToken": "BQD...xyz",
  "expiresAt": 1706437199,               # Unix timestamp
  "refreshedAt": 1706433599
}

// Operations:
// - SET token:spotify:{id} {json} EX 3300
// - GET token:spotify:{id}
// - DEL token:spotify:{id}               # On logout


// ==========================================
// WebSocket Room Mapping (Set)
// ==========================================
// Key: ws:session:{sessionId}:clients
// Type: SET (socket IDs)
// TTL: 24 hours after session end

["socketId-abc", "socketId-def", "socketId-ghi"]

// Operations:
// - SADD ws:session:{id}:clients {socketId}
// - SREM ws:session:{id}:clients {socketId}
// - SMEMBERS ws:session:{id}:clients           # Get all connected clients
```

#### 6.2.3 Redis Pub/Sub Channels

For WebSocket coordination across multiple backend instances:

```javascript
// Channel: session:{sessionId}:events
// Message format:
{
  "type": "QUEUE_UPDATED" | "TRACK_CHANGED" | "REQUEST_REJECTED" | "SESSION_ENDED",
  "payload": { /* event-specific data */ },
  "timestamp": 1706433599
}

// Usage:
// Instance A: PUBLISH session:abc:events '{"type":"QUEUE_UPDATED",...}'
// Instance B: Receives event, emits to connected WebSocket clients in that room
```

### 6.3 Data Flow Patterns

#### 6.3.1 Write Path (Song Request)

```
1. Chat message received → TikTok Module
2. Parse command → Request Module
3. **Check rate limit (Redis READ)**
   - GET viewer:{id}:requests:{session}
   - If cooldown active → reject
4. **Check content filter (Redis READ)**
   - SMEMBERS session:{id}:banned_viewers
   - If banned → reject
5. **Search Spotify API** (external call)
6. **Update Redis (WRITE - hot path)**
   - LPUSH session:{id}:queue {track}
   - HINCRBY session:{id}:metadata totalRequests 1
   - HINCRBY viewer:{id}:requests:{session} count 1
   - HSET viewer:{id}:requests:{session} lastRequestAt {now}
7. **Queue Spotify API call** (POST /v1/me/player/queue)
8. **Async write to PostgreSQL** (via Bull queue)
   - INSERT INTO song_requests (...)
9. **Publish WebSocket event** (Redis Pub/Sub)
   - PUBLISH session:{id}:events '{"type":"QUEUE_UPDATED",...}'
10. **WebSocket Gateway emits to clients**
    - Dashboard and overlay receive update

Total latency target: <2 seconds (mostly Spotify API)
Redis operations: <10ms combined
```

#### 6.3.2 Read Path (Dashboard Load)

```
1. User opens /dashboard/{sessionId}
2. **Fetch session config (PostgreSQL READ)**
   - SELECT * FROM live_sessions WHERE id = ?
   - SELECT * FROM spotify_accounts WHERE id = ?
3. **Fetch current state (Redis READ)**
   - HGETALL session:{id}:metadata
   - HGETALL session:{id}:current_track
   - LRANGE session:{id}:queue 0 9
4. **Establish WebSocket connection**
   - Connect to wss://api.songflow.id/ws/{sessionId}/dashboard
   - SADD ws:session:{id}:clients {socketId}
5. **Render dashboard with initial data**
6. **Subsequent updates via WebSocket** (no polling)

Total load time target: <500ms
Redis operations: <20ms combined
PostgreSQL query: <50ms
```

#### 6.3.3 Data Consistency Strategy

**Eventual consistency model:**
- Redis is source of truth for **live state** (current queue, metadata)
- PostgreSQL is source of truth for **audit trail** (all requests, analytics)
- Async reconciliation via Bull queue (Redis → PostgreSQL)

**Failure handling:**
- If PostgreSQL write fails → Log error, continue (Redis still has state)
- If Redis write fails → Rollback transaction, return error to user
- If Spotify API fails → Reject request, log, do NOT update Redis/PostgreSQL

**Recovery:**
- On backend restart: Reload active sessions from PostgreSQL
- Reconstruct Redis state from PostgreSQL (queue, metadata)
- Reconnect to TikTok Live WebSocket

---

## 7. API Design

### 7.1 RESTful API Principles

**Design principles:**
- Resource-oriented URLs (`/sessions/{id}` not `/getSession?id=`)
- HTTP verbs match intent (GET/POST/PATCH/DELETE)
- Status codes semantic (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error)
- Consistent error format (see 7.2.5)
- Versioning via URL (`/api/v1/...`)
- Idempotency for mutations (use idempotency keys for POST)

### 7.2 API Endpoints Specification

#### 7.2.1 Authentication Endpoints

```typescript
// ==========================================
// POST /api/v1/auth/tiktok/login
// ==========================================
// Description: Initiate TikTok OAuth flow
// Auth: None (public)
// Request: Empty body
// Response: Redirect to TikTok OAuth URL

302 Redirect
Location: https://www.tiktok.com/auth/authorize?client_id=...

// ==========================================
// GET /api/v1/auth/tiktok/callback
// ==========================================
// Description: Handle TikTok OAuth callback
// Auth: None (public)
// Query params: ?code={authCode}&state={state}
// Response: Set JWT cookie, redirect to dashboard

302 Redirect
Set-Cookie: jwt={token}; HttpOnly; Secure; SameSite=Strict; Max-Age=28800
Location: /dashboard

// ==========================================
// POST /api/v1/auth/spotify/connect
// ==========================================
// Description: Initiate Spotify OAuth flow
// Auth: Required (JWT)
// Request: Empty body
// Response: Redirect to Spotify OAuth URL

302 Redirect
Location: https://accounts.spotify.com/authorize?client_id=...

// ==========================================
// GET /api/v1/auth/spotify/callback
// ==========================================
// Description: Handle Spotify OAuth callback
// Auth: Required (JWT from cookie)
// Query params: ?code={authCode}&state={state}
// Response: Redirect to dashboard

302 Redirect
Location: /dashboard

// ==========================================
// POST /api/v1/auth/logout
// ==========================================
// Description: Revoke JWT, clear cookie
// Auth: Required (JWT)
// Request: Empty body
// Response: 204 No Content

204 No Content
Set-Cookie: jwt=; HttpOnly; Secure; SameSite=Strict; Max-Age=0
```

#### 7.2.2 User Endpoints

```typescript
// ==========================================
// GET /api/v1/users/me
// ==========================================
// Description: Get current user profile
// Auth: Required (JWT)
// Response: User object with connected accounts

200 OK
{
  "id": "user-uuid",
  "tiktokUserId": "123456789",
  "tiktokDisplayName": "@streamer",
  "email": "user@example.com",
  "locale": "id",
  "profileImageUrl": "https://...",
  "spotifyAccounts": [
    {
      "id": "spotify-acc-uuid",
      "spotifyUserId": "spotify-user-id",
      "productType": "premium",
      "scopes": ["user-read-playback-state", "user-modify-playback-state"],
      "createdAt": "2026-01-28T10:00:00Z"
    }
  ],
  "createdAt": "2026-01-28T10:00:00Z"
}

// ==========================================
// PATCH /api/v1/users/me
// ==========================================
// Description: Update user profile
// Auth: Required (JWT)
// Request:

{
  "email": "newemail@example.com",  // optional
  "locale": "en"                     // optional
}

// Response:

200 OK
{
  "id": "user-uuid",
  "tiktokUserId": "123456789",
  "tiktokDisplayName": "@streamer",
  "email": "newemail@example.com",
  "locale": "en",
  "profileImageUrl": "https://...",
  "updatedAt": "2026-01-30T18:49:00Z"
}
```

#### 7.2.3 Session Endpoints

```typescript
// ==========================================
// POST /api/v1/sessions/start
// ==========================================
// Description: Start a new live session
// Auth: Required (JWT)
// Request:

{
  "tiktokLiveUrl": "https://www.tiktok.com/@user/live",  // required
  "spotifyAccountId": "spotify-acc-uuid",                // required
  "config": {                                            // optional, defaults applied
    "requests": {
      "enabled": true,
      "maxPerUser": 5,
      "cooldownSeconds": 60,
      "maxQueueSize": 100,
      "maxSongDurationMinutes": 10
    },
    "content": {
      "allowExplicit": true,
      "bannedWords": [],
      "bannedViewers": []
    },
    "vip": {
      "enabled": false,
      "giftThreshold": 10000,
      "vipViewers": []
    },
    "requirements": {
      "minFollowerCount": null,
      "minAccountAgeDays": null
    },
    "skipVoting": {
      "enabled": false,
      "threshold": 20,
      "minVotes": 5
    },
    "messages": {
      "firstRequestGreeting": null,
      "rejectionMessage": null
    }
  }
}

// Response:

201 Created
{
  "id": "session-uuid",
  "userId": "user-uuid",
  "tiktokLiveId": "7321234567890",
  "spotifyAccountId": "spotify-acc-uuid",
  "status": "active",
  "config": { /* full config */ },
  "startedAt": "2026-01-30T18:49:00Z",
  "overlayUrl": "https://songflow.id/overlay/session-uuid",
  "websocketUrl": "wss://api.songflow.id/ws/session-uuid/dashboard"
}

// Error responses:
400 Bad Request - Invalid TikTok Live URL
400 Bad Request - Spotify account not found or not connected
403 Forbidden - Spotify device not active
409 Conflict - Active session already exists for this user

// ==========================================
// GET /api/v1/sessions/{sessionId}
// ==========================================
// Description: Get session details and current state
// Auth: Required (JWT, must be session owner)
// Response:

200 OK
{
  "id": "session-uuid",
  "userId": "user-uuid",
  "tiktokLiveId": "7321234567890",
  "spotifyAccountId": "spotify-acc-uuid",
  "status": "active",
  "config": { /* full config */ },
  "startedAt": "2026-01-30T18:49:00Z",
  "endedAt": null,
  "currentTrack": {
    "trackId": "4cOdK2wGLETKBW3PvgPWqL",
    "trackTitle": "Shape of You",
    "trackArtist": "Ed Sheeran",
    "trackImageUrl": "https://...",
    "trackDuration": 234,
    "requesterTiktokId": "123456789",
    "requesterDisplayName": "@viewer_123",
    "startedAt": "2026-01-30T18:50:00Z",
    "currentTime": 45
  },
  "queue": [
    {
      "requestId": "req-uuid-1",
      "trackId": "...",
      "trackTitle": "Blinding Lights",
      "trackArtist": "The Weeknd",
      "trackImageUrl": "https://...",
      "trackDuration": 200,
      "requesterTiktokId": "987654321",
      "requesterDisplayName": "@user_456",
      "isVIP": false,
      "requestedAt": "2026-01-30T18:51:00Z",
      "position": 1
    },
    // ... next tracks
  ],
  "queueLength": 45,
  "metrics": {
    "estimatedViewers": 1234,
    "totalRequests": 89,
    "uniqueRequesters": 67
  }
}

404 Not Found - Session not found
403 Forbidden - Not session owner

// ==========================================
// PATCH /api/v1/sessions/{sessionId}
// ==========================================
// Description: Update session configuration
// Auth: Required (JWT, must be session owner)
// Request: (partial config update)

{
  "config": {
    "requests": {
      "enabled": false  // Pause requests
    }
  }
}

// Response:

200 OK
{
  "id": "session-uuid",
  "config": { /* updated config */ },
  "updatedAt": "2026-01-30T19:00:00Z"
}

400 Bad Request - Invalid config
403 Forbidden - Not session owner
404 Not Found - Session not found

// ==========================================
// POST /api/v1/sessions/{sessionId}/end
// ==========================================
// Description: End active session
// Auth: Required (JWT, must be session owner)
// Request: Empty body
// Response:

200 OK
{
  "id": "session-uuid",
  "status": "ended",
  "startedAt": "2026-01-30T18:49:00Z",
  "endedAt": "2026-01-30T20:00:00Z",
  "summary": {
    "totalRequests": 123,
    "uniqueRequesters": 89,
    "peakViewers": 1456,
    "durationMinutes": 71
  }
}

403 Forbidden - Not session owner
404 Not Found - Session not found
409 Conflict - Session already ended

// ==========================================
// GET /api/v1/sessions/{sessionId}/queue
// ==========================================
// Description: Get current queue (with pagination)
// Auth: Required (JWT, must be session owner)
// Query params: ?offset=0&limit=50
// Response:

200 OK
{
  "sessionId": "session-uuid",
  "queue": [
    {
      "requestId": "req-uuid-1",
      "trackId": "...",
      "trackTitle": "Blinding Lights",
      "trackArtist": "The Weeknd",
      "trackImageUrl": "https://...",
      "trackDuration": 200,
      "requesterTiktokId": "987654321",
      "requesterDisplayName": "@user_456",
      "isVIP": false,
      "requestedAt": "2026-01-30T18:51:00Z",
      "position": 1
    },
    // ... more tracks
  ],
  "total": 45,
  "offset": 0,
  "limit": 50
}

403 Forbidden - Not session owner
404 Not Found - Session not found
```

#### 7.2.4 Song Request Endpoints

```typescript
// ==========================================
// POST /api/v1/sessions/{sessionId}/requests
// ==========================================
// Description: Submit song request (internal, called by TikTok listener)
// Auth: Required (Service-to-service token, not exposed publicly)
// Request:

{
  "viewerTiktokId": "123456789",
  "viewerDisplayName": "@viewer_123",
  "searchTerm": "shape of you",           // optional (if trackId not provided)
  "spotifyTrackId": "4cOdK2wGLETKBW3PvgPWqL",  // optional (if searchTerm not provided)
  "isVIP": false
}

// Response:

201 Created
{
  "requestId": "req-uuid-1",
  "trackId": "4cOdK2wGLETKBW3PvgPWqL",
  "trackTitle": "Shape of You",
  "trackArtist": "Ed Sheeran",
  "trackImageUrl": "https://...",
  "trackDuration": 234,
  "status": "queued",
  "position": 12,
  "queuedAt": "2026-01-30T18:51:00Z"
}

// Error responses:
400 Bad Request - Missing searchTerm and spotifyTrackId
400 Bad Request - Track not found on Spotify
429 Too Many Requests - Rate limit exceeded (viewer cooldown)
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Tunggu 45 detik sebelum request berikutnya 🕐",
  "retryAfter": 45
}
403 Forbidden - Viewer banned
{
  "error": "VIEWER_BANNED",
  "message": "Kamu tidak bisa request lagu di stream ini"
}
400 Bad Request - Explicit content not allowed
{
  "error": "EXPLICIT_CONTENT_BLOCKED",
  "message": "Lagu explicit tidak diperbolehkan"
}

// ==========================================
// DELETE /api/v1/sessions/{sessionId}/requests/{requestId}
// ==========================================
// Description: Remove request from queue
// Auth: Required (JWT, must be session owner)
// Response:

204 No Content

403 Forbidden - Not session owner
404 Not Found - Request not found or already completed
```

#### 7.2.5 Error Response Format

**All errors follow consistent format:**

```typescript
{
  "error": "ERROR_CODE",              // Machine-readable error code
  "message": "Human-readable message", // User-facing message (localized)
  "details": {                        // Optional, additional context
    "field": "fieldName",
    "constraint": "validation rule"
  },
  "timestamp": "2026-01-30T18:49:00Z",
  "path": "/api/v1/sessions/start",
  "requestId": "req-trace-uuid"       // For tracing/debugging
}
```

**Common error codes:**
- `UNAUTHORIZED` - 401
- `FORBIDDEN` - 403
- `NOT_FOUND` - 404
- `VALIDATION_ERROR` - 400
- `RATE_LIMIT_EXCEEDED` - 429
- `CONFLICT` - 409
- `INTERNAL_SERVER_ERROR` - 500
- `SERVICE_UNAVAILABLE` - 503 (external service down)

### 7.3 API Versioning Strategy

**URL versioning:** `/api/v1/...`

**Deprecation policy:**
- Support N and N-1 versions simultaneously
- Announce deprecation 3 months in advance
- Sunset N-2 after 6 months
- Return `Sunset` header on deprecated endpoints:
  ```
  Sunset: Sat, 31 Jul 2026 23:59:59 GMT
  Link: <https://docs.songflow.id/api/v2>; rel="successor-version"
  ```

---

## 8. Real-Time Communication

### 8.1 WebSocket Architecture

**Technology:** Socket.io 4.x (Server + Client)

**Why Socket.io over native WebSocket:**
- Automatic reconnection with exponential backoff
- Fallback to HTTP long-polling if WebSocket unavailable
- Room management (join/leave)
- Middleware support for authentication
- Redis adapter for multi-instance coordination

### 8.2 Connection Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WEBSOCKET CONNECTION FLOW                       │
└─────────────────────────────────────────────────────────────────────┘

Client (Dashboard/Overlay)
    │
    │ 1. HTTP Request: GET /api/v1/sessions/{sessionId}
    │    Auth: Bearer {JWT}
    ├────────────────────────────────────────────────────────>
    │                                                          Backend
    │ 2. HTTP Response: 200 OK + session data
    │<────────────────────────────────────────────────────────┤
    │
    │ 3. WebSocket Upgrade: wss://api.songflow.id/ws/{sessionId}/{clientType}
    │    Query: ?token={JWT}
    ├────────────────────────────────────────────────────────>
    │                                                         WebSocket Gateway
    │                                                              │
    │                                                              │ 4. Verify JWT
    │                                                              │ 5. Check session exists
    │                                                              │ 6. SADD ws:session:{id}:clients {socketId}
    │                                                              │ 7. JOIN room "session:{id}"
    │
    │ 8. Connection ACK + initial state
    │<────────────────────────────────────────────────────────┤
    │    Event: "CONNECTED"
    │    Payload: {sessionId, clientId, timestamp}
    │
    │ 9. Heartbeat (ping/pong every 30 seconds)
    │<───────────────────────────────────────────────────────>
    │
    │ 10. Real-time events (QUEUE_UPDATED, TRACK_CHANGED, etc.)
    │<────────────────────────────────────────────────────────┤
    │
    │ 11. Client disconnect or timeout
    │    SREM ws:session:{id}:clients {socketId}
    │    LEAVE room "session:{id}"
    │
```

### 8.3 WebSocket Events (Client ↔ Server)

#### 8.3.1 Client → Server Events

```typescript
// ==========================================
// PING (Heartbeat)
// ==========================================
// Description: Client keepalive
// Frequency: Every 30 seconds
// Payload:

{
  "type": "PING",
  "payload": {},
  "timestamp": 1706433599
}

// Server response: PONG


// ==========================================
// UPDATE_SETTINGS
// ==========================================
// Description: Update session config in real-time
// Auth: Session owner only
// Payload:

{
  "type": "UPDATE_SETTINGS",
  "payload": {
    "requests": {
      "enabled": false  // Pause requests
    }
  },
  "timestamp": 1706433599
}

// Server response: SETTINGS_UPDATED or ERROR


// ==========================================
// SKIP_TRACK
// ==========================================
// Description: Manually skip current track
// Auth: Session owner only
// Payload:

{
  "type": "SKIP_TRACK",
  "payload": {},
  "timestamp": 1706433599
}

// Server response: TRACK_CHANGED or ERROR


// ==========================================
// REORDER_QUEUE
// ==========================================
// Description: Reorder queue (drag-and-drop)
// Auth: Session owner only
// Payload:

{
  "type": "REORDER_QUEUE",
  "payload": {
    "requestIds": ["req-uuid-3", "req-uuid-1", "req-uuid-2"]  // New order
  },
  "timestamp": 1706433599
}

// Server response: QUEUE_UPDATED or ERROR


// ==========================================
// REMOVE_REQUEST
// ==========================================
// Description: Remove track from queue
// Auth: Session owner only
// Payload:

{
  "type": "REMOVE_REQUEST",
  "payload": {
    "requestId": "req-uuid-1"
  },
  "timestamp": 1706433599
}

// Server response: QUEUE_UPDATED or ERROR
```

#### 8.3.2 Server → Client Events

```typescript
// ==========================================
// CONNECTED
// ==========================================
// Description: Connection established
// Payload:

{
  "type": "CONNECTED",
  "payload": {
    "sessionId": "session-uuid",
    "clientId": "socket-abc",
    "clientType": "dashboard",  // or "overlay"
    "serverTime": 1706433599
  },
  "timestamp": 1706433599
}


// ==========================================
// PONG
// ==========================================
// Description: Response to PING
// Payload:

{
  "type": "PONG",
  "payload": {},
  "timestamp": 1706433599
}


// ==========================================
// TRACK_CHANGED
// ==========================================
// Description: Current track changed
// Frequency: When track starts playing
// Payload:

{
  "type": "TRACK_CHANGED",
  "payload": {
    "currentTrack": {
      "requestId": "req-uuid-1",
      "trackId": "4cOdK2wGLETKBW3PvgPWqL",
      "trackTitle": "Shape of You",
      "trackArtist": "Ed Sheeran",
      "trackImageUrl": "https://...",
      "trackDuration": 234,
      "requesterTiktokId": "123456789",
      "requesterDisplayName": "@viewer_123",
      "startedAt": 1706433599,
      "currentTime": 0
    },
    "previousTrackId": "prev-track-id"  // optional
  },
  "timestamp": 1706433599
}


// ==========================================
// QUEUE_UPDATED
// ==========================================
// Description: Queue changed (new request, skip, reorder, remove)
// Frequency: On queue mutation
// Payload:

{
  "type": "QUEUE_UPDATED",
  "payload": {
    "queue": [
      {
        "requestId": "req-uuid-1",
        "trackId": "...",
        "trackTitle": "Blinding Lights",
        "trackArtist": "The Weeknd",
        "trackImageUrl": "https://...",
        "trackDuration": 200,
        "requesterTiktokId": "987654321",
        "requesterDisplayName": "@user_456",
        "isVIP": false,
        "requestedAt": 1706433599,
        "position": 1
      },
      // ... next 9 tracks (limit to first 10 for performance)
    ],
    "queueLength": 45,
    "action": "ADDED" | "REMOVED" | "REORDERED"  // What changed
  },
  "timestamp": 1706433599
}


// ==========================================
// REQUEST_CONFIRMED
// ==========================================
// Description: Song request successfully queued
// Frequency: After request accepted and Spotify queued
// Payload:

{
  "type": "REQUEST_CONFIRMED",
  "payload": {
    "requestId": "req-uuid-1",
    "trackId": "4cOdK2wGLETKBW3PvgPWqL",
    "trackTitle": "Shape of You",
    "trackArtist": "Ed Sheeran",
    "requesterTiktokId": "123456789",
    "requesterDisplayName": "@viewer_123",
    "position": 12,
    "queuedAt": 1706433599
  },
  "timestamp": 1706433599
}


// ==========================================
// REQUEST_REJECTED
// ==========================================
// Description: Song request rejected (rate limit, ban, etc.)
// Frequency: When request validation fails
// Payload:

{
  "type": "REQUEST_REJECTED",
  "payload": {
    "reason": "RATE_LIMIT_EXCEEDED" | "VIEWER_BANNED" | "EXPLICIT_CONTENT_BLOCKED" | "TRACK_NOT_FOUND",
    "message": "Tunggu 45 detik sebelum request berikutnya 🕐",
    "viewerTiktokId": "123456789",
    "viewerDisplayName": "@viewer_123",
    "retryAfter": 45  // optional, for rate limits
  },
  "timestamp": 1706433599
}


// ==========================================
// SESSION_ENDED
// ==========================================
// Description: Session has ended
// Frequency: When streamer ends session or error occurs
// Payload:

{
  "type": "SESSION_ENDED",
  "payload": {
    "reason": "STREAMER_ENDED" | "TIKTOK_DISCONNECTED" | "SPOTIFY_DISCONNECTED" | "ERROR",
    "message": "Stream telah berakhir. Terima kasih sudah menonton!",
    "summary": {
      "totalRequests": 123,
      "uniqueRequesters": 89,
      "durationMinutes": 71
    }
  },
  "timestamp": 1706433599
}


// ==========================================
// VIEWER_COUNT
// ==========================================
// Description: Estimated viewer count update
// Frequency: Every 30 seconds
// Payload:

{
  "type": "VIEWER_COUNT",
  "payload": {
    "count": 1234,
    "trend": "UP" | "DOWN" | "STABLE"  // Compared to last update
  },
  "timestamp": 1706433599
}


// ==========================================
// SETTINGS_CHANGED
// ==========================================
// Description: Session config updated
// Frequency: When streamer changes settings
// Payload:

{
  "type": "SETTINGS_CHANGED",
  "payload": {
    "config": {
      "requests": {
        "enabled": false  // Changed field
      }
    },
    "updatedBy": "user-uuid"
  },
  "timestamp": 1706433599
}


// ==========================================
// ERROR
// ==========================================
// Description: WebSocket-level error
// Frequency: On validation error, auth failure, etc.
// Payload:

{
  "type": "ERROR",
  "payload": {
    "code": "UNAUTHORIZED" | "FORBIDDEN" | "INVALID_EVENT" | "RATE_LIMIT",
    "message": "Not authorized to perform this action"
  },
  "timestamp": 1706433599
}
```

### 8.4 Connection Management

#### 8.4.1 Authentication

```typescript
// Client connects with JWT in query param
const socket = io('wss://api.songflow.id', {
  path: '/ws',
  query: {
    token: 'eyJhbGciOiJIUzI1NiIs...',
    sessionId: 'session-uuid',
    clientType: 'dashboard'  // or 'overlay'
  }
});

// Server middleware verifies JWT
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  const sessionId = socket.handshake.query.sessionId;
  const clientType = socket.handshake.query.clientType;
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    socket.sessionId = sessionId;
    socket.clientType = clientType;
    
    // Verify user owns session (for dashboard) or session is public (for overlay)
    if (clientType === 'dashboard') {
      const session = await getSession(sessionId);
      if (session.userId !== decoded.userId) {
        return next(new Error('Forbidden'));
      }
    }
    
    next();
  } catch (err) {
    next(new Error('Unauthorized'));
  }
});
```

#### 8.4.2 Room Management

```typescript
// On connection
io.on('connection', async (socket) => {
  const { sessionId, clientType } = socket;
  
  // Join room for this session
  socket.join(`session:${sessionId}`);
  
  // Track client in Redis
  await redis.sadd(`ws:session:${sessionId}:clients`, socket.id);
  
  // Send initial state
  const sessionData = await getSessionState(sessionId);
  socket.emit('CONNECTED', {
    type: 'CONNECTED',
    payload: {
      sessionId,
      clientId: socket.id,
      clientType,
      initialState: sessionData,
      serverTime: Date.now()
    },
    timestamp: Date.now()
  });
  
  // Handle disconnect
  socket.on('disconnect', async () => {
    await redis.srem(`ws:session:${sessionId}:clients`, socket.id);
    socket.leave(`session:${sessionId}`);
  });
});

// Broadcasting to room
io.to(`session:${sessionId}`).emit('QUEUE_UPDATED', { /* payload */ });
```

#### 8.4.3 Reconnection Logic (Client)

```typescript
// Client-side reconnection config
const socket = io('wss://api.songflow.id', {
  path: '/ws',
  query: { /* ... */ },
  reconnection: true,
  reconnectionDelay: 1000,        // Start at 1 second
  reconnectionDelayMax: 30000,    // Max 30 seconds
  reconnectionAttempts: Infinity,  // Keep trying
  timeout: 20000                   // Connection timeout
});

// Reconnection events
socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`Reconnecting... attempt ${attemptNumber}`);
  // Show "Reconnecting..." UI
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);
  // Hide "Reconnecting..." UI
  // Refetch latest state (in case missed events)
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection failed:', error);
});

socket.on('reconnect_failed', () => {
  console.error('Reconnection failed permanently');
  // Show "Connection lost. Please refresh page." UI
});
```

#### 8.4.4 Multi-Instance Coordination

**Problem:** Multiple backend instances, WebSocket clients connected to different instances

**Solution:** Redis Pub/Sub + Socket.io Redis Adapter

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));

// Now broadcasting works across instances
// When Instance A does: io.to('session:abc').emit('QUEUE_UPDATED', ...)
// Clients connected to Instance B also receive the event
```

### 8.5 Fallback: HTTP Polling

**For clients that cannot establish WebSocket (restrictive firewalls, old browsers):**

```typescript
// Client detects fallback
if (!socket.connected) {
  // Start polling
  const pollInterval = setInterval(async () => {
    const response = await fetch(`/api/v1/sessions/${sessionId}/state`);
    const data = await response.json();
    updateUI(data);
  }, 3000);  // Poll every 3 seconds
}

// Backend endpoint
GET /api/v1/sessions/{sessionId}/state
Response:
{
  "currentTrack": { /* ... */ },
  "queue": [ /* ... */ ],
  "queueLength": 45,
  "metrics": { /* ... */ },
  "lastUpdated": 1706433599
}
```

**Performance impact:** Higher latency (3 seconds vs. <500ms), higher server load

**Mitigation:** Encourage users to use modern browsers, provide diagnostic tool

---

## 9. External Service Integration

### 9.1 TikTok Integration

#### 9.1.1 TikTok OAuth

**Flow:** Authorization Code Grant

**Endpoints:**
- Authorization URL: `https://www.tiktok.com/auth/authorize`
- Token URL: `https://open-api.tiktok.com/oauth/access_token/`

**Required scopes:**
- `user.info.basic` - Get user profile
- `video.list` - Access user videos (for analytics, optional)

**Implementation:**
```typescript
// Initiate OAuth flow
const authUrl = new URL('https://www.tiktok.com/auth/authorize');
authUrl.searchParams.append('client_key', TIKTOK_CLIENT_KEY);
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('scope', 'user.info.basic,video.list');
authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
authUrl.searchParams.append('state', generateState());  // CSRF protection

res.redirect(authUrl.toString());

// Handle callback
const { code, state } = req.query;
verifyState(state);

const tokenResponse = await axios.post('https://open-api.tiktok.com/oauth/access_token/', {
  client_key: TIKTOK_CLIENT_KEY,
  client_secret: TIKTOK_CLIENT_SECRET,
  code,
  grant_type: 'authorization_code',
  redirect_uri: REDIRECT_URI
});

const { access_token, refresh_token, open_id, expires_in } = tokenResponse.data;

// Store in database
await createUser({
  tiktokUserId: open_id,
  tiktokAccessToken: access_token,
  tiktokRefreshToken: refresh_token,
  tiktokTokenExpiresAt: Date.now() + expires_in * 1000
});
```

#### 9.1.2 TikTok Live Chat Listener

**Technology:** `tiktok-live-connector` npm library (unofficial, community-maintained)

**Why unofficial:** TikTok does not provide official Live API for third-party developers

**Implementation:**
```typescript
import { WebcastPushConnection } from 'tiktok-live-connector';

class TikTokListenerService {
  private connection: WebcastPushConnection;
  
  async connect(tiktokLiveUrl: string, sessionId: string) {
    const username = extractUsernameFromUrl(tiktokLiveUrl);
    
    this.connection = new WebcastPushConnection(username, {
      enableExtendedGiftInfo: true,
      enableWebsocketUpgrade: true,
      requestPollingIntervalMs: 1000,
      sessionId: undefined  // Let library fetch automatically
    });
    
    // Comment events
    this.connection.on('chat', (data) => {
      const { uniqueId, comment, userId } = data;
      
      // Check if comment is a song request command
      if (this.isSongRequest(comment)) {
        this.handleSongRequest({
          sessionId,
          viewerTiktokId: userId,
          viewerDisplayName: uniqueId,
          comment
        });
      }
    });
    
    // Gift events (for VIP prioritization)
    this.connection.on('gift', (data) => {
      const { uniqueId, giftId, giftName, diamondCount, userId } = data;
      
      this.handleGiftEvent({
        sessionId,
        viewerTiktokId: userId,
        viewerDisplayName: uniqueId,
        giftValue: diamondCount * 0.5  // 1 diamond ≈ Rp 0.5 (estimate)
      });
    });
    
    // Connection state
    this.connection.on('connected', () => {
      logger.info(`Connected to TikTok Live: ${username}`);
    });
    
    this.connection.on('disconnected', () => {
      logger.warn(`Disconnected from TikTok Live: ${username}`);
      this.scheduleReconnect(sessionId, tiktokLiveUrl);
    });
    
    this.connection.on('error', (err) => {
      logger.error(`TikTok Live error: ${err.message}`);
      this.handleConnectionError(sessionId, err);
    });
    
    // Connect
    await this.connection.connect();
  }
  
  private isSongRequest(comment: string): boolean {
    const lowerComment = comment.toLowerCase().trim();
    const commands = ['!lagu', '!song', '!sr', '!musik'];
    return commands.some(cmd => lowerComment.startsWith(cmd));
  }
  
  private async handleSongRequest(data: SongRequestData) {
    // Parse command
    const { searchTerm, spotifyTrackId } = this.parseCommand(data.comment);
    
    // Submit to request module (internal API)
    await this.requestService.submitRequest({
      sessionId: data.sessionId,
      viewerTiktokId: data.viewerTiktokId,
      viewerDisplayName: data.viewerDisplayName,
      searchTerm,
      spotifyTrackId,
      isVIP: false
    });
  }
  
  private parseCommand(comment: string): { searchTerm?: string; spotifyTrackId?: string } {
    const trimmed = comment.trim();
    
    // Check if Spotify URL
    const spotifyUrlMatch = trimmed.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
    if (spotifyUrlMatch) {
      return { spotifyTrackId: spotifyUrlMatch[1] };
    }
    
    // Extract search term after command
    const commandMatch = trimmed.match(/^!(lagu|song|sr|musik)\s+(.+)$/i);
    if (commandMatch) {
      return { searchTerm: commandMatch[2].trim() };
    }
    
    return {};
  }
  
  private scheduleReconnect(sessionId: string, tiktokLiveUrl: string) {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const attempt = this.reconnectAttempts.get(sessionId) || 0;
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    
    setTimeout(() => {
      this.connect(tiktokLiveUrl, sessionId);
      this.reconnectAttempts.set(sessionId, attempt + 1);
    }, delay);
  }
  
  async disconnect() {
    if (this.connection) {
      this.connection.disconnect();
    }
  }
}
```

**Error handling:**
- **Connection drops:** Auto-reconnect with exponential backoff
- **Library breaking changes:** Monitor community, maintain fork if needed
- **Rate limiting:** Implement request queuing on our side
- **TikTok changes protocol:** Fallback: Manual URL entry + polling their web API (less real-time)

#### 9.1.3 Risk Mitigation (Unofficial API)

**Risk:** TikTok may change protocol, library breaks

**Mitigation:**
1. **Monitor community:** Subscribe to library GitHub, Discord for updates
2. **Maintain fork:** Fork library, apply patches if needed
3. **Fallback mode:** If real-time fails, allow manual URL entry, scrape public web data
4. **Diversify:** Add support for Twitch/YouTube Live early (official APIs)
5. **Communication:** Transparent with users: "TikTok Live integration is experimental"

### 9.2 Spotify Integration

#### 9.2.1 Spotify OAuth

**Flow:** Authorization Code with PKCE (for security)

**Endpoints:**
- Authorization URL: `https://accounts.spotify.com/authorize`
- Token URL: `https://accounts.spotify.com/api/token`

**Required scopes:**
- `user-read-playback-state` - Read current playback
- `user-modify-playback-state` - Control playback (queue, skip)
- `user-read-currently-playing` - Read currently playing track
- `streaming` (optional) - Web Playback SDK (for browser-based player)

**Implementation:**
```typescript
// Generate code verifier and challenge (PKCE)
const codeVerifier = generateRandomString(128);
const codeChallenge = base64UrlEncode(sha256(codeVerifier));

// Store verifier in session
req.session.codeVerifier = codeVerifier;

// Initiate OAuth flow
const authUrl = new URL('https://accounts.spotify.com/authorize');
authUrl.searchParams.append('client_id', SPOTIFY_CLIENT_ID);
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
authUrl.searchParams.append('code_challenge_method', 'S256');
authUrl.searchParams.append('code_challenge', codeChallenge);
authUrl.searchParams.append('scope', 'user-read-playback-state user-modify-playback-state user-read-currently-playing');
authUrl.searchParams.append('state', generateState());

res.redirect(authUrl.toString());

// Handle callback
const { code, state } = req.query;
verifyState(state);

const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', {
  grant_type: 'authorization_code',
  code,
  redirect_uri: REDIRECT_URI,
  client_id: SPOTIFY_CLIENT_ID,
  code_verifier: req.session.codeVerifier
}, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
});

const { access_token, refresh_token, expires_in } = tokenResponse.data;

// Encrypt refresh token before storing
const encryptedRefreshToken = await encryptWithKMS(refresh_token);

await createSpotifyAccount({
  userId: req.userId,
  spotifyUserId: await getSpotifyUserId(access_token),
  refreshToken: encryptedRefreshToken,
  accessToken: access_token,  // Cache in Redis with TTL
  scopes: ['user-read-playback-state', 'user-modify-playback-state'],
  expiresAt: Date.now() + expires_in * 1000
});
```

#### 9.2.2 Token Refresh Strategy

**Challenge:** Access tokens expire in 1 hour

**Solution:** Proactive refresh + lazy refresh

```typescript
class SpotifyAuthService {
  // Cache access tokens in Redis with TTL
  private async getAccessToken(spotifyUserId: string): Promise<string> {
    // Check Redis cache
    const cachedToken = await redis.get(`token:spotify:${spotifyUserId}`);
    if (cachedToken) {
      const { accessToken, expiresAt } = JSON.parse(cachedToken);
      
      // If expires in >5 minutes, return cached
      if (expiresAt > Date.now() + 5 * 60 * 1000) {
        return accessToken;
      }
    }
    
    // Refresh token
    return this.refreshAccessToken(spotifyUserId);
  }
  
  private async refreshAccessToken(spotifyUserId: string): Promise<string> {
    // Get refresh token from database (encrypted)
    const account = await this.spotifyAccountRepo.findOne({ spotifyUserId });
    if (!account) throw new Error('Spotify account not found');
    
    // Decrypt refresh token
    const refreshToken = await decryptWithKMS(account.refreshToken);
    
    // Request new access token
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: SPOTIFY_CLIENT_ID,
      client_secret: SPOTIFY_CLIENT_SECRET
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const { access_token, expires_in } = tokenResponse.data;
    
    // Cache in Redis
    await redis.setex(
      `token:spotify:${spotifyUserId}`,
      expires_in - 300,  // TTL: expires_in - 5 minutes
      JSON.stringify({
        accessToken: access_token,
        expiresAt: Date.now() + expires_in * 1000
      })
    );
    
    // Update database (optional, for audit)
    await this.spotifyAccountRepo.update(account.id, {
      accessToken: access_token,
      updatedAt: new Date()
    });
    
    return access_token;
  }
  
  // Interceptor for Spotify API calls (auto-retry on 401)
  async callSpotifyAPI(method: string, endpoint: string, data: any, userId: string) {
    const spotifyUserId = await this.getSpotifyUserId(userId);
    let accessToken = await this.getAccessToken(spotifyUserId);
    
    try {
      return await axios({
        method,
        url: `https://api.spotify.com/v1${endpoint}`,
        headers: { Authorization: `Bearer ${accessToken}` },
        data
      });
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expired, force refresh and retry once
        accessToken = await this.refreshAccessToken(spotifyUserId);
        
        return await axios({
          method,
          url: `https://api.spotify.com/v1${endpoint}`,
          headers: { Authorization: `Bearer ${accessToken}` },
          data
        });
      }
      
      throw error;
    }
  }
}
```

#### 9.2.3 Spotify API Usage

**Key endpoints:**

```typescript
// Search tracks
GET /v1/search?q={term}&type=track&market=ID&limit=5

Response:
{
  "tracks": {
    "items": [
      {
        "id": "4cOdK2wGLETKBW3PvgPWqL",
        "name": "Shape of You",
        "artists": [{ "name": "Ed Sheeran" }],
        "album": {
          "images": [{ "url": "https://...", "height": 640, "width": 640 }]
        },
        "duration_ms": 233713,
        "explicit": false,
        "popularity": 90
      }
    ]
  }
}

// Queue track
POST /v1/me/player/queue?uri=spotify:track:{trackId}
Authorization: Bearer {accessToken}

Response:
204 No Content

Errors:
- 404 NOT FOUND: No active device
- 403 FORBIDDEN: User is not premium (for some features)
- 429 TOO MANY REQUESTS: Rate limited

// Get currently playing
GET /v1/me/player/currently-playing
Authorization: Bearer {accessToken}

Response:
{
  "item": {
    "id": "4cOdK2wGLETKBW3PvgPWqL",
    "name": "Shape of You",
    "duration_ms": 233713,
    ...
  },
  "progress_ms": 45000,
  "is_playing": true,
  "device": {
    "id": "device-id",
    "name": "Laptop Adi",
    "type": "Computer"
  }
}

// Skip to next track
POST /v1/me/player/next
Authorization: Bearer {accessToken}

Response:
204 No Content
```

**Rate limits:**
- Default: **180 requests per minute per user**
- Search: **200 requests per 30 seconds**

**Mitigation:**
- Implement client-side rate limiting (token bucket)
- Cache search results (Redis, 5-minute TTL)
- Batch operations where possible
- Exponential backoff on 429 responses

#### 9.2.4 No Active Device Handling

**Problem:** User must have Spotify open and playing on a device

**Detection:**
```typescript
// Check if device is active before queueing
const player = await spotifyService.getCurrentPlayback(userId);

if (!player || !player.device || !player.device.is_active) {
  throw new Error('NO_ACTIVE_DEVICE');
}
```

**User guidance:**
1. Show error in dashboard: "Spotify belum aktif. Buka Spotify dan mulai putar lagu."
2. Provide troubleshooting steps:
   - Open Spotify desktop/mobile app
   - Play any song
   - Return to dashboard and retry
3. Alternative: Use Web Playback SDK (browser becomes device)

#### 9.2.5 Premium vs Free Users

**Challenge:** Some Spotify features require Premium (playback control)

**Detection:**
```typescript
const userProfile = await axios.get('https://api.spotify.com/v1/me', {
  headers: { Authorization: `Bearer ${accessToken}` }
});

const productType = userProfile.data.product;  // "premium" or "free"

await spotifyAccountRepo.update(account.id, { productType });
```

**Graceful degradation:**
- **Premium:** Full functionality (queue, skip, playback control)
- **Free:** Limited functionality
  - Show requests in overlay, but user must manually play
  - Provide "suggestion mode": Display requested songs, user copies to playlist
  - Upsell: "Upgrade to Spotify Premium for full automation"

---

## 10. Security Architecture

### 10.1 Threat Model

| Threat | Impact | Likelihood | Mitigation |
|--------|--------|-----------|-----------|
| **OAuth token theft** | Critical | Medium | Encrypt refresh tokens at rest (KMS), HTTPS-only, HttpOnly cookies |
| **Session hijacking** | High | Medium | JWT with short TTL, secure cookies, IP validation |
| **SQL injection** | Critical | Low | Parameterized queries (TypeORM), input validation |
| **XSS** | High | Medium | CSP headers, escape user input, React auto-escaping |
| **CSRF** | Medium | Low | SameSite cookies, CSRF tokens for state params |
| **DDoS** | High | High | Cloud Armor, rate limiting, auto-scaling |
| **Rate limit bypass** | Medium | High | Distributed rate limiting (Redis), IP + user-level |
| **Data breach (database)** | Critical | Low | Encrypted PII, TLS connections, VPC-only access, backups encrypted |
| **Malicious song requests** | Low | High | Content filtering, viewer bans, spam detection |

### 10.2 Authentication & Authorization

#### 10.2.1 JWT Structure

```typescript
// JWT Payload
{
  "userId": "user-uuid",
  "tiktokUserId": "123456789",
  "iat": 1706433599,  // Issued at
  "exp": 1706462399   // Expires at (8 hours later)
}

// Signing (HS256)
const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });

// Verification
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  req.userId = decoded.userId;
  next();
} catch (err) {
  return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid token' });
}
```

**Token storage:**
- **Frontend:** HttpOnly cookie (XSS-safe, auto-sent with requests)
- **Cookie attributes:** `Secure; HttpOnly; SameSite=Strict; Max-Age=28800`

#### 10.2.2 Role-Based Access Control (RBAC)

```typescript
enum Role {
  STREAMER = 'streamer',  // Session owner
  VIEWER = 'viewer',      // Public viewer (overlay)
  ADMIN = 'admin'         // SongFlow admin
}

// Guard decorator (NestJS)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STREAMER)
@Patch('/sessions/:sessionId')
async updateSession(@Param('sessionId') sessionId: string, @Body() dto: UpdateSessionDto) {
  // Only session owner can update
  if (req.userId !== session.userId) {
    throw new ForbiddenException('Not session owner');
  }
  // ...
}
```

### 10.3 Data Protection

#### 10.3.1 Encryption at Rest

**Sensitive data:** Spotify refresh tokens, user emails (optional)

**Method:** Envelope encryption with Google Cloud KMS

```typescript
import { KeyManagementServiceClient } from '@google-cloud/kms';

const kmsClient = new KeyManagementServiceClient();
const keyName = 'projects/PROJECT_ID/locations/LOCATION/keyRings/KEYRING/cryptoKeys/KEY';

// Encrypt
async function encrypt(plaintext: string): Promise<string> {
  const [result] = await kmsClient.encrypt({
    name: keyName,
    plaintext: Buffer.from(plaintext)
  });
  return result.ciphertext.toString('base64');
}

// Decrypt
async function decrypt(ciphertext: string): Promise<string> {
  const [result] = await kmsClient.decrypt({
    name: keyName,
    ciphertext: Buffer.from(ciphertext, 'base64')
  });
  return result.plaintext.toString();
}

// Usage
const encryptedToken = await encrypt(spotifyRefreshToken);
await spotifyAccountRepo.save({ refreshToken: encryptedToken });

// Later
const decryptedToken = await decrypt(account.refreshToken);
```

**Database-level encryption:**
- PostgreSQL: TLS connections enforced
- Cloud SQL: Automatic encryption at rest (AES-256)
- Backups: Encrypted automatically

#### 10.3.2 Encryption in Transit

**All traffic HTTPS/WSS:**
- Frontend (Vercel): Automatic TLS 1.3
- Backend (Cloud Run): Automatic TLS 1.3
- Database: TLS-only connections (`sslmode=require`)
- Redis: TLS-only connections

**Certificate management:** Automatic (Let's Encrypt via Cloud Run/Vercel)

### 10.4 Input Validation & Sanitization

#### 10.4.1 DTO Validation (class-validator)

```typescript
import { IsString, IsInt, Min, Max, IsUrl, IsOptional } from 'class-validator';

export class StartSessionDto {
  @IsUrl()
  tiktokLiveUrl: string;
  
  @IsString()
  spotifyAccountId: string;
  
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxReqPerUser?: number;
  
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(300)
  cooldownSeconds?: number;
}

// Automatic validation in controller
@Post('/sessions/start')
async startSession(@Body() dto: StartSessionDto) {
  // If validation fails, returns 400 Bad Request automatically
  // ...
}
```

#### 10.4.2 SQL Injection Prevention

**TypeORM parameterized queries:**
```typescript
// ✅ SAFE (parameterized)
const user = await userRepo.findOne({ where: { tiktokUserId: userId } });

// ✅ SAFE (query builder)
const sessions = await sessionRepo
  .createQueryBuilder('session')
  .where('session.userId = :userId', { userId })
  .andWhere('session.status = :status', { status: 'active' })
  .getMany();

// ❌ UNSAFE (never use string interpolation)
const query = `SELECT * FROM users WHERE tiktok_user_id = '${userId}'`;  // DON'T DO THIS
```

#### 10.4.3 XSS Prevention

**React auto-escaping:**
```tsx
// ✅ SAFE (React auto-escapes)
<div>{user.displayName}</div>

// ❌ UNSAFE (bypasses escaping)
<div dangerouslySetInnerHTML={{ __html: user.bio }} />  // Only if sanitized

// Sanitization (if needed)
import DOMPurify from 'dompurify';
const cleanHtml = DOMPurify.sanitize(dirtyHtml);
```

**Content Security Policy (CSP):**
```typescript
// Set CSP headers (NestJS middleware)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://vercel.live; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' wss://api.songflow.id https://api.spotify.com; " +
    "font-src 'self' data:; " +
    "frame-ancestors 'none';"
  );
  next();
});
```

### 10.5 Rate Limiting

#### 10.5.1 Application-Level Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Global API rate limit
const apiLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 60 * 1000,  // 1 minute
  max: 100,             // 100 requests per IP per minute
  message: { error: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);

// Endpoint-specific limits
const searchLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 30 * 1000,  // 30 seconds
  max: 10,              // 10 searches per user per 30 seconds
  keyGenerator: (req) => req.userId  // Rate limit per user, not IP
});

app.use('/api/v1/spotify/search', searchLimiter);
```

#### 10.5.2 Song Request Rate Limiting

**Per-viewer, per-session:**
```typescript
async function checkRateLimit(viewerTiktokId: string, sessionId: string): Promise<boolean> {
  const key = `viewer:${viewerTiktokId}:requests:${sessionId}`;
  
  // Get current state
  const state = await redis.hgetall(key);
  const count = parseInt(state.count || '0');
  const lastRequestAt = parseInt(state.lastRequestAt || '0');
  const cooldownUntil = parseInt(state.cooldownUntil || '0');
  
  // Check cooldown
  if (Date.now() < cooldownUntil) {
    const retryAfter = Math.ceil((cooldownUntil - Date.now()) / 1000);
    throw new RateLimitError(`Tunggu ${retryAfter} detik sebelum request berikutnya`, retryAfter);
  }
  
  // Check max requests per session
  const maxReqPerUser = await getSessionConfig(sessionId, 'maxReqPerUser');
  if (count >= maxReqPerUser) {
    throw new RateLimitError('Maksimal request tercapai untuk stream ini');
  }
  
  // Update state
  const newCooldownUntil = Date.now() + (await getSessionConfig(sessionId, 'cooldownSeconds')) * 1000;
  
  await redis.hmset(key, {
    count: count + 1,
    lastRequestAt: Date.now(),
    cooldownUntil: newCooldownUntil
  });
  
  // Set TTL (session duration + 1 hour)
  await redis.expire(key, 86400);
  
  return true;
}
```

### 10.6 DDoS Protection

**Infrastructure-level (Google Cloud Armor):**
- Rate limiting (adjustable per path)
- Geo-blocking (optional, block countries with high bot traffic)
- Bot detection (reCAPTCHA challenge for suspicious IPs)
- IP reputation filtering

**Configuration:**
```yaml
# cloud-armor-policy.yaml
name: songflow-ddos-protection
rules:
  - priority: 1000
    description: "Rate limit API endpoints"
    match:
      expr: "request.path.matches('/api/')"
    rateLimitOptions:
      rateLimitThreshold:
        count: 500
        intervalSec: 60
      conformAction: "allow"
      exceedAction: "deny(429)"
  
  - priority: 2000
    description: "Block known bad IPs"
    match:
      expr: "origin.ip in ['1.2.3.4', '5.6.7.8']"
    action: "deny(403)"
  
  - priority: 9999
    description: "Default allow"
    match:
      expr: "true"
    action: "allow"
```

### 10.7 Secrets Management

**Never commit secrets to code:**

```typescript
// ❌ WRONG
const SPOTIFY_CLIENT_SECRET = 'abc123...';  // NEVER HARDCODE

// ✅ CORRECT
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
```

**Google Cloud Secret Manager:**
```bash
# Store secret
gcloud secrets create spotify-client-secret \
  --data-file=./spotify-secret.txt

# Grant access to Cloud Run service
gcloud secrets add-iam-policy-binding spotify-client-secret \
  --member="serviceAccount:SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Access in application
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const [version] = await client.accessSecretVersion({
  name: 'projects/PROJECT_ID/secrets/spotify-client-secret/versions/latest'
});

const secret = version.payload.data.toString();
```

**Environment variables (for non-sensitive config):**
```bash
# .env (for local development only, never commit)
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/songflow_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-change-in-production

# Production: Set via Cloud Run environment variables (encrypted at rest)
gcloud run services update songflow-backend \
  --set-env-vars="NODE_ENV=production,JWT_SECRET=..."
```

---

## 11. Performance & Scalability

### 11.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Response Time (p50)** | <100ms | DataDog APM |
| **API Response Time (p95)** | <500ms | DataDog APM |
| **API Response Time (p99)** | <1s | DataDog APM |
| **WebSocket Event Latency (p95)** | <500ms | Custom metric (timestamp in payload) |
| **Song Request End-to-End (p95)** | <2s | Chat message → Dashboard update |
| **Dashboard Load Time (p95)** | <2s | Vercel Analytics |
| **Database Query Time (p95)** | <50ms | PostgreSQL slow query log |
| **Redis Operation Time (p95)** | <10ms | Redis SLOWLOG |

### 11.2 Scalability Targets

| Dimension | MVP (Month 1) | Month 6 | Month 12 | Strategy |
|-----------|--------------|---------|----------|----------|
| **Concurrent Streamers** | 100 | 1,000 | 5,000 | Horizontal scaling (Cloud Run) |
| **Concurrent Viewers** | 10,000 | 100,000 | 500,000 | Edge caching (overlay), WebSocket sticky sessions |
| **Requests/Second** | 10 | 50 | 250 | Rate limiting, Redis queue, Spotify API batching |
| **Database Size** | <1 GB | <50 GB | <200 GB | Partitioning (by month), archival |
| **Redis Memory** | <1 GB | <10 GB | <50 GB | Eviction policy (LRU), session cleanup |

### 11.3 Backend Optimizations

#### 11.3.1 Database Query Optimization

```sql
-- Use indexes effectively
CREATE INDEX idx_live_sessions_user_id ON live_sessions(user_id);
CREATE INDEX idx_live_sessions_status ON live_sessions(status) WHERE status IN ('active', 'paused');
CREATE INDEX idx_song_requests_live_session_id ON song_requests(live_session_id);

-- Composite index for common query
CREATE INDEX idx_song_requests_session_status 
ON song_requests(live_session_id, status) 
WHERE status IN ('queued', 'playing');

-- Analyze query plans
EXPLAIN ANALYZE
SELECT * FROM song_requests 
WHERE live_session_id = 'abc' AND status = 'queued' 
ORDER BY position_in_queue;

-- Result: Should use index scan, not seq scan
```

**N+1 query prevention:**
```typescript
// ❌ BAD (N+1 queries)
const sessions = await sessionRepo.find();
for (const session of sessions) {
  session.user = await userRepo.findOne(session.userId);  // N queries
}

// ✅ GOOD (single query with join)
const sessions = await sessionRepo.find({ relations: ['user'] });

// ✅ BETTER (query builder with select)
const sessions = await sessionRepo
  .createQueryBuilder('session')
  .leftJoinAndSelect('session.user', 'user')
  .select(['session', 'user.id', 'user.tiktokDisplayName'])  // Only needed fields
  .getMany();
```

#### 11.3.2 Redis Optimization

**Key expiration:**
```typescript
// Session data: Expire 24 hours after session ends
await redis.setex(`session:${id}:queue`, 86400, JSON.stringify(queue));

// Rate limit: Expire after session ends
await redis.setex(`viewer:${id}:requests:${sessionId}`, 86400, JSON.stringify(state));

// Token cache: Expire 5 minutes before actual expiry
await redis.setex(`token:spotify:${userId}`, expiresIn - 300, JSON.stringify(token));

// Automatic cleanup job (Bull)
queue.add('cleanup-expired-sessions', {}, { repeat: { cron: '0 * * * *' } });  // Hourly
```

**Pipeline for batch operations:**
```typescript
// ❌ BAD (multiple round-trips)
for (const track of tracks) {
  await redis.lpush(`session:${id}:queue`, JSON.stringify(track));
}

// ✅ GOOD (single round-trip)
const pipeline = redis.pipeline();
for (const track of tracks) {
  pipeline.lpush(`session:${id}:queue`, JSON.stringify(track));
}
await pipeline.exec();
```

#### 11.3.3 API Response Caching

```typescript
// Cache Spotify search results (5-minute TTL)
const cacheKey = `spotify:search:${encodeURIComponent(term)}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

const results = await spotifyService.search(term);
await redis.setex(cacheKey, 300, JSON.stringify(results));  // 5 minutes
return results;

// Cache session state (short TTL, invalidated on update)
@UseInterceptors(CacheInterceptor)
@CacheTTL(10)  // 10 seconds
@Get('/sessions/:sessionId/state')
async getSessionState(@Param('sessionId') sessionId: string) {
  // ...
}
```

### 11.4 Frontend Optimizations

#### 11.4.1 Code Splitting

```typescript
// Lazy load analytics page (not needed on dashboard)
import dynamic from 'next/dynamic';

const AnalyticsPage = dynamic(() => import('./analytics/page'), {
  loading: () => <div>Loading...</div>,
  ssr: false  // Client-side only
});

// Lazy load overlay (separate bundle)
const Overlay = dynamic(() => import('@/components/overlay/OverlayCompact'), {
  ssr: false
});
```

#### 11.4.2 Image Optimization

```tsx
// Next.js Image component (automatic optimization)
import Image from 'next/image';

<Image
  src={track.imageUrl}
  alt={track.title}
  width={64}
  height={64}
  loading="lazy"  // Lazy load below fold
  placeholder="blur"  // Show blur while loading
  blurDataURL="data:image/jpeg;base64,..."
/>

// Spotify track images: Serve via Vercel Image Optimization
<Image
  src={`/_next/image?url=${encodeURIComponent(track.imageUrl)}&w=128&q=75`}
  alt={track.title}
  width={64}
  height={64}
/>
```

#### 11.4.3 WebSocket Optimizations

```typescript
// Debounce rapid updates (queue changes)
import { debounce } from 'lodash';

const updateQueue = debounce((queue) => {
  setQueueState(queue);
}, 500);  // Update UI max once per 500ms

socket.on('QUEUE_UPDATED', (event) => {
  updateQueue(event.payload.queue);
});

// Throttle viewer count updates (not critical)
import { throttle } from 'lodash';

const updateViewerCount = throttle((count) => {
  setViewerCount(count);
}, 5000);  // Update UI max once per 5 seconds
```

### 11.5 Horizontal Scaling

#### 11.5.1 Stateless Backend

**All instances are identical:**
- No local state (stored in Redis)
- No file uploads (use Cloud Storage if needed)
- No in-memory caching (use Redis)

**Cloud Run auto-scaling:**
```yaml
# cloud-run.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: songflow-backend
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "2"    # Always 2 instances
        autoscaling.knative.dev/maxScale: "100"  # Scale up to 100
        autoscaling.knative.dev/target: "80"     # Target 80% CPU
    spec:
      containers:
        - image: gcr.io/PROJECT/songflow-backend:latest
          resources:
            limits:
              cpu: "2"
              memory: "2Gi"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-url
                  key: latest
```

#### 11.5.2 WebSocket Sticky Sessions

**Problem:** WebSocket requires persistent connection to same instance

**Solution:** Use Cloud Load Balancer with session affinity

```yaml
# Load balancer config
apiVersion: v1
kind: Service
metadata:
  name: songflow-backend-lb
  annotations:
    cloud.google.com/backend-config: '{"default": "songflow-backend-config"}'
spec:
  type: LoadBalancer
  sessionAffinity: ClientIP  # Sticky sessions based on IP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600  # 1 hour
  ports:
    - name: http
      port: 80
      targetPort: 8080
    - name: websocket
      port: 443
      targetPort: 8080
  selector:
    app: songflow-backend
```

**Alternative:** Use Redis Pub/Sub for cross-instance messaging (already implemented)

### 11.6 Database Scaling

#### 11.6.1 Read Replicas

**Read-heavy queries (analytics) → Read replica:**
```typescript
// TypeORM multiple connections
const connection = await createConnections([
  {
    name: 'default',
    type: 'postgres',
    url: PRIMARY_DATABASE_URL,
    // Write operations
  },
  {
    name: 'read',
    type: 'postgres',
    url: READ_REPLICA_URL,
    // Read-only operations
  }
]);

// Use read replica for analytics
@InjectConnection('read')
private readonly readConnection: Connection;

async getSessionAnalytics(sessionId: string) {
  return this.readConnection
    .getRepository(SessionAnalytics)
    .findOne({ where: { liveSessionId: sessionId } });
}
```

#### 11.6.2 Partitioning (Future)

**When `song_requests` table grows large (>10M rows):**

```sql
-- Partition by month
CREATE TABLE song_requests (
  id UUID,
  live_session_id UUID,
  requested_at TIMESTAMP WITH TIME ZONE,
  -- ... other columns
  PRIMARY KEY (id, requested_at)
) PARTITION BY RANGE (requested_at);

-- Create partitions
CREATE TABLE song_requests_2026_01 PARTITION OF song_requests
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE song_requests_2026_02 PARTITION OF song_requests
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Auto-create partitions via cron job
```

#### 11.6.3 Archival Strategy

**Archive old sessions (>90 days) to Cloud Storage:**

```typescript
// Monthly job
queue.add('archive-old-sessions', {}, { repeat: { cron: '0 0 1 * *' } });  // 1st of month

async function archiveOldSessions() {
  const cutoffDate = subDays(new Date(), 90);
  
  // Export to CSV
  const oldSessions = await sessionRepo.find({
    where: { endedAt: LessThan(cutoffDate) },
    relations: ['requests']
  });
  
  const csv = generateCSV(oldSessions);
  
  // Upload to Cloud Storage
  await storageClient.bucket('songflow-archives').file(`sessions-${format(cutoffDate, 'yyyy-MM')}.csv`).save(csv);
  
  // Delete from database
  await sessionRepo.delete({ endedAt: LessThan(cutoffDate) });
  
  logger.info(`Archived ${oldSessions.length} sessions`);
}
```

---

**This Technical Architecture Document continues in the next part with sections 12-18.**

Would you like me to continue with the remaining sections (Infrastructure & Deployment, Monitoring, Development Guidelines, Testing Strategy, Disaster Recovery, Migration & Rollout, and Appendices)?