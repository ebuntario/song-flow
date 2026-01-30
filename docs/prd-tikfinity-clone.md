# Product Requirements Document (PRD)
## TikTok Song Requests Platform for Indonesia

**Project Name:** SongFlow (TikTok Song Requests Platform)  
**Version:** 1.0  
**Last Updated:** January 28, 2026  
**Market:** Indonesia  
**Primary Language:** Bahasa Indonesia  
**Status:** Planning Phase

---

## Executive Summary

**SongFlow** is a real-time song request management platform that integrates TikTok Live with Spotify, enabling streamers to let their viewers request and interact with songs during live broadcasts. The product bridges the gap between TikTok chat engagement and music playback, creating a new dimension of viewer interaction and stream entertainment.

**Target Market:** Indonesian TikTok Live streamers (musicians, entertainment creators, gamers) aged 18–40 with active audiences.

**Revenue Model:** Freemium (basic functionality free, premium features via subscription or gift-based tipping).

**Success Metrics:** Daily Active Streamers (DAS), Average Session Duration, Song Requests per Session, User Retention Rate (7-day, 30-day).

---

## 1. Vision & Goals

### 1.1 Vision Statement
To become Southeast Asia's leading real-time music engagement platform, transforming TikTok Live from passive watching into active audience participation.

### 1.2 Product Goals (12 months)

| Goal | Success Metric | Target |
|------|---|---|
| **User Acquisition** | Active registered streamers | 5,000+ |
| **Engagement** | Daily active sessions | 1,000+ |
| **Revenue** | Monthly Recurring Revenue (MRR) | Rp 50M+ |
| **Quality** | Service uptime | 99.5%+ |
| **Retention** | 30-day retention rate | 35%+ |
| **Market Position** | Indonesia market dominance | Top 3 music engagement tools for TikTok |

### 1.3 Core Principles

- **Low barrier to entry:** Sign in with TikTok, connect Spotify, start streaming.
- **Zero infrastructure overhead:** Works with existing Spotify, no re-hosting of audio.
- **Real-time responsiveness:** <2 second latency from request to queue update.
- **Indonesia-first:** Language, payment, and user experience designed for Indonesian creators.
- **Privacy-first:** Transparent data usage, compliance with local regulations.

---

## 2. Problem Statement & Opportunity

### 2.1 Current Pain Points

1. **Creator Engagement Plateau**  
   - TikTok Live viewers watch passively; creators struggle to maintain engagement.
   - "Like" and "gift" are not enough for music-focused content.

2. **No Native Song Control**  
   - TikTok Live has no integrated music request feature.
   - Creators manually sift through hundreds of comments for music requests.

3. **Disconnected Experience**  
   - Spotify runs separately; no way to crowdsource playlist.
   - Creators can't track which songs resonate with their audience.

4. **Limited for Non-Premium Spotify Users**  
   - Many Indonesian users have Spotify Free; no unified solution for them.

5. **Technical Complexity**  
   - Setting up overlays, alerts, and music integrations requires OBS knowledge.
   - No plug-and-play solution for casual streamers.

### 2.2 Market Opportunity

- **TikTok Live streamers in Indonesia:** ~200,000+ monthly active.
- **Spotify users in Indonesia:** ~10M+ (mix of Free and Premium).
- **Convergence:** High overlap; most TikTok Live creators use Spotify.
- **Underserved segment:** Music-focused streamers (DJs, musicians, karaoke hosts) lack engagement tools.
- **Monetization:** Streamers want more viewer interaction; viewers want influence over music; opportunity for premium features (priority requests, custom DJ modes).

---

## 3. Product Overview

### 3.1 High-Level Concept

SongFlow is a **middleware** between TikTok Live chat and Spotify Web API that:

1. Listens to TikTok Live chat in real-time.
2. Detects song request commands (`!song`, `!lagu`, `!sr`).
3. Searches Spotify for requested tracks.
4. Queues songs to the streamer's Spotify playback device.
5. Displays live feedback (current track, next up, requester name) via an overlay.

**No audio re-hosting.** Spotify remains the audio source; TikTok only captures the streamer's system audio + mic.

### 3.2 Core Features (MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| **TikTok OAuth Login** | Streamer signs in via TikTok | P0 |
| **Spotify OAuth Integration** | Connect Spotify account (Premium or Free) | P0 |
| **Live Chat Listener** | Real-time monitoring of TikTok Live chat | P0 |
| **Song Request Processing** | Parse chat commands and search Spotify | P0 |
| **Queue Management** | Display current track, next 5 tracks, requester names | P0 |
| **Overlay View** | Browser source for OBS/TikTok Live Studio | P0 |
| **Manual Skip Control** | Streamer can skip current track | P1 |
| **Per-User Request Limits** | Rate limiting (max 1 request/min, max 5 in queue) | P1 |
| **Viewer Analytics** | Track top requesters, most requested songs | P1 |
| **Ban/Mute Viewers** | Streamer can block abusive users | P1 |
| **Content Filtering** | Toggle explicit content, language filtering | P2 |
| **Gift-Based Prioritization** | VIP requests from gift givers | P2 |
| **Mobile-Friendly Dashboard** | Access dashboard on phone (for TikTok streamers) | P2 |

### 3.3 Out of Scope (for MVP)

- YouTube Music, Joox, or other music providers (roadmap for Q3 2026).
- Twitch or YouTube Live integration (roadmap for Q2 2026).
- Cryptocurrency or blockchain-based tipping.
- Advanced ML-based recommendation engine.
- Offline mode or local Spotify caching.

---

## 4. User Personas & Use Cases

### 4.1 Primary Personas

#### Persona 1: DJ Streamer (Adi, 28)
- **Background:** Semi-professional DJ, streams 3–5 nights/week on TikTok Live.
- **Goal:** Increase audience interaction and play songs viewers want.
- **Pain Point:** Gets 50+ song requests in chat; hard to manage manually.
- **Motivation:** Longer streams, higher engagement, potential for monetization.
- **Tech Comfort:** Medium; can set up OBS but prefers simple solutions.

#### Persona 2: Music Content Creator (Siti, 24)
- **Background:** Singer/musician, streams covers and original songs.
- **Goal:** Build a fan community that feels heard; diversify setlist based on requests.
- **Pain Point:** Wants interactive element but doesn't want to interrupt flow.
- **Motivation:** Loyal audience, higher gift conversion, viral potential.
- **Tech Comfort:** Low; wants zero-config solution.

#### Persona 3: Casual Gamer (Budi, 32)
- **Background:** Gaming streamer with music background (plays while gaming).
- **Goal:** Add background music layer that viewers can influence.
- **Pain Point:** Currently uses static playlists; wants audience control.
- **Motivation:** Differentiation from other gaming streamers, extended session length.
- **Tech Comfort:** High; already uses OBS and third-party tools.

