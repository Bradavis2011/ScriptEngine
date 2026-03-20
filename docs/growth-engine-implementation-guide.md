# Growth Engine Implementation Guide

A step-by-step walkthrough of every system built across the ClipScript growth sessions. Written so a fresh Claude Code session can replicate this on any Node/Express/Postgres project.

---

## What Was Built (Overview)

Three autonomous loops running permanently on Railway:

1. **Programmatic SEO Engine** — Generates 70+ static landing pages targeting long-tail keywords. Runs at deploy time (Vercel build step) and on-demand via a BullMQ worker. Pages live at `/s/[slug]`.

2. **Pain Point Intelligence Pipeline** — Scrapes Reddit every 6 hours for posts where creators express frustration. AI scores each post, extracts a target keyword, and auto-queues a new SEO page if the score is high enough.

3. **Growth Learning Loop** — Tracks outreach template performance, proposes AI-generated challengers, and auto-promotes winners. Runs nightly.

All three share a **BullMQ job scheduler** backed by Redis, and all workers are started at API boot from a single `startGrowthWorkers()` call.

---

## Tech Stack Prerequisites

These must be in place before implementing anything below:

| Service | Purpose | Notes |
|---------|---------|-------|
| **PostgreSQL** | Persistent state for all growth data | Railway provisioned |
| **Redis** | BullMQ job queue backend | Railway add-on |
| **Gemini 2.5 Flash** | AI scoring, keyword extraction, content generation | `gemini-2.5-flash` model ID |
| **Railway** | API hosting + worker runtime | Set `REDIS_URL` env var |
| **Vercel** | Static site hosting | Set `VERCEL_DEPLOY_HOOK_URL` env var in Railway |
| **Reddit API** | Pain point scraping | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_REFRESH_TOKEN` env vars |

---

## Part 1: The Job Queue (BullMQ)

### File: `packages/api/src/growth/queues.ts`

The queue layer is the spine of the entire system. Everything else is just a worker registered here.

**Key patterns:**

```typescript
// Parse REDIS_URL into connection options manually — do NOT pass an ioredis instance
// BullMQ bundles its own ioredis and the types are incompatible
export function getConnectionOptions(): ConnectionOptions {
  const url = new URL(process.env.REDIS_URL!);
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379'),
    password: url.password || undefined,
    maxRetriesPerRequest: null, // required by BullMQ
  };
}
```

**Queue names and schedules (cron):**

| Queue | Schedule | Purpose |
|-------|----------|---------|
| `reddit-discovery` | `0 */4 * * *` | Every 4h — find relevant Reddit threads |
| `pain-point-scrape` | `0 */6 * * *` | Every 6h — score pain points, queue SEO pages |
| `creator-discovery` | `0 2 * * *` | Daily 2AM — find YouTube creator prospects |
| `growth-learning` | `0 23 * * *` | Daily 11PM — evaluate A/B templates |
| `daily-brief` | `0 7 * * *` | Daily 7AM — email growth summary |
| `seo-content` | triggered on demand | Runs after pain point scrape produces pages |

**Job defaults (all queues):**

```typescript
export const JOB_DEFAULTS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 30_000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};
```

### File: `packages/api/src/growth/startWorkers.ts`

`startGrowthWorkers()` is called once from `packages/api/src/index.ts` at boot. It:

1. Calls `queue.upsertJobScheduler()` for each cron schedule — **idempotent on restart**, so it's safe to call every boot
2. Spins up one `Worker` per queue with `concurrency: 1`
3. Seeds default growth templates (idempotent)

**Call it from your API entry point:**

```typescript
import { startGrowthWorkers } from './growth/startWorkers';
// inside your async startup:
await startGrowthWorkers();
```

---

## Part 2: The Programmatic SEO Engine

### Architecture

```
Railway worker (BullMQ)
  └─ runSeoContent()
       ├─ Build 70 page definitions (niche × city matrix + how-to pages)
       ├─ Skip already-published slugs
       ├─ For each: call Gemini → upsert SeoPage in DB (status: 'published')
       ├─ Also process any status:'queued' pages (from pain point pipeline)
       └─ Trigger Vercel deploy hook if anything was generated

