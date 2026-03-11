import { Job } from 'bullmq';
import { prisma } from '../../lib/prisma';
import { searchSubreddit } from '../services/redditClient';
import { scorePainPoint } from '../services/painPointAnalyzer';

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

export async function runPainPointScrape(_job: Job): Promise<void> {
  console.log('[painPointScrape] Starting...');
  let discovered = 0;
  let scored = 0;

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

          await prisma.painPoint.create({
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
        }
      } catch (err) {
        console.error(`[painPointScrape] Error for r/${subreddit} "${keyword}":`, err);
      }
    }
  }

  console.log(`[painPointScrape] Discovered: ${discovered}, Scored: ${scored}`);

  await prisma.growthEvent.create({
    data: {
      channel: 'pain_point',
      eventType: 'discovery',
      data: { discovered, scored },
    },
  });
}
