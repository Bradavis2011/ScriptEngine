import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { promoteChallenger } from './promptVersions';

interface PerformanceData {
  views: number;
  likes: number;
  shares: number;
  follows: number;
}

/**
 * Compute an engagement score from raw performance data.
 * Weighted: follows are most valuable, then shares, then likes.
 * Normalized per 1000 views to make scores comparable across scripts.
 */
export function computeEngagementScore(data: PerformanceData): number {
  const { views, likes, shares, follows } = data;
  if (views === 0) return 0;
  return ((likes + shares * 2 + follows * 5) / views) * 1000;
}

/**
 * Check if an experiment should be evaluated after new performance data is logged.
 * Called after each POST /api/scripts/:id/performance.
 *
 * Logic:
 *   1. Find running experiments for this script type
 *   2. Count scored scripts for current vs. challenger prompt versions
 *   3. If both have enough data (>= targetSampleSize): evaluate and auto-promote/reject
 */
export async function checkExperimentCompletion(scriptType: string): Promise<void> {
  const experiments = await prisma.experimentRun.findMany({
    where: { scriptType, status: 'running' },
  });

  for (const exp of experiments) {
    // Count scripts with performance data for each version
    const currentScripts = await prisma.script.findMany({
      where: {
        promptVersionId: exp.currentId,
        performance: { not: Prisma.JsonNull },
      },
      select: { performance: true, aiQualityScore: true },
    });

    const challengerScripts = await prisma.script.findMany({
      where: {
        promptVersionId: exp.challengerId,
        performance: { not: Prisma.JsonNull },
      },
      select: { performance: true, aiQualityScore: true },
    });

    const totalSample = currentScripts.length + challengerScripts.length;

    // Not enough data yet
    if (currentScripts.length < 5 || challengerScripts.length < 5) {
      await prisma.experimentRun.update({
        where: { id: exp.id },
        data: { sampleSize: totalSample },
      });
      continue;
    }

    // Compute average scores
    const currentAvg = avgScoreFromScripts(currentScripts, exp.evaluationType);
    const challengerAvg = avgScoreFromScripts(challengerScripts, exp.evaluationType);

    const improvement = currentAvg > 0 ? (challengerAvg - currentAvg) / currentAvg : 0;
    let result: string;

    if (improvement >= 0.10) {
      // Challenger wins by 10%+
      result = 'promoted';
      await promoteChallenger(scriptType, exp.challengerId);
    } else {
      result = 'rejected';
    }

    await prisma.experimentRun.update({
      where: { id: exp.id },
      data: {
        status: 'completed',
        result,
        currentScore: currentAvg,
        challengerScore: challengerAvg,
        sampleSize: totalSample,
        completedAt: new Date(),
      },
    });

    console.log(
      `[calibration] Experiment ${exp.id} completed: ${result} ` +
        `(current=${currentAvg.toFixed(2)}, challenger=${challengerAvg.toFixed(2)}, ` +
        `improvement=${(improvement * 100).toFixed(1)}%)`,
    );
  }
}

function avgScoreFromScripts(
  scripts: Array<{ performance: any; aiQualityScore: number | null }>,
  evaluationType: string,
): number {
  if (scripts.length === 0) return 0;

  return (
    scripts.reduce((sum, s) => {
      if (evaluationType === 'ai_judge') {
        return sum + (s.aiQualityScore ?? 0);
      }
      if (evaluationType === 'user_reported') {
        const perf = s.performance as PerformanceData | null;
        return sum + (perf ? computeEngagementScore(perf) : 0);
      }
      // dual: weighted blend
      const aiScore = (s.aiQualityScore ?? 0) * 0.3;
      const perf = s.performance as PerformanceData | null;
      const engScore = perf ? computeEngagementScore(perf) * 0.7 : 0;
      return sum + aiScore + engScore;
    }, 0) / scripts.length
  );
}

/**
 * Get a calibration snapshot: current experiments, prompt versions, and aggregate stats.
 */
export async function getCalibrationSnapshot() {
  const experiments = await prisma.experimentRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const activeVersions = await prisma.promptVersion.findMany({
    where: { status: { in: ['current', 'challenger'] } },
    orderBy: { scriptType: 'asc' },
  });

  return { experiments, activeVersions };
}
