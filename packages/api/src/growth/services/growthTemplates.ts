import { prisma } from '../../lib/prisma';

export const SEED_TEMPLATES: Record<string, string> = {
  reddit_comment: `You are a helpful content creator who understands scripting, teleprompters, and short-form video deeply.
Generate a genuinely useful, empathetic reply that directly addresses the person's specific challenge.
No promotion. No links. No product mentions. Sound like a real human community member who wants to help.`,

  creator_dm: `You are reaching out to a YouTube creator as a fellow content creator who appreciates their work.
Write a personalized message that:
1. References something specific about their channel (use the provided channel details)
2. Mentions you've been experimenting with AI tools to speed up scripting
3. Asks one genuine question about their content workflow
Keep it under 100 words. Conversational tone, not salesy. No product pitch.`,

  warming_comment: `Write a genuine, specific YouTube comment that:
- References something concrete from the video
- Adds a brief insight or asks a follow-up question
- Feels like it comes from someone who actually watched it
Under 50 words. No promotion.`,
};

export async function getActiveGrowthTemplate(
  contentType: string,
): Promise<{ template: string; id: string | null }> {
  const versions = await prisma.growthTemplate.findMany({
    where: {
      contentType,
      status: { in: ['current', 'challenger'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  const current = versions.find((v) => v.status === 'current');
  const challenger = versions.find((v) => v.status === 'challenger');

  if (!current) {
    return {
      template: SEED_TEMPLATES[contentType] ?? SEED_TEMPLATES.reddit_comment,
      id: null,
    };
  }

  if (challenger && Math.random() < 0.2) {
    return { template: challenger.template, id: challenger.id };
  }

  return { template: current.template, id: current.id };
}

export async function createGrowthChallenger(
  contentType: string,
  template: string,
  source: string = 'ai_growth_lab',
  parentId?: string,
): Promise<string> {
  // Retire any existing challenger
  await prisma.growthTemplate.updateMany({
    where: { contentType, status: 'challenger' },
    data: { status: 'retired' },
  });

  const version = await prisma.growthTemplate.create({
    data: { contentType, template, status: 'challenger', source, parentId },
  });

  return version.id;
}

export async function promoteGrowthChallenger(
  contentType: string,
  challengerId: string,
): Promise<void> {
  await prisma.growthTemplate.updateMany({
    where: { contentType, status: 'current' },
    data: { status: 'retired' },
  });

  await prisma.growthTemplate.update({
    where: { id: challengerId },
    data: { status: 'current' },
  });
}

export async function seedGrowthTemplates(): Promise<number> {
  let created = 0;
  for (const [contentType, template] of Object.entries(SEED_TEMPLATES)) {
    const existing = await prisma.growthTemplate.findFirst({
      where: { contentType, status: 'current' },
    });
    if (!existing) {
      await prisma.growthTemplate.create({
        data: { contentType, template, status: 'current', source: 'manual' },
      });
      created++;
    }
  }
  return created;
}
