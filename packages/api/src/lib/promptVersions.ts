import { prisma } from './prisma';

// Seed prompts — these are the initial "current" versions for each script type.
// They match the hardcoded SCRIPT_TYPE_PROMPTS from gemini.ts.
export const SEED_PROMPTS: Record<string, string> = {
  data_drop:
    'Write a data-driven short-form video script that leads with a surprising statistic or fact, then explains why it matters for the viewer.',
  trend_take:
    'Write a hot-take short-form video script about a current trend in this niche. Start with a bold opinion or contrarian take.',
  niche_tip:
    'Write a practical tips short-form video script with 3 actionable tips the viewer can use immediately. Make each tip specific and concrete.',
  niche_tip_basic:
    'Give a single practical, broadly useful tip about the given topic. Keep it accessible, beginner-friendly, and general. No deep research, no niche-specific jargon, no data citations.',
  series_episode:
    'Write a short-form video script for an episode in an ongoing series. Reference that it is part of a series and tease the next episode.',
};

/**
 * Get the active prompt for a script type.
 * 80% chance of returning "current", 20% chance of "challenger" (if one exists).
 * Falls back to seed prompts if no DB versions exist.
 *
 * Returns the prompt text and the PromptVersion id (null if using seed).
 */
export async function getActivePrompt(
  scriptType: string,
): Promise<{ prompt: string; promptVersionId: string | null }> {
  const versions = await prisma.promptVersion.findMany({
    where: {
      scriptType,
      status: { in: ['current', 'challenger'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  const current = versions.find((v) => v.status === 'current');
  const challenger = versions.find((v) => v.status === 'challenger');

  // No DB versions yet — use seed
  if (!current) {
    return {
      prompt: SEED_PROMPTS[scriptType] ?? SEED_PROMPTS.niche_tip,
      promptVersionId: null,
    };
  }

  // If challenger exists, 20% chance of using it
  if (challenger && Math.random() < 0.2) {
    return { prompt: challenger.prompt, promptVersionId: challenger.id };
  }

  return { prompt: current.prompt, promptVersionId: current.id };
}

/**
 * Get the current best prompt for a script type (always the "current" version).
 * Used by the prompt lab when it needs a deterministic pick.
 */
export async function getCurrentPrompt(
  scriptType: string,
): Promise<{ prompt: string; promptVersionId: string | null }> {
  const current = await prisma.promptVersion.findFirst({
    where: { scriptType, status: 'current' },
    orderBy: { createdAt: 'desc' },
  });

  if (!current) {
    return {
      prompt: SEED_PROMPTS[scriptType] ?? SEED_PROMPTS.niche_tip,
      promptVersionId: null,
    };
  }

  return { prompt: current.prompt, promptVersionId: current.id };
}

/**
 * Seed initial prompt versions from the hardcoded prompts.
 * Idempotent — skips script types that already have a "current" version.
 */
export async function seedPromptVersions(): Promise<number> {
  let created = 0;
  for (const [scriptType, prompt] of Object.entries(SEED_PROMPTS)) {
    const existing = await prisma.promptVersion.findFirst({
      where: { scriptType, status: 'current' },
    });
    if (!existing) {
      await prisma.promptVersion.create({
        data: { scriptType, prompt, status: 'current', source: 'manual' },
      });
      created++;
    }
  }
  return created;
}

/**
 * Create a challenger prompt version for a script type.
 * Retires any existing challenger first.
 */
export async function createChallenger(
  scriptType: string,
  prompt: string,
  source: string = 'ai_lab',
  parentId?: string,
): Promise<string> {
  // Retire any existing challenger
  await prisma.promptVersion.updateMany({
    where: { scriptType, status: 'challenger' },
    data: { status: 'retired' },
  });

  const version = await prisma.promptVersion.create({
    data: { scriptType, prompt, status: 'challenger', source, parentId },
  });

  return version.id;
}

/**
 * Promote a challenger to current. Retires the old current.
 */
export async function promoteChallenger(
  scriptType: string,
  challengerId: string,
): Promise<void> {
  await prisma.promptVersion.updateMany({
    where: { scriptType, status: 'current' },
    data: { status: 'retired' },
  });

  await prisma.promptVersion.update({
    where: { id: challengerId },
    data: { status: 'current' },
  });
}
