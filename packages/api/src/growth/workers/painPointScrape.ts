import { Job } from 'bullmq';
import { prisma } from '../../lib/prisma';
import { searchSubreddit } from '../services/redditClient';
import { scorePainPoint } from '../services/painPointAnalyzer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getQueues, QUEUE_NAMES, JOB_DEFAULTS } from '../queues';

const SUBREDDITS = [
  'NewTubers',
  'ContentCreators',
  'youtubers',
  'Entrepreneur',
  'TikTok',
  'InstagramMarketing',
  'SmallYTChannel',
];

const PAIN_KEYWORDS = [
  'struggling with',
  "can't figure out",
  'so frustrated',
  'hate being on camera',
  "don't know what to say",
  'ran out of ideas',
  'scripting takes forever',
];

const SEO_SCORE_THRESHOLD = 7;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Use Gemini to extract a target SEO keyword from a pain point's categories
 * and marketing angle. Returns null if extraction fails.
 */
async function extractSeoKeyword(
  categories: string[],
  marketingAngle: string,
): Promise<{ keyword: string; niche: string } | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `A content creator pain point has these categories: ${categories.join(', ')}.
Marketing angle: "${marketingAngle}"

Extract a specific long-tail search keyword that someone would type into Google when they have this pain point and are looking for a tool to solve it. The keyword should be 3-6 words and related to creating short-form video scripts or teleprompter use.

Also identify the primary niche (e.g. Real Estate, Fitness, Finance, Food, Beauty, Fashion, Tech, Business, Travel, Education, or General).

Respond with JSON only: {"keyword":"...","niche":"..."}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(text) as { keyword: string; niche: string };
  } catch {
    return null;
  }
}

export async function runPainPointScrape(_job: Job): Promise<void> {
  console.log('[painPointScrape] Starting...');
  let discovered = 0;
  let scored = 0;
  const seoPageIds: string[] = [];

  for (const subreddit of SUBREDDITS) {
    for (const keyword of PAIN_KEYWORDS) {
      try {
        const { posts } = await searchSubreddit(subreddit, keyword);

        for (const post of posts) {
          if (post.author === '[deleted]') continue;

          const existing = await prisma.painPoint.findUnique({
            where: { sourceId: post.id },
          });
          if (existing) continue;

          discovered++;

          const scores = await scorePainPoint(post.title, post.selftext ?? '');
          scored++;

          const painPoint = await prisma.painPoint.create({
            data: {
              source: 'reddit',
              sourceId: post.id,
              sourceUrl: post.url,
              subreddit: post.subreddit,
              title: post.title,
              body: (post.selftext ?? '').slice(0, 2000),
              author: post.author,
              painIntensity: scores.painIntensity,
              relevance: scores.relevance,
              actionability: scores.actionability,
              overallScore: scores.overallScore,
              categories: scores.categories,
              marketingAngle: scores.marketingAngle,
              productInsight: scores.productInsight,
            },
          });

          // Auto-queue SEO page if pain point scores highly
          if (
            scores.overallScore >= SEO_SCORE_THRESHOLD &&
            scores.relevance >= SEO_SCORE_THRESHOLD &&
            scores.marketingAngle &&
            scores.categories.length > 0
          ) {
            const extracted = await extractSeoKeyword(scores.categories, scores.marketingAngle);
            if (extracted) {
              const slug = `pp-${slugify(extracted.keyword)}`.slice(0, 100);

              // Check for similar existing page
              const existingPage = await prisma.seoPage.findFirst({
                where: {
                  OR: [
                    { slug },
                    { targetKeyword: { contains: extracted.keyword.split(' ')[0] } },
                  ],
                },
              });

              if (!existingPage) {
                const page = await prisma.seoPage.create({
                  data: {
                    slug,
                    pageType: 'pain_point',
                    targetKeyword: extracted.keyword,
                    niche: extracted.niche,
                    pageTitle: '',
                    metaDescription: '',
                    h1: '',
                    contentJson: {},
                    status: 'queued',
                    painPointId: painPoint.id,
                  },
                });
                seoPageIds.push(page.id);
                console.log(`[painPointScrape] Queued SEO page: "${extracted.keyword}" (score: ${scores.overallScore.toFixed(1)})`);
              }
            }
          }
        }
      } catch (err) {
        console.error(`[painPointScrape] Error for r/${subreddit} "${keyword}":`, err);
      }
    }
  }

  console.log(`[painPointScrape] Discovered: ${discovered}, Scored: ${scored}, SEO pages queued: ${seoPageIds.length}`);

  // Trigger SEO content generation if any pages were queued
  if (seoPageIds.length > 0) {
    try {
      const queues = getQueues();
      const seoQueue = queues.get(QUEUE_NAMES.SEO_CONTENT);
      if (seoQueue) {
        await seoQueue.add('pain-point-pages', {}, JOB_DEFAULTS);
        console.log('[painPointScrape] Triggered SEO content job for pain-point pages');
      }
    } catch (err) {
      console.error('[painPointScrape] Failed to trigger SEO queue:', err);
    }
  }

  await prisma.growthEvent.create({
    data: {
      channel: 'pain_point',
      eventType: 'discovery',
      data: { discovered, scored, seoPageIds },
    },
  });
}
