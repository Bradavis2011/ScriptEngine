import { Job } from 'bullmq';
import { prisma } from '../../lib/prisma';
import { discoverCreators } from '../services/creatorFinder';

export async function runCreatorDiscovery(_job: Job): Promise<void> {
  console.log('[creatorDiscovery] Starting...');

  const stats = await discoverCreators();
  console.log(
    `[creatorDiscovery] Discovered: ${stats.discovered}, Briefed: ${stats.briefed}`,
  );

  await prisma.growthEvent.create({
    data: {
      channel: 'creator',
      eventType: 'discovery',
      data: stats,
    },
  });

  console.log('[creatorDiscovery] Done');
}
