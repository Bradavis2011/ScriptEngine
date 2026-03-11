import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../../lib/prisma';
import { searchSubreddit, getComment, RedditPost } from './redditClient';
import { getActiveGrowthTemplate } from './growthTemplates';

const SUBREDDITS = [
  'NewTubers',
  'ContentCreators',
  'youtubers',
  'Entrepreneur',
  'TikTok',
  'InstagramMarketing',
  'SmallYTChannel',
];

const KEYWORDS = [
  'teleprompter',
  'script for video',
  'content ideas',
  'what to post',
  'on camera tips',
  'ran out of ideas',
  'video scripting',
  'content creation struggle',
];

let _genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

async function scoreRelevance(post: RedditPost): Promise<number> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `Score how relevant this Reddit post is to ClipScript — an AI video script generator with a built-in teleprompter camera for content creators.

Score 1-10:
- 10 = author clearly struggles with scripting, teleprompter, content ideas, or being on camera
- 6-9 = about content creation but not directly about scripting pain
- 1-5 = tangentially related or irrelevant

Title: "${post.title}"
Body: "${(post.selftext ?? '').slice(0, 500)}"

Return ONLY a number from 1 to 10. Nothing else.`;

  const result = await model.generateContent(prompt);
  const score = parseFloat(result.response.text().trim());
  return isNaN(score) ? 0 : Math.max(1, Math.min(10, score));
}

async function generateComment(post: RedditPost, template: string): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `${template}

Generate a helpful Reddit comment for this post.
Rules:
- Pure value only — NO product mentions, NO links, NO self-promotion
- Sound like a genuine community member, not a marketer
- Address the specific pain or question in the post
- 3-5 sentences max
- Warm and practical tone

Post:
Title: "${post.title}"
Body: "${(post.selftext ?? '').slice(0, 500)}"
Subreddit: r/${post.subreddit}

Return ONLY the comment text. Nothing else.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export async function discoverAndScore(): Promise<{
  discovered: number;
  scored: number;
  queued: number;
}> {
  let discovered = 0;
  let scored = 0;
  let queued = 0;

  const sevenDaysAgoUtc = Date.now() / 1000 - 7 * 24 * 3600;

  for (const subreddit of SUBREDDITS) {
    for (const keyword of KEYWORDS) {
      try {
        const { posts } = await searchSubreddit(subreddit, keyword);

        for (const post of posts) {
          // Filter: too old, too low score, deleted author
          if (post.created_utc < sevenDaysAgoUtc) continue;
          if (post.score < 2) continue;
          if (post.author === '[deleted]') continue;

          // Deduplicate
          const existing = await prisma.redditThread.findUnique({
            where: { redditId: post.id },
          });
          if (existing) continue;

          discovered++;

          const relevanceScore = await scoreRelevance(post);
          scored++;

          let status = 'discovered';
          let commentBody: string | undefined;
          let templateVersion: string | null = null;

          if (relevanceScore >= 6) {
            try {
              const { template, id: templateId } = await getActiveGrowthTemplate('reddit_comment');
              commentBody = await generateComment(post, template);
              templateVersion = templateId;
              status = 'queued';
              queued++;
            } catch (err) {
              console.error('[redditScout] Comment generation failed:', err);
            }
          }

          await prisma.redditThread.create({
            data: {
              redditId: post.id,
              subreddit: post.subreddit,
              title: post.title,
              selftext: (post.selftext ?? '').slice(0, 5000) || null,
              author: post.author,
              url: post.url,
              score: post.score,
              numComments: post.num_comments,
              matchedKeywords: [keyword],
              relevanceScore,
              status,
              commentBody,
              templateVersion: templateVersion ?? undefined,
            },
          });
        }
      } catch (err) {
        console.error(`[redditScout] Error for r/${subreddit} "${keyword}":`, err);
      }
    }
  }

  return { discovered, scored, queued };
}

export async function checkCommentKarma(): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const recentComments = await prisma.redditThread.findMany({
    where: {
      status: 'commented',
      commentedAt: { gte: thirtyDaysAgo },
      commentId: { not: null },
    },
    take: 50,
  });

  for (const thread of recentComments) {
    if (!thread.commentId) continue;
    try {
      const { score, repliesCount } = await getComment(thread.commentId);
      await prisma.redditThread.update({
        where: { id: thread.id },
        data: {
          commentKarma: score,
          authorReplied: repliesCount > 0,
          lastCheckedAt: new Date(),
        },
      });
    } catch (err) {
      console.error(`[redditScout] Karma check failed for ${thread.commentId}:`, err);
    }
  }
}