Vercel build step (package.json "postbuild")
  └─ node scripts/generate-seo-pages.mjs
       ├─ Fetch all published pages from GET /api/seo/pages
       ├─ Render static HTML for each → dist/s/[slug]/index.html
       └─ Generate sitemap.xml
```

### The 70-Page Matrix

Three page types:

**niche pages (10)** — `tiktok-scripts-for-[niche]`
Niches: Real Estate, Fitness, Finance, Food, Beauty, Fashion, Tech, Business, Travel, Education

**niche×city pages (50)** — `tiktok-scripts-for-[niche]-[city]`
Cities: Austin TX, Miami FL, Los Angeles CA, New York NY, Dallas TX
(10 niches × 5 cities = 50)

**how-to pages (10)** — e.g. `how-to-write-tiktok-scripts`
Topics: write tiktok scripts, use a teleprompter for tiktok, write short form video scripts, etc.

**Adapt for your project:** Replace the NICHES/CITIES/HOWTO_TOPICS arrays with whatever is relevant to your product. The schema and generation logic are identical.

### The Gemini SEO Content Generator

**File:** `packages/api/src/lib/seoGenerator.ts`

Uses Gemini structured JSON output (not raw text parsing). The schema enforces:

```
pageTitle (string)
metaDescription (string)
h1 (string)
introHtml (string — only <p>, <strong>, <em> tags)
scripts[] — 3 complete teleprompter-ready scripts, each with:
  hookLine, teleprompterText, caption, hashtags[], durationSeconds, bRollNotes
tips[] — 5 actionable tips
faqs[] — 5 FAQ pairs
```

**Critical prompt patterns:**
- `pageTitle` under 60 chars, keyword-rich
- `metaDescription` 140-155 chars with keyword + value prop
- Scripts use **natural spoken language** — short punchy sentences, line breaks at pauses
- Tips start with a verb, are specific (not generic)
- FAQs match real search query patterns

**90-second timeout** wrapping the Gemini call — SEO pages are long-form and can be slow.

**2-second sleep between pages** to avoid rate limits on bulk generation.

### The Static HTML Renderer

**File:** `packages/web/scripts/generate-seo-pages.mjs`

Pure Node.js — no React, no bundler, no dependencies. Runs as a postbuild script.

Key SEO elements generated for every page:
- `<link rel="canonical">`
- OG tags (title, description, image, type, url)
- Twitter card meta
- Three JSON-LD schemas: Article, FAQPage, BreadcrumbList
- Breadcrumb nav HTML
- Internal links to 8 related pages (drives crawl depth and PageRank distribution)

**Internal linking strategy** (important for SEO):
- Niche page → 5 city variants + 4 other niches
- Niche×city page → parent niche + 3 sibling cities + 3 other niches in same city
- How-to page → 5 niche pages

**Inline CTA placement:** After script 2, a `$25 Script Pack` CTA is injected mid-page. After the tips section, a full dual CTA (pack + concierge) closes the page.

**Sitemap:** `dist/sitemap.xml` with priority scores:
- niche pages: `0.8`
- niche_city pages: `0.7`
- how-to pages: `0.6`

**Trigger mechanism:** After any pages are generated, the Railway worker POSTs to `VERCEL_DEPLOY_HOOK_URL`. Vercel rebuilds, `generate-seo-pages.mjs` runs, new pages go live. Zero manual intervention.

### Wire It Into the Build

In `packages/web/package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "postbuild": "node scripts/generate-seo-pages.mjs"
  }
}
```

In `packages/api/src/routes/` — add a public SEO pages endpoint:

```typescript
// GET /api/seo/pages — no auth, used by generate-seo-pages.mjs at build time
router.get('/pages', async (req, res) => {
  const pages = await prisma.seoPage.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'asc' },
  });
  res.json(pages);
});
```

---

## Part 3: Pain Point Intelligence Pipeline

### Architecture

```
runPainPointScrape() — runs every 6h
  ├─ For each subreddit × keyword combination:
  │    ├─ searchSubreddit(subreddit, keyword) → Reddit API
  │    ├─ Skip deleted authors and already-seen sourceIds
  │    ├─ scorePainPoint(title, body) → Gemini → 3 scores + categories
  │    └─ If score >= 7 AND relevance >= 7:
  │         ├─ extractSeoKeyword(categories, marketingAngle) → Gemini
  │         ├─ Dedup check (slug + keyword prefix)
  │         └─ prisma.seoPage.create({ status: 'queued' })
  └─ Trigger SEO content job if any pages were queued