### 4.2 Core Use Cases

#### Use Case 1: Basic Song Request Flow
```
1. Streamer logs in with TikTok → Spotify → starts TikTok Live.
2. Viewer watches stream, types "!lagu Shape of You" in chat.
3. SongFlow detects command, searches Spotify, queues "Shape of You" by Ed Sheeran.
4. Overlay updates: "Next: Shape of You by Ed Sheeran (requested by @viewer123)".
5. Current track finishes; Spotify auto-plays next in queue.
6. Requester's name appears on overlay (bragging rights).
```

#### Use Case 2: Streamer Rate-Limits Spam
```
1. Viewer sends 10 requests in 30 seconds.
2. SongFlow enforces 1-request-per-60-sec limit.
3. Viewer gets DM or in-chat message: "Tunggu 45 detik sebelum request lagi! ⏱️"
4. Viewer waits, sends valid request.
5. Request is queued normally.
```

#### Use Case 3: Overlay for OBS
```
1. Streamer opens SongFlow dashboard, clicks "Copy Overlay URL".
2. Opens OBS, adds Browser Source with copied URL.
3. Overlay appears in stream, shows live updates (now playing, next track, requester).
4. Overlay updates in real-time as new requests come in.
5. Audience sees SongFlow branding at bottom (subtle, non-intrusive).
```

#### Use Case 4: VIP Priority (Premium Feature)
```
1. Viewer sends a gift (e.g., Rp 10K worth).
2. SongFlow recognizes gift transaction from TikTok.
3. Gifter's next song request is marked as "VIP" and jumps queue.
4. Plays before standard requests (unless other VIPs ahead).
5. Overlay shows "🎁 VIP: Requester requested [Song]".
```

---

## 5. Detailed Feature Specifications

### 5.1 Authentication & Onboarding

#### 5.1.1 TikTok OAuth
- **Flow:**
  1. User clicks "Sign in with TikTok".
  2. Redirect to TikTok OAuth flow.
  3. Request scopes: `user:read`, `live:read` (read live info), optionally `video:read` (for analytics).
  4. Store `tiktok_user_id`, `display_name`, `access_token` (refresh token if available).
  5. Verify user account is eligible (no bot account, acceptable community score).

- **Fallback:** If TikTok OAuth unavailable, allow email signup with manual TikTok Live URL entry.

#### 5.1.2 Spotify OAuth
- **Flow:**
  1. After TikTok login, user clicks "Connect Spotify".
  2. Redirect to Spotify OAuth with scopes:
     - `user-read-playback-state`
     - `user-modify-playback-state`
     - `user-read-currently-playing`
     - `streaming` (optional, for Web Playback SDK)
  3. Store `spotify_user_id`, `refresh_token` (encrypted), `scopes`.
  4. Display user's current Spotify device (e.g., "Desktop - Laptop Adi").

- **Important:** Explain that SongFlow needs access to queue songs; Spotify audio remains on their device.

#### 5.1.3 Onboarding Flow
```
Step 1: Welcome screen (video intro in Bahasa)
  └─> "Tunjukkan kepada penonton Anda bahwa mereka mengontrol musik!" 

Step 2: Sign in with TikTok
  └─> Scope request, user approval

Step 3: Connect Spotify
  └─> Scope request, user approval, device selection

Step 4: Verify Active TikTok Live
  └─> Input live URL or auto-detect
  └─> Test WebSocket connection
  └─> Confirm Spotify playback is active

Step 5: Copy Overlay URL for OBS (optional)
  └─> Instructions for OBS/TikTok Live Studio
  └─> Quick test: send a test song request

Step 6: Start Streaming
  └─> Ready to receive song requests
  └─> Dashboard shows live metrics
```

**Estimated onboarding time:** 3–5 minutes.

### 5.2 Streamer Dashboard

#### 5.2.1 Main Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  SongFlow Dashboard                [Settings] [Logout]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ LIVE SESSION ──────────────────────────────────┐  │
│  │ Status: LIVE (2h 34m)                           │  │
│  │ Viewers: 1,234 | Requests This Session: 89      │  │
│  │ [Stop Streaming] [Pause Requests]               │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ NOW PLAYING ───────────────────────────────────┐  │
│  │ 🎵 Shape of You - Ed Sheeran                    │  │
│  │ Requested by: @viewer_123                       │  │
│  │ ⏱️  2:15 / 3:50                                  │  │
│  │ [⏭️ Skip] [❤️ Like] [🔊 Volume]                 │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ NEXT IN QUEUE ──────────────────────────────────┐ │
│  │ 1. Blinding Lights - The Weeknd (by @user_456)   │ │
│  │ 2. Levitating - Dua Lipa (by @user_789)          │ │
│  │ 3. Watermelon Sugar - Harry Styles               │ │
│  │ 4. Drivers License - Olivia Rodrigo               │ │
│  │ 5. good 4 u - Olivia Rodrigo                      │ │
│  │ [View full queue (45 items)]                      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ REQUEST SETTINGS ───────────────────────────────┐ │
│  │ ☑️ Allow Song Requests                           │ │
│  │ Max requests per user: 5                         │ │
│  │ Request cooldown: 60 seconds                     │ │
│  │ Allow explicit content: ☑️                       │ │
│  │ Min follower requirement: None                   │ │
│  │ [Advanced Settings]                              │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ TOP REQUESTERS (This Stream) ───────────────────┐ │
│  │ 🥇 @top_fan (12 requests) 🎁                     │ │
│  │ 🥈 @music_lover (8 requests)                     │ │
│  │ 🥉 @dj_enthusiast (6 requests)                   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 5.2.2 Functional Requirements

**Dashboard State:**
- Real-time WebSocket updates from backend.
- Auto-refresh every 1–2 seconds (no full page reload).
- Show "LIVE" indicator when TikTok Live is active and connected.

**Now Playing Section:**
- Display current track artwork (from Spotify API).
- Show track title, artist, duration.
- Show requester name (or "Auto-playlist" if not requested).
- Progress bar with current time / total duration.
- Skip button (streamer only).
- Like/heart counter (optional engagement feature).

**Queue Section:**
- Show next 5–10 upcoming requests.
- Display requester name for each.
- Ability to reorder queue (drag-and-drop, streamer only).
- Ability to remove songs from queue (streamer only).
- Show total queue size (e.g., "45 requests in queue").
- Infinite scroll to view all queued songs.

**Request Settings Panel:**
- Toggle requests on/off (pause requests without stopping stream).
- Set max requests per user (default: 5).
- Set request cooldown in seconds (default: 60).
- Toggle explicit content filter.
- Set minimum follower requirement (optional).
- Set custom greeting message for first request.
- Advanced: Banned words list, banned users list, VIP user list.

