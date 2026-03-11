import { Job } from 'bullmq';
import { prisma } from '../../lib/prisma';
import { discoverAndScore, checkCommentKarma } from '../services/redditScout';
import { postComment } from '../services/redditClient';

const MAX_POSTS_PER_CYCLE = 10;
const AUTO_PAUSE_KARMA_THRESHOLD = 1;
const AUTO_PAUSE_MIN_SAMPLES = 5;

async function shouldAutoPause(): Promise<boolean> {
  const recentCommented = await prisma.redditThread.findMany({
    where: { status: 'commented', commentKarma: { not: null } },
    orderBy: { commentedAt: 'desc' },
    take: 20,
    select: { commentKarma: true },
  });

  if (recentCommented.length < AUTO_PAUSE_MIN_SAMPLES) return false;

  const avgKarma =
    recentCommented.reduce((sum, t) => sum + (t.commentKarma ?? 0), 0) /
    recentCommented.length;

  if (avgKarma < AUTO_PAUSE_KARMA_THRESHOLD) {
    console.warn(`[redditDiscovery] Auto-paused: avg karma ${avgKarma.toFixed(2)} < ${AUTO_PAUSE_KARMA_THRESHOLD}`);
    await prisma.growthEvent.create({
      data: {
        channel: 'reddit',
        eventType: 'learning',
        data: { type: 'auto_pause', avgKarma },
      },
    });
    return true;
  }

  return false;
}

async function postQueuedComments(): Promise<number> {
  if (await shouldAutoPause()) return 0;

  const queued = await prisma.redditThread.findMany({
    where: { status: 'queued', commentBody: { not: null } },
    orderBy: { relevanceScore: 'desc' },
    take: MAX_POSTS_PER_CYCLE,
  });

  let posted = 0;
  for (const thread of queued) {
    if (!thread.commentBody) continue;
    try {
      const commentId = await postComment(thread.redditId, thread.commentBody);
      await prisma.redditThread.update({
        where: { id: thread.id },
        data: { status: 'commented', commentId, commentedAt: new Date() },
      });
      posted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[redditDiscovery] Post failed for ${thread.redditId}: ${msg}`);
      await prisma.redditThread.update({
        where: { id: thread.id },
        data: { status: 'failed', errorMessage: msg },
      });
    }
  }

  return posted;
}

export async function runRedditDiscovery(_job: Job): Promise<void> {
  console.log('[redditDiscovery] Starting discovery run...');

  const stats = await discoverAndScore();
  console.log(
    `[redditDiscovery] Discovered: ${stats.discovered}, Scored: ${stats.scored}, Queued: ${stats.queued}`,
  );

  let posted = 0;
  if (process.env.REDDIT_POSTING_ENABLED === 'true') {
    posted = await postQueuedComments();
    console.log(`[redditDiscovery] Posted: ${posted} comments`);
  }

  await checkCommentKarma();

  await prisma.growthEvent.create({
    data: {
      channel: 'reddit',
      eventType: 'discovery',
      data: { ...stats, posted },
    },
  });

  console.log('[redditDiscovery] Done');
}