```

### Pain Point Scoring (Gemini)

**File:** `packages/api/src/growth/services/painPointAnalyzer.ts`

Three dimensions scored 1-10:

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| `painIntensity` | 30% | How much frustration is expressed |
| `relevance` | 40% | How relevant to your product specifically |
| `actionability` | 30% | How actionable for marketing/product |

`overallScore = painIntensity×0.3 + relevance×0.4 + actionability×0.3`

Also extracts:
- `categories` — 2-4 tags (e.g. "scripting", "camera_anxiety", "content_ideas")
- `marketingAngle` — one sentence of ad copy this pain point inspires
- `productInsight` — one feature idea this reveals

**Threshold:** `overallScore >= 7 AND relevance >= 7` to auto-queue an SEO page.

### Keyword Extraction (Gemini)

A second Gemini call extracts a **3-6 word long-tail keyword** from the pain point's categories and marketing angle. It also identifies the primary niche.

Slug format: `pp-[slugified-keyword]` (max 100 chars)

**Dedup logic:** Before creating, checks for exact slug match OR keyword that starts with the same first word. This prevents near-duplicate pages.

### Subreddits and Keywords to Watch

Default subreddits: `NewTubers`, `ContentCreators`, `youtubers`, `Entrepreneur`, `TikTok`, `InstagramMarketing`, `SmallYTChannel`

Default pain keywords: `struggling with`, `can't figure out`, `so frustrated`, `hate being on camera`, `don't know what to say`, `ran out of ideas`, `scripting takes forever`

**Adapt for your project:** Replace these with the subreddits and phrases where your target users express pain. The scoring logic and pipeline are identical.

---

## Part 4: The Prisma Data Models

### SeoPage

```prisma
model SeoPage {
  id              String    @id @default(cuid())
  slug            String    @unique
  pageType        String    // "niche" | "niche_city" | "howto" | "pain_point"
  targetKeyword   String
  niche           String
  city            String?
  pageTitle       String
  metaDescription String
  h1              String
  contentJson     Json      // { scripts[], tips[], faqs[], introHtml }
  status          String    @default("draft") // draft | queued | published | refresh_queued
  painPointId     String?   // source PainPoint id if auto-generated from pain pipeline
  refreshedAt     DateTime?
  generatedAt     DateTime  @default(now())
  publishedAt     DateTime?
  updatedAt       DateTime  @updatedAt

  @@index([status])
  @@index([pageType, niche])
}
```

`status: 'queued'` is the handoff between the pain point pipeline and the content generator. The pain point scraper creates pages at `queued`; the SEO content worker picks them up and moves them to `published`.

### PainPoint

```prisma
model PainPoint {
  id              String    @id @default(cuid())
  source          String    // "reddit"
  sourceId        String    @unique  // Reddit post ID — prevents duplicate processing
  sourceUrl       String
  subreddit       String?
  title           String?
  body            String    // truncated to 2000 chars
  author          String
  painIntensity   Float
  relevance       Float
  actionability   Float
  overallScore    Float
  categories      String[]
  marketingAngle  String?
  productInsight  String?
  usedInCopy      Boolean   @default(false)
  discoveredAt    DateTime  @default(now())

  @@index([overallScore])
}
```

### GrowthTemplate (for the learning loop)

```prisma
model GrowthTemplate {
  id            String    @id @default(cuid())
  contentType   String    // reddit_comment | creator_dm | warming_comment
  template      String
  status        String    @default("current") // current | challenger | retired
  source        String    @default("manual")  // manual | ai_growth_lab
  parentId      String?
  avgScore      Float?
  usageCount    Int       @default(0)
  createdAt     DateTime  @default(now())

  @@index([contentType, status])
}
```

### GrowthEvent (audit log)

```prisma
model GrowthEvent {
  id          String    @id @default(cuid())
  channel     String    // reddit | creator | pain_point | learning
  eventType   String    // discovery | comment | dm | brief_sent | learning_run
  entityId    String?
  data        Json?
  createdAt   DateTime  @default(now())

  @@index([channel, eventType])
  @@index([createdAt])
}
```

---

## Part 5: The Growth Learning Loop

### How It Works

**File:** `packages/api/src/growth/workers/growthLearning.ts`

Runs nightly (11PM UTC). For each tracked content type (currently `reddit_comment`):

1. Pull all comments for the `current` and `challenger` template versions
2. Calculate average karma per template
3. If challenger has >= 10% improvement AND >= 10 samples: **promote challenger to current**
4. Regardless of outcome: ask Gemini to propose a new challenger based on current performance

**Promotion threshold:** 10% improvement, minimum 10 samples each.

**Challenger creation:** Gemini receives the current template + performance metrics and generates an improved version. The improved version is saved as `status: 'challenger'` and used on the next batch of outreach.

### The A/B Test Pattern

This pattern applies to any outreach template:

```
1. Seed one "current" template manually
2. First learning run: propose a challenger (since < 10 samples)
3. Use both templates across outreach (tag each action with templateVersion)
4. After 10 samples each: compare → promote winner
5. Always propose a new challenger → testing never stops
```

**Seed templates with `seedGrowthTemplates()`** — called at worker boot, idempotent.

---

## Part 6: Deployment Architecture

### Railway Workers

The API process runs **both** the HTTP server AND the BullMQ workers. There is no separate worker dyno — `startGrowthWorkers()` is called alongside `app.listen()`.

This works fine for a single-server setup. Workers are `concurrency: 1` so they don't compete with themselves on restart.

### Vercel Deploy Hook

Set `VERCEL_DEPLOY_HOOK_URL` in Railway env vars. Get it from: Vercel project → Settings → Git → Deploy Hooks → Create hook.

The SEO content worker POSTs to this URL after generating any new pages. Vercel rebuilds automatically, `generate-seo-pages.mjs` fetches fresh DB state and writes new static HTML.

**Round-trip time:** ~2-3 minutes from "new SEO page generated" to "live on Vercel."

### The `seo.css` File

The static HTML pages reference `/seo.css`. This must be in `packages/web/public/seo.css` so Vite copies it to `dist/` during build. It's loaded at runtime by the static HTML — it is NOT bundled.

---

## Part 7: What to Adapt for a New Project

When applying this system to a different URL/product, change these things and nothing else:

### 1. The keyword matrix (seoContent.ts)

Replace NICHES, CITIES, and HOWTO_TOPICS with whatever matches your product's search intent. Keep the same structure — the generation logic is identical.

### 2. The subreddits and pain keywords (painPointScrape.ts)

Replace with the communities where your target users talk. Keep the scoring dimensions — just retune the `relevance` scoring prompt to describe your product instead of "AI video scripting and teleprompter tools."

### 3. The Gemini SEO prompt (seoGenerator.ts)

Replace all references to "ClipScript", "teleprompter", "short-form video scripts" with your product. Keep the schema, the structured output approach, and the prompt structure.

### 4. The HTML renderer (generate-seo-pages.mjs)

Replace the CTA copy, product name, and pricing. The internal linking logic, schema markup, and breadcrumb generation are generic and should stay as-is.

### 5. The pain point scoring prompt (painPointAnalyzer.ts)

Replace the `relevance` description: "How relevant to AI script generation + teleprompter tools?" → describe what's relevant to your product. Everything else is generic.

---

## Part 8: Critical Lessons & Gotchas

### The PORT mismatch bug (Railway)
Railway injects `PORT=8080` by default, but Vercel's Railway integration routes to port 3001. **Explicitly set `PORT=3001` as a Railway env var.** The healthcheck hits the container directly and passes even when external requests are 502ing — don't trust healthchecks as proof of external reachability.

### BullMQ + ioredis type conflict
Never pass an `ioredis` instance to BullMQ. Always pass a plain `ConnectionOptions` object. BullMQ bundles its own version of ioredis and the types are incompatible.

### `upsertJobScheduler` replaces `repeat`
In BullMQ v5+, `queue.add({ repeat: { cron: '...' } })` is deprecated. Use `queue.upsertJobScheduler()` — it's idempotent on restart.

### Gemini structured output vs text parsing
Always use `responseMimeType: 'application/json'` + `responseSchema` for any Gemini call where you need structured data. Raw text parsing with regex/replace is fragile. The schema enforces shape and eliminates the `\`\`\`json` wrapper stripping pattern.

