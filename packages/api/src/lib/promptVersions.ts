import { prisma } from './prisma';

// Seed prompts — initial "current" versions for all 12 script types.
// Matches the hardcoded SCRIPT_TYPE_PROMPTS from gemini.ts.
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
  quick_hook:
    'Write an ultra-punchy short-form video script. Open with a single bold, surprising, or controversial statement that forces a reaction. One clear idea, no fluff. Every word earns its place.',
  story_hook:
    'Write a short-form video script that opens with a relatable 2-sentence micro-story or personal moment, then pivots immediately to a universal insight the viewer can act on. Make them feel seen.',
  rapid_tip:
    'Write a short-form video script laser-focused on ONE single ultra-specific actionable tip. State it in the cold open, prove it works in one sentence, then tell them exactly how to do it right now.',
  showcase:
    "Write a walkthrough/showcase script. The creator is walking viewers through something — a property, a product, a space, a setup. Structure it as a guided tour: strong opening hook about what they're about to see, 3 sections with smooth transitions between features/areas, and a closing CTA. Use short teleprompter lines with natural pausing points for filming while moving.",
  listing_tour:
    "Write a property walkthrough narration. Open with curb appeal or the most compelling feature. Walk room-by-room with smooth transitions. Highlight 3-4 standout features. Close with urgency + agent's CTA. Teleprompter text must use short broken lines — the agent reads while physically walking through the home.",
  just_listed:
    "Write a 'just listed' announcement. Create urgency. Lead with the single most compelling detail, hit 3-4 selling points fast, close with a direct-response CTA.",
  market_update:
    "Write a local market update. Reference the creator's market for context. Include 2-3 data-backed insights (inventory, pricing, buyer/seller dynamics). End with actionable advice + CTA.",
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
 * Automatically creates an ExperimentRun (status: 'running') if a current version exists,
 * connecting offline AI evaluation with online user-data calibration.
 */
export async function createChallenger(
  scriptType: string,
  prompt: string,
  source: string = 'ai_lab',
  parentId?: string,
  evaluationType: string = 'dual',
): Promise<string> {
  // Retire any existing challenger
  await prisma.promptVersion.updateMany({
    where: { scriptType, status: 'challenger' },
    data: { status: 'retired' },
  });

  // Look up current version (needed for ExperimentRun)
  const current = await prisma.promptVersion.findFirst({
    where: { scriptType, status: 'current' },
    orderBy: { createdAt: 'desc' },
  });

  const version = await prisma.promptVersion.create({
    data: { scriptType, prompt, status: 'challenger', source, parentId },
  });

  // Auto-create ExperimentRun if we have a current version to compare against
  if (current) {
    // Close any existing running experiments for this script type
    await prisma.experimentRun.updateMany({
      where: { scriptType, status: 'running' },
      data: { status: 'insufficient_data' },
    });

    await prisma.experimentRun.create({
      data: {
        scriptType,
        currentId: current.id,
        challengerId: version.id,
        evaluationType,
        status: 'running',
      },
    });
  }

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