**Session Metrics:**
- Total session duration (HH:MM format).
- Estimated viewers (from TikTok API or polled estimate).
- Total song requests this session.
- Average requests per minute.
- Peak concurrent requests (for analytics).

#### 5.2.3 Desktop vs. Mobile Responsiveness

**Desktop (1440px+):** Full layout as shown above.

**Tablet (768px–1440px):** Stack sections vertically; side-by-side for critical info (now playing + next).

**Mobile (< 768px):**
- Collapse request settings to accordion.
- Show queue as vertical scroll (one item wide).
- Now playing and top requesters on separate tabs.
- Buttons grow to full width for easy touch targets.

### 5.3 Overlay View

#### 5.3.1 Overlay Specifications

**Purpose:** Display in OBS or TikTok Live Studio as a browser source overlay.

**Features:**
- Shows current track + requester name.
- Shows next 1–3 upcoming requests (optional).
- Auto-updates via WebSocket every 1–2 seconds.
- Customizable CSS themes (see 5.3.2).
- Transparent background (only displays content, not white box).
- Subtle SongFlow branding (optional logo, can be disabled).

**Layout Options:**

**Option A: Compact (Bottom Right Corner)**
```
┌─ Now Playing ──────────┐
│ 🎵 Shape of You        │
│ by Ed Sheeran          │
│ req. @viewer_123       │
└────────────────────────┘
```

**Option B: Wide (Bottom Bar)**
```
┌─ Now Playing: Shape of You - Ed Sheeran (req. @viewer_123) | Next: Blinding Lights (req. @user_456) ─┐
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Option C: Vertical (Right Side Panel)**
```
┌─ SongFlow ─┐
│ 🎵 Shape   │
│ of You     │
│ Ed Sheeran │
│ @viewer123 │
│            │
│ Next:      │
│ Blinding   │
│ Lights     │
│ @user_456  │
└────────────┘
```

#### 5.3.2 Customization Options

Streamer can customize overlay via dashboard:

- **Color Scheme:** Dark (default), light, custom brand colors.
- **Font Size:** Small, medium, large.
- **Position:** Top-left, top-right, bottom-left, bottom-right, full width.
- **Transparency:** 0–100% background opacity.
- **Show/Hide Elements:** Logo, requester name, next track, queue count.
- **Animation:** Fade-in on track change, slide animations.
- **Duration:** How long to show previous requester name after track change.

#### 5.3.3 Overlay URL & Embedding

- **Public URL:** `https://songflow.id/overlay/{sessionId}`
- **OBS Setup:**
  1. Add Browser Source.
  2. Paste URL.
  3. Set width/height (e.g., 400px × 150px).
  4. Optionally set custom CSS for positioning.
- **TikTok Live Studio:** Add as URL source if available, or direct users to use OBS for capture.

#### 5.3.4 Fallback & Error States

- If WebSocket disconnects: Show cached data + "Reconnecting..." message.
- If TikTok Live ends: Show "Stream offline" message.
- If Spotify playback stops: Show "Playback paused" message.

### 5.4 Song Request Processing

#### 5.4.1 Chat Command Recognition

**Supported Commands:**
- `!song [search term]` — English (international users).
- `!lagu [search term]` — Bahasa Indonesia (primary).
- `!sr [search term]` — Common abbreviation.
- `!musik [search term]` — Alternative Bahasa.
- Spotify URL: `!song https://open.spotify.com/track/...` or paste URL directly.

**Parsing Logic:**
```
Input: "!lagu shape of you"
  └─> Extract command: "lagu"
  └─> Extract search term: "shape of you"
  └─> Call Spotify search API
  └─> Return top result: {id: "123abc", title: "Shape of You", artist: "Ed Sheeran"}
  └─> Queue to Spotify

Input: "!song https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqL"
  └─> Extract track ID: "4cOdK2wGLETKBW3PvgPWqL"
  └─> Validate track exists (optional: check if available in ID market)
  └─> Queue directly to Spotify
```

#### 5.4.2 Search & Disambiguation

**Case 1: Exact Match**
- Search term "shape of you" → "Shape of You" by Ed Sheeran (99% confidence).
- Auto-queue without user confirmation.

**Case 2: Ambiguous**
- Search term "love" → Multiple results (50+ songs).
- Show top 3 results in chat reply or overlay.
- Require viewer to click or re-send command with artist name.

**Case 3: Not Found**
- Search term "xyzabc" → No results.
- Reply in chat: "Lagu 'xyzabc' tidak ditemukan. Coba dengan nama artis?"

#### 5.4.3 Spotify Search Parameters

```
GET /v1/search
  q: [search_term]
  type: track
  market: ID (Indonesia)
  limit: 5
  offset: 0
```

**Filters Applied:**
- Market = Indonesia (respect regional licensing).
- Exclude extremely explicit content if toggle is off.
- Prefer popular/available tracks (Spotify popularity index > 30).

#### 5.4.4 Queueing Mechanism

**Endpoint:** `POST /v1/me/player/queue`

**Request:**
```json
{
  "uri": "spotify:track:4cOdK2wGLETKBW3PvgPWqL"
}
```

**Headers:** Include Authorization with streamer's access token.

**Handling:**
- **Success (200):** Track queued. Update dashboard in real-time.
- **Error 404 (No Active Device):** Prompt streamer to start playback on a device.
- **Error 403 (Access Denied):** Token expired. Trigger silent refresh or ask user to re-authorize.
- **Error 429 (Rate Limited):** Queue request; retry after backoff.

#### 5.4.5 Rate Limiting & Spam Prevention

**Per-Viewer Limits:**
- Max requests per session: 5 (configurable).
- Cooldown between requests: 60 seconds (configurable).
- Max queue size per viewer: 3 concurrent requests.

**Implementation:**
- Redis key: `viewer:{tiktok_user_id}:requests:{session_id}`
  - Stores count + last request timestamp.
  - Expires after session ends.
- On request:
  1. Check if viewer has reached max requests per session.
  2. Check if viewer is within cooldown period.
  3. If blocked, reply in chat: "Tunggu {X} detik sebelum request berikutnya 🕐"

**Bypass:**
- VIP/gift givers (configurable by streamer).
- Followers/subscribers (configurable).

#### 5.4.6 Content Filtering

**Explicit Content Filter:**
- If enabled, exclude tracks with `explicit: true` from Spotify metadata.
- Show warning in dashboard if request contains explicit track.

**Banned Words List:**
- Streamer can define words (e.g., "banned_songs", "offensive_terms").
- If viewer sends request containing banned word, silently reject with friendly message.

