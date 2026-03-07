# ScriptEngine — Product Requirements Document

**Version:** 1.0
**Date:** March 2026
**Status:** Pre-seed concept
**Origin:** Extracted from Or This? content engine (internal tooling → standalone SaaS)

---

## 1. Vision & Problem Statement

### The Problem

Content creators spend 2–4 hours writing a single short-form video script. Most of that time is wasted on:
- Figuring out what angle to take (hook ideation)
- Translating ideas into exact, spoken words that feel natural on camera
- Researching data points to make claims credible
- Formatting for teleprompter use
- Writing captions and hashtags per platform

The result: creators post less frequently, rely on the same 3 formats, and never build the systematic content engine that grows channels.

### The Solution

ScriptEngine generates production-ready short-form video scripts with exact words to say, camera directions, B-roll suggestions, data references, and platform-optimized captions — all from a creator's niche and content goals.

The built-in teleprompter lets creators read and record directly from their phone in one session. No separate tool. No copy-paste. Film your script the moment it's generated.

### The Difference

Other AI writing tools generate copy. ScriptEngine generates **filmable content** — structured like a production brief, with timing, blocking, and spoken words that fit inside a 60-second format. The teleprompter closes the loop between generation and creation.

---

## 2. Target Users

### Primary

**Solo creators** — individuals building a personal brand or business channel on TikTok, Instagram Reels, or YouTube Shorts. They film their own content with a phone, no crew. They know their niche but struggle with consistent output.

**Small business owners** — restaurants, boutiques, service businesses filming product/culture content. No dedicated content team. Need scripts that feel authentic, not corporate.

### Secondary

**Agency teams** — content agencies managing 5–20 creator accounts. Need scalable script production with niche customization per client. Current workflow: one copywriter per creator.

**Founders building personal brands** — CEOs and startup founders who want to document their journey but can't write scripts. High motivation, low time.

### Not (Initial Target)

- Enterprise brands with dedicated creative teams
- Long-form YouTube creators (10+ minute videos)
- Scripted entertainment (fiction, branded series)

---

## 3. Core Features

### 3.1 Daily Script Generation

- Configurable daily count: 1 (Free), 5 (Pro), 15 (Team)
- Configurable format mix per day:
  - `series_episode`: Part of a multi-video series on a topic
  - `data_drop`: One counterintuitive stat or data point
  - `trend_take`: Hot take on what's trending in the niche
  - `style_tip` / `niche_tip`: One actionable, specific recommendation
- Each script includes:
  - **Cold Open** (5s) — exact words + camera direction (stop the scroll)
  - **Sections** (10–25s each) — labeled segments with exact words, camera direction, B-roll suggestion, text overlay suggestion, data point reference
  - **Call to Action** (10s) — exact words + camera direction
  - **Teleprompter text** — all spoken words as a continuous, readable paragraph
  - **Caption** — platform-formatted with line breaks
  - **Hashtags** — niche-relevant set, configurable count
  - **Total duration** — estimated from section lengths

### 3.2 In-App Teleprompter Camera

- Full-screen camera view with scrolling text overlay
- Tap to start/stop scroll
- Speed slider: 0.5× to 2.0× reading speed
- Recording mode: captures video with auto-start when scroll begins
- Auto-save to device camera roll on stop
- "Film This" CTA on every script card in the library
- Teleprompter text auto-populated from script's teleprompterText field

### 3.3 Niche Knowledge Bases

ScriptEngine ships with pre-built knowledge bases for:
- **Fashion & Style** — trend data, outfit scoring patterns, seasonal calendars (extracted from Or This?)
- **Fitness & Wellness** — training science, nutrition basics, recovery protocols
- **Food & Cooking** — recipe formats, flavor pairing, technique guides
- **Tech & Apps** — product reviews, how-to formats, comparison frameworks
- **Finance** — personal finance concepts, investment basics, budgeting frameworks
- **Business & Entrepreneurship** — startup playbook, founder stories, growth tactics

Each knowledge base provides:
- Domain-specific data sources (APIs, RSS, curated datasets)
- Niche vocabulary and terminology
- Proven format templates for that vertical
- Trending topic feeds (scraped weekly)

Custom knowledge bases available on Team/Enterprise tier: upload CSVs, PDFs, product data sheets.

### 3.4 Series Management

