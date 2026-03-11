import { Job } from 'bullmq';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../../lib/prisma';
import {
  promoteGrowthChallenger,
  createGrowthChallenger,
} from '../services/growthTemplates';

const PROMOTION_THRESHOLD = 0.1; // 10% improvement required
const MIN_SAMPLES = 10;

let _genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

async function proposeNewChallenger(
  contentType: string,
  currentTemplate: string,
  metrics: Record<string, number>,
): Promise<void> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are optimizing an outreach template for "${contentType}".

CURRENT TEMPLATE:
${currentTemplate}

PERFORMANCE METRICS:
${JSON.stringify(metrics, null, 2)}

Generate an IMPROVED version of this template. Keep the same intent but optimize for better ${
    contentType === 'reddit_comment' ? 'karma and author replies' : 'response rates'
  }.

Rules:
- Same general approach and tone
- More specific, helpful, and human-sounding
- Address weaknesses visible in the metrics

Return ONLY the improved template text. Nothing else.`;

  const result = await model.generateContent(prompt);
  const newTemplate = result.response.text().trim();

  await createGrowthChallenger(contentType, newTemplate, 'ai_growth_lab');
  console.log(`[growthLearning] New challenger proposed for ${contentType}`);
}

async function evaluateRedditComments(): Promise<void> {
  const versions = await prisma.growthTemplate.findMany({
    where: { contentType: 'reddit_comment', status: { in: ['current', 'challenger'] } },
  });

  const current = versions.find((v) => v.status === 'current');
  const challenger = versions.find((v) => v.status === 'challenger');

  if (!current) return;

  // Fetch comment metrics for each template version
  const [currentComments, challengerComments] = await Promise.all([
    prisma.redditThread.findMany({
      where: { templateVersion: current.id, status: 'commented', commentKarma: { not: null } },
      select: { commentKarma: true, authorReplied: true },
    }),
    challenger
      ? prisma.redditThread.findMany({
          where: {
            templateVersion: challenger.id,
            status: 'commented',
            commentKarma: { not: null },
          },
          select: { commentKarma: true, authorReplied: true },
        })
      : Promise.resolve([]),
  ]);

  const currentAvgKarma =
    currentComments.length > 0
      ? currentComments.reduce((sum, t) => sum + (t.commentKarma ?? 0), 0) /
        currentComments.length
      : 0;

  if (!challenger || challengerComments.length < MIN_SAMPLES) {
    if (currentComments.length >= MIN_SAMPLES) {
      // Propose a challenger based on current performance
      await proposeNewChallenger('reddit_comment', current.template, {
        currentAvgKarma,
        sampleSize: currentComments.length,
      });
    } else {
      console.log(
        `[growthLearning] Insufficient samples for reddit_comment (current: ${currentComments.length})`,
      );
    }
    return;
  }

  const challengerAvgKarma =
    challengerComments.reduce((sum, t) => sum + (t.commentKarma ?? 0), 0) /
    challengerComments.length;

  const improvement =
    (challengerAvgKarma - currentAvgKarma) / Math.max(0.01, currentAvgKarma);

  const metrics = { currentAvgKarma, challengerAvgKarma, improvement };
  console.log(`[growthLearning] reddit_comment — current: ${currentAvgKarma.toFixed(2)}, challenger: ${challengerAvgKarma.toFixed(2)}, improvement: ${(improvement * 100).toFixed(1)}%`);

  if (improvement >= PROMOTION_THRESHOLD) {
    await promoteGrowthChallenger('reddit_comment', challenger.id);
    console.log(`[growthLearning] Challenger promoted (+${(improvement * 100).toFixed(1)}%)`);

    await prisma.growthEvent.create({
      data: {
        channel: 'learning',
        eventType: 'learning_run',
        data: { contentType: 'reddit_comment', result: 'promoted', ...metrics },
      },
    });
  }

  // Always propose a new challenger for ongoing testing
  await proposeNewChallenger('reddit_comment', current.template, metrics);
}

export async function runGrowthLearning(_job: Job): Promise<void> {
  console.log('[growthLearning] Starting...');

  await evaluateRedditComments();

  await prisma.growthEvent.create({
    data: {
      channel: 'learning',
      eventType: 'learning_run',
      data: { completedAt: new Date().toISOString() },
    },
  });

  console.log('[growthLearning] Done');
}