**Viewer Ban List:**
- Streamer can ban users by TikTok username or ID.
- Banned users' requests silently ignored (no queue, no chat reply).

---

### 5.5 Real-Time Communication

#### 5.5.1 WebSocket Architecture

**Purpose:** Deliver real-time updates to dashboard and overlay without polling.

**Endpoint:** `wss://api.songflow.id/ws/{sessionId}/{clientType}`
- `sessionId`: UUID of the live session.
- `clientType`: "dashboard" or "overlay".

**Message Types:**

| Message | Direction | Payload | Frequency |
|---------|-----------|---------|-----------|
| `TRACK_CHANGED` | Server → Client | `{currentTrack, requester, duration, currentTime}` | On track end |
| `QUEUE_UPDATED` | Server → Client | `{upNext: [{track, requester}, ...]}` | On new request, skip, reorder |
| `REQUEST_REJECTED` | Server → Client | `{reason, viewerId}` | On rate limit, ban, etc. |
| `REQUEST_CONFIRMED` | Server → Client | `{trackId, requester, position}` | On successful queue |
| `SESSION_ENDED` | Server → Client | `{reason}` | On stream end, Spotify disconnect |
| `VIEWER_COUNT` | Server → Client | `{count, estimates}` | Every 30 seconds |
| `SETTINGS_CHANGED` | Server → Client | `{settings: {...}}` | On dashboard settings update |

**Connection Management:**
- Reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s).
- Heartbeat ping every 30 seconds; client responds with pong.
- Timeout after 60 seconds no pong → reconnect.

#### 5.5.2 Polling Fallback

If WebSocket unavailable (older browsers, restrictive networks):
- Dashboard polls `/api/session/{sessionId}` every 2 seconds.
- Overlay refreshes every 3–5 seconds.
- Higher latency (2–5 seconds vs. <500ms with WebSocket), but functional.

---

### 5.6 Skip & Voting (P1 Feature)

#### 5.6.1 Manual Skip (Streamer)
- Streamer clicks "Skip" button on dashboard.
- Calls `POST /v1/me/player/next` with access token.
- Spotify skips to next queued track.
- Analytics: Track skip event; log reason (optional: "streamer", "auto", "time-limit").

#### 5.6.2 Skip Voting (Optional, Premium)
- **Feature:** Viewers can vote to skip current track.
- **Threshold:** e.g., 20% of concurrent viewers or 5 votes, whichever is lower.
- **UI:** Emoji reaction or `/skip` command.
- **Rate Limit:** 1 vote per viewer per track.

**Implementation:**
- Redis key: `session:{id}:skip_votes` (set of viewer ids).
- On each vote, check threshold.
- If threshold reached, auto-skip.
- Reset votes on track change.

---

### 5.7 Analytics & Reporting (P1)

#### 5.7.1 In-Session Metrics

**Dashboard Display:**
- Total requests this session.
- Requests per minute (rolling average).
- Top 3 requesters (by count).
- Top 5 most requested songs.
- Peak concurrent requests.
- Engagement rate (requests / viewers).

#### 5.7.2 Historical Analytics

**Page:** `/dashboard/analytics` (post-stream)

**Data Collected & Displayed:**
- Duration of stream.
- Peak viewership.
- Total unique requests.
- Total unique requesters.
- Most requested songs (all-time, per stream, weekly, monthly).
- Top requesters (with follow-back potential).
- Request source breakdown (direct mention, followers, new viewers, VIPs).
- Acceptance rate (requests queued / total requests sent).

**Exporting:**
- Download as CSV.
- Share analytics with collaborators (e.g., record label if artist).

#### 5.7.3 Streamer Insights

- **Trending:** What songs are viewers asking for (insight into taste).
- **Engagement Correlation:** Do certain songs increase gifts/follows?
- **Time Analysis:** When do most requests happen (first 30min, mid-stream, end)?

---

### 5.8 Settings & Configuration

#### 5.8.1 Request Settings

```
┌─ Song Request Configuration ──────────────────────┐
│                                                   │
│ ☑️ Enable Song Requests                          │
│                                                   │
│ Max Requests per User:          [5 ▼]            │
│ Request Cooldown (seconds):     [60 ▼]           │
│ Allow Explicit Content:         ☑️                │
│ Min Follower Requirement:       [None ▼]         │
│ Min Account Age (days):         [0 ▼]            │
│                                                   │
│ [Show Advanced Settings]                         │
│                                                   │
│                        [Save Changes] [Discard]  │
└─────────────────────────────────────────────────┘
```

**Advanced Settings:**
- Banned words list (comma-separated).
- Banned users list (import from file or paste usernames).
- VIP users list (always allow requests, bypass cooldown, jump queue).
- Custom greeting for first-time requesters.
- Auto-approve or require manual approval (for premium).
- Max queue size (to prevent spam).
- Song duration limits (e.g., no songs > 10 min).

#### 5.8.2 Display Settings

```
┌─ Overlay & Display Settings ──────────────────────┐
│                                                   │
│ Overlay Theme:                  [Dark ▼]         │
│ Font Size:                      [Medium ▼]       │
│ Position:                       [Bottom-Right ▼] │
│ Background Opacity:             [80% ─●─ 100%]   │
│                                                   │
│ ☑️ Show Requester Name                           │
│ ☑️ Show Next Track                               │
│ ☑️ Show Queue Count                              │
│ ☑️ Show SongFlow Branding                        │
│                                                   │
│ Animation Style:                [Fade-in ▼]      │
│ Display Duration (sec):         [5 ▼]            │
│                                                   │
│ [Copy Overlay URL]  [Preview Overlay]            │
│                        [Save Changes] [Discard]  │
└─────────────────────────────────────────────────┘
```

#### 5.8.3 Account Settings

- Display name (linked to TikTok).
- Email for notifications.
- Password change (if email signup used).
- Two-factor authentication (optional, for premium).
- Connected devices (manage OAuth tokens).
- Privacy settings (data sharing, analytics opt-in).
- Notifications (request alerts, gift alerts, errors).

---

## 6. Technical Architecture

### 6.1 System Architecture Overview

```
┌──────────────────┐         ┌──────────────────────┐
│   TikTok Live    │◄────────►│  SongFlow Backend    │
│   (WebSocket)    │          │  (Node.js / NestJS)  │
└──────────────────┘          └─────────┬────────────┘
                                        │
                                        ├─► Spotify Web API
                                        │
                                        ├─► PostgreSQL
                                        │
                                        ├─► Redis
                                        │
                                        └─► Cloud Storage (images, analytics)
                                        

┌──────────────────┐         ┌──────────────────────┐
│  Streamer        │◄────────►│  SongFlow Frontend   │
│  (Dashboard)     │          │  (Next.js/React)     │
│  (Browser)       │          │  (WebSocket)         │
└──────────────────┘          └──────────────────────┘
                                        │
                                        └─► Overlay (browser source)
```