- Create named series with episode count and topic arc
- Auto-rotation: ScriptEngine advances the series automatically each run
- Series overview: visual map of episodes generated, filmed, and posted
- Episode templates: intro format consistent across all episodes in a series
- Series status: `in_progress`, `complete`, `archived`

### 3.5 Script Library with Filming Status

- Three-status workflow: `ready → filmed → posted`
- One-tap status updates from list or detail view
- Filter by: status, content type, series, date range
- Quick preview: cold open + duration visible in list
- Sort by: newest, filming priority, series order

### 3.6 Caption & Hashtag Generation

- Platform-specific formatting:
  - TikTok: 150 chars + line breaks + hashtags in comment
  - Instagram Reels: 2,200 char limit, hashtag blocks, emojis
  - YouTube Shorts: title-focused, description with timestamps
- Hashtag strategy: niche hashtags + trending hashtags + branded hashtag
- Configurable hashtag count (5–30)
- Caption tone: conversational, educational, provocative, data-driven

---

## 4. Intelligence Layer

### 4.1 Trend Intelligence

- **Platform trend feeds**: TikTok trending sounds/formats (via unofficial API), Instagram trending audio, YouTube Shorts trending topics
- **Niche-specific trend monitoring**: RSS + Google Trends for niche keywords, configurable per creator
- **Trend scoring**: recency × engagement proxy → hot / warm / cooling / avoid
- **Trend injection**: data_drop and trend_take scripts pull from the weekly trend scan
- **Trend calendar**: creators see upcoming seasonal opportunities 2 weeks ahead

### 4.2 Script Calibration Loops

After posting, creators log performance (views, likes, shares, follows gained). ScriptEngine tracks which script formats perform best per creator:
- Which cold open styles drive highest watch-through
- Which content types convert to follows
- Which series topics hold audience week-over-week

This data feeds back into the generation prompts via per-creator calibration context:
- "Your data_drop scripts average 2.3× more shares than trend_takes"
- "Series episodes in the 'Business' category retain 40% more viewers"

Calibration requires minimum 10 posted scripts before personalization kicks in. Before that, niche-level averages apply.

### 4.3 Niche Knowledge Bases (Intelligence)

Domain-specific data provides the "proof" layer that makes scripts credible:
- Fashion: Or This? scoring patterns, seasonal trend data
- Fitness: published study abstracts (PubMed integration), RDA guidelines
- Finance: current rates (FRED API), historical market data
- Food: USDA nutritional data, flavor pairing research

Knowledge base data refreshes weekly. Creators can flag incorrect data points.

### 4.4 A/B Prompt Versioning

- Two active prompt versions per creator at any time: `current` and `challenger`
- Challenger generates 20% of scripts
- After 20 scripts in each variant, ScriptEngine evaluates based on creator-reported performance
- If challenger wins (statistically significant): auto-promote to current
- Prompt version stored on every script for traceability
- Founder/admin can inspect prompt evolution per creator

---

## 5. Architecture

### 5.1 Multi-Tenant SaaS Design

Each creator account is a tenant. Tenant isolation at the data layer:
- All tables include `tenantId` (= creator account ID)
- Niche knowledge bases: global (shared) + custom (per-tenant)
- Prompt versions: global baseline + per-tenant fine-tuning layer
- Rate limits enforced per tenant via `AgentConfig` table

No cross-tenant data sharing. Calibration is per-tenant only.

### 5.2 Tech Stack

| Layer | Technology |
|---|---|
| API | Node.js + Express + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| AI Generation | Google Gemini 2.5 Flash (primary), Gemini 2.5 Flash Lite (cost-sensitive paths) |
| Auth | Clerk (JWT, social login, org support for Team tier) |
| Mobile App | React Native + Expo SDK 54 |
| Camera | expo-camera (CameraView, video mode) |
| Teleprompter scroll | React Native Animated.timing |
| Video save | expo-media-library |
| Email | Resend |
| Payments | RevenueCat (mobile IAP) + Stripe (web) |
| Hosting | Railway (API) + Expo EAS (mobile) |

### 5.3 Origin: Extracted from Or This?

ScriptEngine's core is the content engine built for Or This? in March 2026:
- `generateDailyScripts()` → ScriptEngine's generation core
- `SERIES_POOL` → extensible per-niche series templates
- `teleprompter.tsx` → teleprompter camera component
- `BlogDraft` model → `Script` model (renamed, extended)
- `founder-content-digest` email → creator daily script email

