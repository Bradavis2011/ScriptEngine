import { Worker, Job } from 'bullmq';
import { getConnectionOptions, getQueues, QUEUE_NAMES, JOB_DEFAULTS, SCHEDULES } from './queues';
import { runRedditDiscovery } from './workers/redditDiscovery';
import { runCreatorDiscovery } from './workers/creatorDiscovery';
import { runPainPointScrape } from './workers/painPointScrape';
import { runGrowthLearning } from './workers/growthLearning';
import { runDailyBrief } from './workers/dailyBrief';
import { seedGrowthTemplates } from './services/growthTemplates';

type WorkerHandler = (job: Job) => Promise<void>;

const WORKER_HANDLERS: Record<string, WorkerHandler> = {
  [QUEUE_NAMES.REDDIT_DISCOVERY]: runRedditDiscovery,
  [QUEUE_NAMES.CREATOR_DISCOVERY]: runCreatorDiscovery,
  [QUEUE_NAMES.PAIN_POINT_SCRAPE]: runPainPointScrape,
  [QUEUE_NAMES.GROWTH_LEARNING]: runGrowthLearning,
  [QUEUE_NAMES.DAILY_BRIEF]: runDailyBrief,
};

const workers: Worker[] = [];

export async function startGrowthWorkers(): Promise<void> {
  const conn = getConnectionOptions();
  const queues = getQueues();

  // Register repeating job schedulers (idempotent on restart)
  for (const [name, cron] of Object.entries(SCHEDULES)) {
    const queue = queues.get(name);
    if (queue) {
      await queue.upsertJobScheduler(
        `${name}-scheduler`,
        { pattern: cron },
        {
          name: 'scheduled',
          data: {},
          opts: JOB_DEFAULTS,
        },
      );
    }
  }

  // Spin up one worker per queue
  for (const [name, handler] of Object.entries(WORKER_HANDLERS)) {
    const worker = new Worker(
      name,
      async (job: Job) => {
        console.log(`[growth:${name}] Job ${job.id} started`);
        await handler(job);
        console.log(`[growth:${name}] Job ${job.id} complete`);
      },
      {
        connection: conn,
        concurrency: 1,
      },
    );

    worker.on('failed', (job, err) => {
      console.error(`[growth:${name}] Job ${job?.id} failed:`, err.message);
    });

    workers.push(worker);
  }

  // Seed default templates on first boot (idempotent — skips if already seeded)
  const seeded = await seedGrowthTemplates();
  if (seeded > 0) console.log(`[growth] Seeded ${seeded} default growth templates`);

  console.log(`[growth] Workers started: ${Object.keys(WORKER_HANDLERS).join(', ')}`);
}

export async function stopGrowthWorkers(): Promise<void> {
  console.log('[growth] Shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  // Close queues (each Queue maintains its own Redis connection)
  const queues = getQueues();
  await Promise.all([...queues.values()].map((q) => q.close()));
  console.log('[growth] Workers stopped');
}