### 6.2 Backend Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Runtime** | Node.js 20+ | Fast, non-blocking I/O; matches your expertise. |
| **Framework** | NestJS | Modular, TypeScript, built-in WebSocket support. |
| **Database** | PostgreSQL 15 | Relational data (users, sessions, requests); JSONB for config. |
| **Cache/Queue** | Redis 7 | Session state, real-time queue, rate limiting. |
| **Message Queue** | Bull (Redis-backed) | Background jobs (analytics, token refresh, cleanup). |
| **APIs** | REST + WebSocket | REST for dashboard, WebSocket for real-time. |
| **Auth** | JWT + OAuth2 | Stateless auth; integrates with TikTok & Spotify. |
| **Monitoring** | OpenTelemetry + DataDog | Traces, metrics, logs; essential for production. |
| **Hosting** | Google Cloud Run (or Fly.io) | Serverless, auto-scaling, pay-per-use. Region: Singapore. |

### 6.3 Frontend Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Framework** | Next.js 14 (App Router) | SSR, API routes, built-in optimization. |
| **UI Library** | React 18 | Your comfort; large ecosystem. |
| **Styling** | Tailwind CSS | Utility-first; matches your preference for clean, maintainable styles. |
| **State Management** | TanStack Query (React Query) | Server state; WebSocket integration via custom hooks. |
| **Real-Time** | Socket.io or ws | WebSocket library for client side. |
| **Forms** | React Hook Form + Zod | Type-safe, minimal boilerplate. |
| **Charts** | Recharts | Lightweight analytics visualizations. |
| **Icons** | Lucide React | Consistent icon library. |
| **Hosting** | Vercel | Optimal for Next.js; auto-deploy from Git. |

### 6.4 Database Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_user_id BIGINT UNIQUE NOT NULL,
  tiktok_display_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  locale VARCHAR(10) DEFAULT 'id',
  profile_image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Spotify accounts (one user → many Spotify accounts possible)
CREATE TABLE spotify_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spotify_user_id VARCHAR(255) UNIQUE NOT NULL,
  refresh_token TEXT NOT NULL ENCRYPTED, -- PII; encrypt at rest
  access_token TEXT, -- Cached, will be refreshed server-side
  scopes TEXT ARRAY,
  product_type VARCHAR(50), -- 'premium' or 'free'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Live sessions
CREATE TABLE live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tiktok_live_id VARCHAR(255) NOT NULL,
  spotify_account_id UUID NOT NULL REFERENCES spotify_accounts(id),
  status VARCHAR(50) DEFAULT 'pending', -- 'active', 'paused', 'ended'
  config JSONB DEFAULT '{}', -- {maxReqPerUser, cooldown, explicit, ...}
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Song requests
CREATE TABLE song_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  viewer_tiktok_id BIGINT,
  viewer_display_name VARCHAR(255),
  spotify_track_id VARCHAR(255) NOT NULL,
  track_title VARCHAR(500),
  track_artist VARCHAR(500),
  track_image_url TEXT,
  status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'playing', 'skipped', 'completed', 'rejected'
  rejection_reason VARCHAR(500),
  position_in_queue INT,
  is_vip BOOLEAN DEFAULT FALSE,
  requested_at TIMESTAMP DEFAULT NOW(),
  queued_at TIMESTAMP,
  started_playing_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Viewers (to track unique users across sessions)
CREATE TABLE viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_user_id BIGINT UNIQUE NOT NULL,
  display_name VARCHAR(255),
  follower_count INT,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics
CREATE TABLE session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  total_requests INT DEFAULT 0,
  unique_requesters INT DEFAULT 0,
  peak_concurrent_requests INT DEFAULT 0,
  estimated_peak_viewers INT DEFAULT 0,
  avg_requests_per_minute DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rate limiting (for quick lookups)
CREATE TABLE rate_limit_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  viewer_tiktok_id BIGINT NOT NULL,
  request_count INT DEFAULT 0,
  last_request_at TIMESTAMP,
  expires_at TIMESTAMP, -- Session-scoped TTL
  PRIMARY KEY (live_session_id, viewer_tiktok_id)
);

-- Indices for performance
CREATE INDEX idx_users_tiktok_id ON users(tiktok_user_id);
CREATE INDEX idx_spotify_accounts_user_id ON spotify_accounts(user_id);
CREATE INDEX idx_live_sessions_user_id ON live_sessions(user_id);
CREATE INDEX idx_live_sessions_status ON live_sessions(status);
CREATE INDEX idx_song_requests_live_session_id ON song_requests(live_session_id);
CREATE INDEX idx_song_requests_status ON song_requests(status);
CREATE INDEX idx_viewers_tiktok_id ON viewers(tiktok_user_id);
```

### 6.5 Redis Data Structure

```javascript
// Session queues
session:{sessionId}:queue = [
  {
    trackId: "4cOdK2wGLETKBW3PvgPWqL",
    title: "Shape of You",
    artist: "Ed Sheeran",
    requester: "@viewer_123",
    requestedAt: 1706433599,
    isVIP: false
  },
  // ... more tracks
]

// Rate limiting (per-session)
viewer:{tiktok_user_id}:requests:{sessionId} = {
  count: 2,
  lastRequestAt: 1706433599,
  expiresAt: 1706433899 // Session expiry
}

// Skip votes
session:{sessionId}:skip_votes = set of viewer_tiktok_ids

// Session metadata
session:{sessionId}:metadata = {
  status: "active",
  startedAt: 1706433599,
  estimatedViewers: 1234,
  totalRequests: 89
}

// Spotify current track (cached)
session:{sessionId}:current_track = {
  trackId: "xyz",
  title: "Now playing",
  artist: "Artist",
  requester: "@user",
  startedAt: 1706433599
}
```

### 6.6 API Endpoints (REST)

```
Authentication
  POST   /auth/tiktok/login              → Redirect to TikTok OAuth
  POST   /auth/tiktok/callback           → Handle OAuth callback
  POST   /auth/spotify/connect           → Redirect to Spotify OAuth
  POST   /auth/spotify/callback          → Handle OAuth callback
  POST   /auth/logout                    → Revoke tokens, end session

Sessions
  POST   /sessions/start                 → Start new live session
  GET    /sessions/{sessionId}           → Get session details
  PATCH  /sessions/{sessionId}           → Update session config
  POST   /sessions/{sessionId}/end       → End session
  GET    /sessions/{sessionId}/queue     → Get current queue
  