The Or This? version is fashion-specific. ScriptEngine generalizes it across niches via configurable knowledge bases.

### 5.4 Data Model (Core Tables)

```
Tenant (creator account)
  ├── Script (generated scripts)
  │   ├── scriptType: series_episode | data_drop | trend_take | niche_tip
  │   ├── contentType (platform target)
  │   ├── scriptData: JSON (coldOpen, sections, callToAction, teleprompterText, ...)
  │   ├── filmingStatus: ready | filmed | posted
  │   ├── promptVersion: FK → PromptVersion
  │   └── performance: JSON (views, likes, shares, follows — creator-reported)
  ├── Series
  │   ├── episodes: FK → Script[]
  │   └── status: in_progress | complete | archived
  ├── KnowledgeBase (custom, per-tenant)
  │   └── entries: { key, value, source, refreshedAt }
  ├── PromptVersion
  │   ├── variant: current | challenger
  │   └── promptTemplate: text
  └── CalibrationSnapshot
      └── scriptFormatPerformance: JSON
```

### 5.5 Teleprompter Architecture

```
CameraView (expo-camera)
  └── mode="video"
  └── ref → start/stopRecording()

Teleprompter overlay (absolute positioned)
  └── ScrollView (controlled scroll via Animated.timing)
  └── Speed slider (Animated.timing duration multiplier)
  └── Tap-to-pause/resume gesture

Recording lifecycle:
  1. User taps "Start" → camera starts recording + scroll begins
  2. User taps "Stop" → camera stops → expo-media-library saves to camera roll
  3. Script filmingStatus updates to 'filmed'
```

---

## 6. Monetization