### Static HTML vs React for SEO pages
Do not render SEO pages through React/SPA routing. Googlebot renders them fine, but:
- Time-to-first-byte is slower
- Canonical and meta tags can be delayed
- The programmatic page count gets large (70+) fast

Pure static HTML files at `dist/s/[slug]/index.html` are crawled immediately, cache at the edge, and have zero JS overhead.

### GSC integration was removed
Google Search Console OAuth was explored and removed. The token rotation and scope management added more complexity than value at this stage. Use Cloudflare Web Analytics (free, no OAuth, beacon-based) for traffic data instead.

### `2000ms` sleep between Gemini calls (bulk generation)
Gemini 2.5 Flash has per-minute token limits. A 2-second sleep between page generations prevents rate limit errors during bulk runs. Do not remove this.

---

## Env Vars Checklist for a New Project

```
# Core
DATABASE_URL=
REDIS_URL=
GEMINI_API_KEY=

# Growth engine
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REFRESH_TOKEN=

# Deploy trigger
VERCEL_DEPLOY_HOOK_URL=

# Optional
YOUTUBE_API_KEY=   (for creator discovery worker)
```

---

## File Map

```
packages/api/src/
├── growth/
│   ├── queues.ts              — BullMQ queue factory + schedules
│   ├── startWorkers.ts        — Boot all workers + seed templates
│   ├── routes/
│   │   └── growth.ts          — Internal growth API endpoints
│   ├── services/
│   │   ├── redditClient.ts    — Reddit API wrapper
│   │   ├── redditScout.ts     — Thread relevance scoring
│   │   ├── painPointAnalyzer.ts — Gemini pain scoring
│   │   ├── creatorFinder.ts   — YouTube API creator discovery
│   │   ├── growthMetrics.ts   — Aggregate stats for daily brief
│   │   ├── dailyBriefBuilder.ts — Email brief assembly
│   │   └── growthTemplates.ts — Template CRUD + seeding
│   └── workers/
│       ├── redditDiscovery.ts  — Find + comment on relevant threads
│       ├── creatorDiscovery.ts — Find YouTube creator prospects
│       ├── painPointScrape.ts  — Score pain points → queue SEO pages
│       ├── seoContent.ts       — Generate 70 pages + process queue
│       ├── growthLearning.ts   — A/B evaluate + propose challengers
│       └── dailyBrief.ts       — Send daily email summary
└── lib/
    └── seoGenerator.ts         — Gemini SEO page content generation

packages/web/
├── scripts/
│   └── generate-seo-pages.mjs — Static HTML renderer + sitemap
└── public/
    └── seo.css                 — Styles for static SEO pages
```