Song Requests (Internal)
  POST   /sessions/{sessionId}/requests  → Submit request (called by TikTok listener)
  GET    /sessions/{sessionId}/requests  → List requests for session
  DELETE /sessions/{sessionId}/requests/{requestId}  → Remove from queue
  PATCH  /sessions/{sessionId}/requests/{requestId}  → Update request status

Spotify
  GET    /spotify/search?q={term}        → Search tracks
  POST   /spotify/queue                  → Queue track to Spotify
  POST   /spotify/skip                   → Skip current track
  GET    /spotify/current                → Get currently playing

Analytics
  GET    /sessions/{sessionId}/analytics → Get session analytics
  GET    /users/analytics/history        → Get historical analytics

Settings
  GET    /settings                       → Get user settings
  PATCH  /settings                       → Update settings
  GET    /overlay/{sessionId}            → Overlay embed page

Health
  GET    /health                         → Service health check
```

### 6.7 WebSocket Events

```javascript
// Client → Server
{
  type: 'PING',
  payload: {}
}

{
  type: 'UPDATE_SETTINGS',
  payload: {
    maxReqPerUser: 5,
    cooldownSeconds: 60,
    allowExplicit: true
  }
}

{
  type: 'SKIP_TRACK',
  payload: {}
}

{
  type: 'REORDER_QUEUE',
  payload: {
    requestIds: ['id1', 'id2', 'id3']
  }
}

// Server → Client
{
  type: 'PONG',
  payload: {}
}

{
  type: 'TRACK_CHANGED',
  payload: {
    currentTrack: {
      id: '4cOdK2wGLETKBW3PvgPWqL',
      title: 'Shape of You',
      artist: 'Ed Sheeran',
      imageUrl: 'https://...',
      duration: 231
    },
    requester: '@viewer_123',
    currentTime: 0
  }
}

{
  type: 'QUEUE_UPDATED',
  payload: {
    queue: [
      { trackId, title, artist, requester },
      // ... next 4 tracks
    ]
  }
}

{
  type: 'REQUEST_CONFIRMED',
  payload: {
    trackId: '...',
    title: '...',
    requester: '@user',
    position: 1
  }
}

{
  type: 'REQUEST_REJECTED',
  payload: {
    reason: 'rate_limit',
    message: 'Tunggu 45 detik sebelum request lagi'
  }
}
```

### 6.8 External Service Integration

#### 6.8.1 TikTok Live Chat Listener

**Technology:** `tiktok-live-connector` npm library or custom WebSocket.

**Flow:**
```
1. Streamer starts live.
2. Backend receives live URL or live room ID.
3. Connect to TikTok Live WebSocket.
4. Iterate through comments:
   a. Check if message starts with `!lagu`, `!song`, etc.
   b. Extract search term.
   c. Validate request (rate limit, bans, content filter).
   d. Call Spotify search API.
   e. Queue to Spotify.
   f. Emit TRACK_QUEUED WebSocket event to dashboard.
5. Keep connection alive; reconnect on drop.
```

**Error Handling:**
- If TikTok WebSocket drops: Notify streamer in dashboard; attempt auto-reconnect.
- If connection fails after 3 attempts: Require manual reconnection.

#### 6.8.2 Spotify Integration

**OAuth2 Flow:**
```
1. User clicks "Connect Spotify".
2. Frontend redirects to:
   https://accounts.spotify.com/authorize?
     client_id={YOUR_CLIENT_ID}&
     response_type=code&
     redirect_uri={YOUR_REDIRECT_URI}&
     scopes=user-read-playback-state,user-modify-playback-state,...
3. User approves.
4. Spotify redirects to:
   {YOUR_REDIRECT_URI}?code={AUTH_CODE}
5. Backend exchanges code for refresh token:
   POST https://accounts.spotify.com/api/token
     grant_type: authorization_code
     code: {AUTH_CODE}
     client_id: {YOUR_CLIENT_ID}
     client_secret: {YOUR_CLIENT_SECRET}
     redirect_uri: {YOUR_REDIRECT_URI}
