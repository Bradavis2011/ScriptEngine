import { Queue, ConnectionOptions } from 'bullmq';
import { URL } from 'url';

let _connectionOptions: ConnectionOptions | null = null;

/**
 * Parse REDIS_URL into BullMQ ConnectionOptions.
 * BullMQ creates its own Redis connection internally — we never pass an ioredis
 * instance to avoid the type-incompatibility between the separate ioredis package
 * and BullMQ's bundled ioredis.
 */
export function getConnectionOptions(): ConnectionOptions {
  if (!_connectionOptions) {
    if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not set');
    const url = new URL(process.env.REDIS_URL);
    _connectionOptions = {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: url.password || undefined,
      username: url.username || undefined,
      db: url.pathname ? parseInt(url.pathname.slice(1) || '0') : 0,
      maxRetriesPerRequest: null,
    };
  }
  return _connectionOptions;
}

export const QUEUE_NAMES = {
  REDDIT_DISCOVERY: 'reddit-discovery',
  CREATOR_DISCOVERY: 'creator-discovery',
  PAIN_POINT_SCRAPE: 'pain-point-scrape',
  GROWTH_LEARNING: 'growth-learning',
  DAILY_BRIEF: 'daily-brief',
  SEO_CONTENT: 'seo-content',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

let _queues: Map<string, Queue> | null = null;

export function getQueues(): Map<string, Queue> {
  if (!_queues) {
    const conn = getConnectionOptions();
    _queues = new Map(
      Object.values(QUEUE_NAMES).map((name) => [
        name,
        new Queue(name, { connection: conn }),
      ]),
    );
  }
  return _queues;
}

export const JOB_DEFAULTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 30_000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

export const SCHEDULES: Record<string, string> = {
  [QUEUE_NAMES.REDDIT_DISCOVERY]: '0 */4 * * *',  // every 4 hours
  [QUEUE_NAMES.CREATOR_DISCOVERY]: '0 2 * * *',   // daily 2 AM UTC
  [QUEUE_NAMES.PAIN_POINT_SCRAPE]: '0 */6 * * *', // every 6 hours
  [QUEUE_NAMES.GROWTH_LEARNING]: '0 23 * * *',    // daily 11 PM UTC
  [QUEUE_NAMES.DAILY_BRIEF]: '0 7 * * *',         // daily 7 AM UTC
};