### Free Tier
- 1 script per day (niche_tip only)
- No teleprompter
- 1 niche (fashion or user's chosen vertical)
- 7-day script history

### Pro ($9.99/month or $79.99/year)
- 5 scripts per day (all format types)
- Teleprompter camera
- All 6 built-in niches
- Full script history
- Series management
- Caption + hashtag generation (all platforms)
- Script calibration (after 10 posted scripts)

### Team ($29.99/month or $239.99/year)
- 15 scripts per day
- Up to 5 team members (Clerk org)
- Custom knowledge bases (CSV/PDF upload)
- White-label caption style
- Priority AI processing
- CSV export of script library

### Enterprise (Custom pricing)
- Unlimited scripts
- White-label mobile app
- API access (generate scripts programmatically)
- Dedicated knowledge base curation
- SLA + dedicated support
- Multi-brand management

---

## 7. Competitive Landscape

| Competitor | What They Do | ScriptEngine's Advantage |
|---|---|---|
| **Jasper / Copy.ai** | Long-form AI copywriting, broad use cases | ScriptEngine is short-form video only — structured for filming, not reading |
| **Opus Clip** | Repurposes long video into shorts | ScriptEngine starts from scratch — no long video required |
| **Descript** | Audio/video editing with AI transcription | Descript edits existing footage; ScriptEngine creates the script before filming |
| **ChatGPT** | Generic AI generation | No structure, no teleprompter, no niche data, no series management |
| **Autopilot / Lately** | Social media scheduling + repurposing | No script generation, no teleprompter, no filming workflow |

**Our position:** The only tool that takes a creator from "I need to post today" to phone in hand, reading a script, in under 5 minutes.

---

## 8. Roadmap

### Phase 1 — MVP (Months 1–2)
Extract and generalize the Or This? content engine for one additional niche:
- Script generation for fashion + fitness verticals
- Teleprompter camera (iOS first)
- Script library with filming status
- Daily email with today's script queue
- Series management (basic)
- Free and Pro tiers

**Validation goal:** 100 paying Pro users, avg 3+ scripts filmed/week.

### Phase 2 — Multi-Niche + Performance Tracking (Months 3–5)
- All 6 built-in knowledge bases live
- Creator-reported performance logging (views, follows)
- Script calibration loops activated (after 10 posts)
- Android teleprompter
- A/B prompt versioning (experimental, founder-controlled)
- Instagram Reels and YouTube Shorts caption formats

**Validation goal:** 500 paying Pro users, measurable script → performance correlation.

### Phase 3 — Team Features + Custom Knowledge (Months 6–9)
- Team tier: multi-member accounts, shared library
- Custom knowledge base upload (CSV, PDF)
- API access (beta)
- Platform analytics integration (TikTok API, Instagram Basic Display)
- Automated performance import (replaces manual logging)

**Validation goal:** 50 paying Team accounts, 3+ Enterprise pipeline conversations.

### Phase 4 — Marketplace (Months 10–18)
- Creators publish script templates to a marketplace
- Other creators buy/use niche-specific template packs
- Revenue share: 70% to template creator, 30% to ScriptEngine
- Featured series packs (e.g., "30-day Fitness Challenge" series)
- White-label licensing for agencies

---

## 9. Success Metrics

### User Engagement
- **Scripts generated per DAU**: target ≥ 5 for Pro, ≥ 1 for Free
- **Teleprompter usage rate**: % of Pro scripts that reach "filmed" status — target ≥ 40%
- **Series completion rate**: % of started series that reach Episode 4+ — target ≥ 30%

### Growth
- **Free → Pro conversion**: target ≥ 8% (industry avg: 3–5%)
- **D7 retention** (Free): target ≥ 25%
- **D30 retention** (Pro): target ≥ 60%

### Revenue
- **MRR at 6 months**: $15K (150 Pro + 10 Team)
- **MRR at 12 months**: $60K (500 Pro + 30 Team + 2 Enterprise)
- **CAC**: < $40 (organic creator community + paid social)
- **LTV/CAC**: ≥ 5×

### Intelligence Quality
- **Script calibration activation**: % of Pro users with 10+ posted scripts — target ≥ 30% by Month 6
- **Creator-reported CTR lift**: scripts with calibration applied vs. baseline — target +20%

---

## 10. Technical Requirements

### 10.1 API Specification (Core Endpoints)

```
POST   /api/scripts/generate          Generate daily scripts for tenant
GET    /api/scripts/today             Today's generated scripts
GET    /api/scripts/recent?days=7     Recent scripts
GET    /api/scripts/:id               Single script detail
PATCH  /api/scripts/:id/status        Update filming status
POST   /api/scripts/:id/performance   Log performance data

GET    /api/series                    List series
POST   /api/series                    Create series
GET    /api/series/:id/episodes       Episodes for series

GET    /api/knowledge-base            List knowledge base entries
POST   /api/knowledge-base/upload     Upload custom CSV/PDF

GET    /api/calibration               Current calibration snapshot
POST   /api/calibration/refresh       Trigger recalibration
```

### 10.2 Infrastructure

| Concern | Approach |
|---|---|
| **AI cost control** | Token budget service: daily cap per tenant by tier (Free: 10K, Pro: 200K, Team: 1M tokens) |
| **Generation latency** | Pre-generate at 6am UTC daily, not on-demand. Scripts available when creator opens app. |
| **Concurrency** | Bull queue for generation jobs. One job per tenant per day. |
| **Prompt versioning** | Every script stores `promptVersionId`. Rollback = restore prompt version. |
| **Knowledge base refresh** | Background job, weekly per niche. Tenant custom bases refresh on upload. |
| **Data residency** | US-only initially (Railway US East). EU expansion Phase 3. |

### 10.3 Security

- **Tenant isolation**: Row-level security enforced at query layer (tenantId required on all queries)
- **Auth**: Clerk JWT, verified server-side on every request
- **Rate limiting**: Per-tenant, per-endpoint, enforced at middleware layer
- **Script data**: No PII in scriptData JSON. Teleprompter recordings never stored server-side — saved directly to device.
- **Custom knowledge base uploads**: Virus scan (ClamAV) before processing. Size limit: 10MB per file, 100MB per tenant.
- **API keys**: Tenant API keys for Enterprise tier, scoped to read/write scripts only. No admin access via API.

### 10.4 Performance SLAs

- Script generation (daily batch): complete within 5 minutes of 6am UTC trigger
- API responses (read endpoints): p95 < 200ms
- Teleprompter scroll: no frame drops on iPhone 12+ / mid-range Android (React Native Animated, no JS bridge for scroll)
- Video save (expo-media-library): < 3 seconds for 60-second 1080p clip

---

*ScriptEngine is a standalone product extracted from the Or This? content engine. The core generation logic, series rotation, and teleprompter UX were proven in production before being generalized for this product.*