6. Spotify returns { access_token, refresh_token, expires_in }.
7. Backend stores refresh_token encrypted in DB; access_token cached in Redis.
```

**Token Refresh:**
- Access token expires in ~1 hour.
- Before each API call, check if token is stale.
- If stale, refresh using refresh token.
- Handle 401 responses → force user to re-authenticate.

**Queue API:**
```
POST https://api.spotify.com/v1/me/player/queue?uri={URI}
Authorization: Bearer {ACCESS_TOKEN}
```

**Error Handling:**
- 404 "No active device": Instruct user to start playback on a device.
- 403 "Not premium": For premium-only features, gracefully degrade or show upsell.
- 429 "Rate limited": Backoff exponentially; queue request and retry.

---

## 7. Security & Privacy

### 7.1 Authentication & Authorization

**OAuth2 + JWT:**
- TikTok OAuth: Get user identity and permission to read live stream info.
- Spotify OAuth: Get permission to queue songs.
- Internal JWT: Issued by backend; contains user_id, session_id, scopes.
- JWT expiry: 8 hours; refresh token in HTTP-only cookie.

**Scope Validation:**
- Verify user performing action has required scope (e.g., only streamer can skip).
- Implement role-based access control (RBAC): Owner, Admin, Viewer.

### 7.2 Data Protection

**Encryption at Rest:**
- Spotify refresh tokens: Encrypt using AES-256-GCM with KMS (Google Cloud KMS).
- Database: Enable TLS for connections; backups encrypted.
- Redis: Dedicated Redis instance; VPC-only access.

**Encryption in Transit:**
- All APIs: HTTPS only (TLS 1.3).
- WebSocket: WSS (WebSocket Secure).
- No plaintext traffic.

**Data Retention:**
- Session data: Retain for 30 days post-stream; auto-delete.
- User data: Retain until account deletion.
- Refresh tokens: Revoke and delete on logout.
- Request audit logs: Retain for 90 days for compliance.

### 7.3 Rate Limiting & DDoS Prevention

**Application Level:**
- Per-IP rate limit: 100 requests/minute.
- Per-user rate limit: Song requests 1 per 60 seconds.
- Per-endpoint rate limit: `/search` max 10 reqs/sec.

**Infrastructure Level:**
- Use Google Cloud Armor for DDoS protection.
- WAF rules: Block malicious payloads (SQLi, XSS).
- Implement CORS properly: Only allow requests from `.songflow.id` and `.tiktok.com`.

### 7.4 Privacy & Compliance

**Data Collection:**
- Collect: TikTok user ID, display name, Spotify user ID, song requests, analytics.
- Do NOT collect: Spotify passwords, credit card data, unnecessary personal info.

**GDPR & Local Privacy Laws:**
- Implement right to deletion: Users can request all data be purged.
- Implement data export: Users can download their data.
- Privacy policy: Clear, simple, in Bahasa Indonesia.
- Terms of service: Cover fair use, liability, refund policy (if Premium).

**Compliance:**
- Indonesia's PDP (Personal Data Protection) Law: Ensure compliance (current status: Being drafted; conservative approach recommended).
- TikTok API Terms: Don't store chat messages beyond session; don't resell data.
- Spotify ToS: Don't redistribute content; honor DMCA.

### 7.5 Content Moderation

**Auto-Filtering:**
- Block requests with banned words (configurable by streamer).
- Block requests from banned users.
- Filter explicit tracks if toggled off.

**Manual Moderation:**
- Streamer can remove songs from queue.
- Streamer can ban users.
- SongFlow admin can take action on reports.

**Reporting:**
- Users can report abusive streams or song requests.
- SongFlow team reviews and takes action (ban, warning, etc.).

---

## 8. Monetization Strategy

### 8.1 Free Tier

**Features:**
- Up to 500 requests per session.
- Up to 1,000 concurrent viewers.
- Overlay customization (basic themes).
- Basic analytics (session summary).
- Community support.

**Limitations:**
- 5 custom words in ban list.
- No advanced skip voting.
- SongFlow branding required on overlay.
- No priority support.

### 8.2 Premium Tier (Rp 49,000 / bulan)

**Additional Features:**
- Unlimited requests per session.
- Unlimited viewer capacity.
- Custom overlay design (CSS editor).
- Advanced analytics (historical, trend analysis).
- Gift-based VIP prioritization.
- Skip voting with custom threshold.
- 50+ words in ban list.
- Email & Discord support.
- Remove SongFlow branding from overlay.
- Custom domain overlay embed (optional).

### 8.3 Creator Tier (Rp 199,000 / bulan)

**Additional Features:**
- All Premium features.
- Multi-account management.
- Team member access (manage queue, analytics).
- Discord webhook integration (live alerts).
- Advanced fraud detection.
- Dedicated account manager.
- Co-streaming support (multiple streamers, single queue).
- Custom API access (for integrations).

### 8.4 Revenue Model

**Primary:** Subscription (SaaS).

**Secondary:**
- Marketplace: Streamers can purchase paid overlays, themes from designers (SongFlow takes 30% cut).
- Sponsored Music Promotions: Labels pay for playlist placement (if scale achieved).
- Premium API: Advanced access for third-party developers.

**Payment Methods (Indonesia-First):**
- GCash, Dana (mobile wallet).
- Bank transfer (BCA, Mandiri, BNI).
- Credit card (Visa, Mastercard).
- Stripe + fintech partners.

**Pricing by Region:**
- Indonesia: Rp pricing (lowest barrier to entry).
- Singapore/Malaysia: SGD pricing (premium market).
- Rest of Asia: USD pricing.

---

## 9. Go-to-Market Strategy

### 9.1 Target Segments

1. **DJs & Music Streamers** (5,000 potential users)
   - Pain: Manual setlist management.
   - Messaging: "Let your audience DJ your stream."
   - Channel: DJ communities, music production forums, TikTok music hashtags.

2. **Content Creators (Gamers, IRL Streamers)** (50,000+ potential users)
   - Pain: Static playlists, low engagement.
   - Messaging: "Interactive music = longer streams = more gifts."
   - Channel: Gaming communities, TikTok Creator Fund, YouTube.

3. **Streamers in Emerging Markets** (Very high TAM)
   - Pain: Limited monetization tools; seek new engagement angles.
   - Messaging: "Monetize engagement; let viewers feel heard."
   - Channel: Local streamers (KOLs), TikTok Shop integrations.

### 9.2 Acquisition Strategy

**Phase 1: Early Adopters (Months 1–3)**
- Approach top 100 Indonesian TikTok music streamers directly (personalized outreach).
- Offer free Premium tier for 3 months.
- Collect feedback; build case studies.
- Target: 500 active users.

**Phase 2: Community Growth (Months 4–6)**
- Launch referral program: 1 month free for every 3 friends referred.
- Create YouTube tutorials (Bahasa Indonesia) for onboarding.
- Sponsor 5–10 mid-tier creators (give them free Premium, feature them).
- Start Discord/Telegram community for users.
- Target: 2,000 active users.

**Phase 3: Paid Acquisition (Months 7–12)**
- TikTok & Instagram ads targeting creators.
- Google Ads for "TikTok live tools", "song request platform" keywords.
- Partnerships with creator platforms (e.g., KreatorID, Digimind).
- Press/media outreach (tech publications, music blogs).
- Target: 5,000+ active users.

### 9.3 Retention & Engagement

- Weekly email digest: "Your stream stats, top songs this week."
- In-app onboarding: Guided first session.
- Community contests: Top streamers featured.
- Product updates: Regular feature releases (cadence: bi-weekly).
- User feedback loop: Monthly surveys; implement top 3 requests.

---

## 10. Success Metrics & KPIs

### 10.1 North Star Metric

**Daily Active Streamers (DAS)** with active song requests.

**Target:** 1,000 DAS by end of Month 6; 5,000 DAS by Month 12.

### 10.2 Supporting Metrics

| Metric | Target (Month 6) | Target (Month 12) | Measurement |
|--------|------------------|-------------------|-------------|
| **Monthly Active Users (MAU)** | 3,000 | 10,000 | Unique logins / month |
| **Daily Active Users (DAU)** | 500 | 2,500 | Unique logins / day |
| **Avg Session Duration** | 45 min | 60 min | Minutes per stream |
| **Avg Requests per Session** | 30 | 50 | Total requests / session |
| **% Requests Fulfilled** | 85% | 92% | Queued / total sent |
| **7-Day Retention** | 25% | 40% | Users active day 7 / signups |
| **30-Day Retention** | 12% | 25% | Users active day 30 / signups |
| **Premium Conversion** | 5% | 12% | Paid users / total users |
| **MRR** | Rp 10M | Rp 50M | Monthly recurring revenue |
| **Churn Rate** | 20% | 12% | Churned / active |
| **NPS** | 40 | 55+ | Net Promoter Score |
| **Service Uptime** | 99.5% | 99.9% | % time operational |
| **API Latency (p95)** | <1s | <500ms | Queue-to-Spotify latency |

### 10.3 Health Checks

**Weekly:**
- DAS trend (up/flat/down).
- Critical errors (> 0.1% error rate).
- WebSocket drop rates.

**Monthly:**
- Cohort retention analysis.
- Premium conversion funnel.
- Customer support ticket volume.
- Churn analysis (why users leave).

---

## 11. Timeline & Roadmap

### Phase 1: MVP (Weeks 1–6, February–March 2026)

**Features:**
- TikTok OAuth + Spotify OAuth.
- TikTok Live chat listener (basic).
- Song request processing (search + queue).
- Streamer dashboard (basic).
- Overlay (minimal design).
- Rate limiting (per-user).

**Infrastructure:**
- Backend API (NestJS).
- PostgreSQL + Redis.
- Frontend (Next.js).
- WebSocket (Socket.io).
- Deployed to GCP Cloud Run.

**Deliverables:**
- Closed beta with 20 testers.
- Documentation (API, setup guide).
- YouTube onboarding video (Bahasa).

**Success Criteria:**
- 0 critical bugs.
- Average request processing < 2 seconds.
- 98%+ uptime during testing.

---

### Phase 2: Productionization (Weeks 7–10, April 2026)

**Features:**
- Advanced analytics (historical, trends).
- Customizable overlay themes.
- Content filtering (explicit, banned words).
- Manual skip + skip voting (beta).
- Ban/mute viewers.

**Infrastructure:**
- Monitoring & alerting (DataDog).
- Database backup & recovery.
- Load testing (100+ concurrent streamers).
- Auto-scaling setup.

**Deliverables:**
- Public beta (first 500 signups).
- FAQ + support docs.
- Community Discord.

**Success Criteria:**
- Incorporate feedback from 100+ beta testers.
- 50+ daily active beta streamers.
- NPS > 40.

---

### Phase 3: Launch (Week 11, Late April 2026)

**Announcements:**
- Tweet/TikTok launch announcement.
- Press outreach.
- Creator partnerships (launch day promotions).

**Features:**
- Premium tier available.
- Referral program.
- Basic support (email).

**Deliverables:**
- Marketing website (songflow.id).
- App onboarding flow optimized.
- Payment system live.

**Success Criteria:**
- 500+ signups in week 1.
- 100+ DAS by end of week 2.

---

### Phase 4: Growth (Months 5–6, May–June 2026)

**Features:**
- Gift-based VIP prioritization.
- Viewer account system (optional sign-in).
- Mobile dashboard (responsive improvements).
- Integration with TikTok Shop (future monetization).

**Marketing:**
- Paid ads (TikTok, Instagram, Google).
- Creator partnerships (10+ sponsored streamers).
- Community contests.

**Targets:**
- 2,000 MAU by end of Month 5.
- 5% premium conversion by end of Month 6.

---

### Post-Launch Roadmap (Q3–Q4 2026)

**Q3:**
- Twitch integration.
- YouTube Live integration.
- Joox / YouTube Music support (for non-Spotify users).
- Advanced multi-session management.
- Team accounts (manage multiple streamers).

**Q4:**
- Custom API access for developers.
- Marketplace (themes, overlays).
- Streaming analytics API.
- International expansion (Philippines, Vietnam, Thailand).

---

## 12. Risks & Mitigation

### 12.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| TikTok API changes break live chat listener | Medium | Critical | Monitor TikTok dev updates; maintain fallback; community libs. |
| Spotify API rate limits (too many requests) | Medium | High | Implement request batching, queue backoff, caching. |
| WebSocket connections drop frequently | Medium | High | Implement reconnect logic with exponential backoff. |
| Database performance degrades | Low | High | Regular monitoring, indexing optimization, read replicas. |
| DDoS attack on backend | Low | Critical | Use GCP Armor, rate limiting, WAF rules. |

### 12.2 Market Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Competitors launch similar product | High | High | Build strong community, focus on UX, lock-in features (analytics, team accounts). |
| TikTok ban or policy change | Low | Critical | Diversify to YouTube/Twitch early; monitor policy changes. |
| Low adoption (fewer than 1K MAU in Month 6) | Medium | Critical | Pivot to different creator segment (e.g., Twitch DJs); improve onboarding; increase marketing spend. |
| Premium tier has <3% conversion | Medium | High | Shift to freemium model with hard limits; improve premium messaging; test pricing. |

### 12.3 Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Team member leaves (loss of institutional knowledge) | Low | Medium | Document code heavily; cross-train team; maintain strong code standards. |
| Data breach (leaked Spotify tokens) | Low | Critical | Encrypt sensitive data; implement strong access controls; security audits; incident response plan. |
| Support tickets overwhelm small team | Medium | Medium | Build self-service FAQ; community support; hire support contractor in Month 4. |

---

## 13. Success Criteria & Exit Metrics

### 13.1 6-Month Milestones

- ✅ 5,000+ registered users.
- ✅ 500+ daily active streamers.
- ✅ 50,000+ monthly song requests.
- ✅ 40+ NPS.
- ✅ Rp 10M+ MRR.
- ✅ 35%+ 7-day retention.
- ✅ 99.5%+ uptime.

### 13.2 12-Month Milestones

- ✅ 10,000+ MAU.
- ✅ 2,000+ daily active streamers.
- ✅ 300,000+ monthly song requests.
- ✅ 55+ NPS.
- ✅ Rp 50M+ MRR.
- ✅ 40%+ 7-day retention; 25%+ 30-day retention.
- ✅ Profitability (positive unit economics).
- ✅ Acquisition cost < Rp 20K per user.

### 13.3 Strategic Exit Options

1. **Acquisition:** By TikTok, Spotify, or streaming platform (if proven unit economics).
2. **Self-funded Growth:** Profitable SaaS; target Rp 500M+ ARR within 3 years.
3. **Series A Funding:** If hitting growth targets, seek VC funding for regional expansion.

---

## 14. Appendices

### 14.1 Glossary

| Term | Definition |
|------|-----------|
| **DAS** | Daily Active Streamers (users with active song requests). |
| **MAU** | Monthly Active Users (unique logins in a month). |
| **MRR** | Monthly Recurring Revenue (from subscriptions). |
| **NPS** | Net Promoter Score (customer satisfaction metric). |
| **OAuth** | Open standard for authorization; used for TikTok & Spotify login. |
| **WebSocket** | Bidirectional communication protocol; used for real-time updates. |
| **Overlay** | Browser-based UI displayed on top of stream (via OBS/TikTok Live Studio). |
| **VIP** | Very Important Person; prioritized queue due to gift or subscription. |
| **Queue** | List of upcoming songs to be played on Spotify. |

### 14.2 References

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [TikTok Live Connector Library](https://github.com/zerodytrash/tiktok-live-connector)
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Indonesia PDP Law Overview](https://www.lokadata.id/artikel/digital-privacy)

### 14.3 Contact & Support

**Product Owner:** Ethan Buntario (CTO, NOICE)  
**Email:** [Contact email]  
**Slack:** #songflow-product  
**Github:** [Repo link]  

---

**Document Version:** 1.0  
**Last Reviewed:** January 28, 2026  
**Next Review:** February 28, 2026