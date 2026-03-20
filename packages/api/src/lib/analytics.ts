/**
 * Analytics helpers — user event logging and activity tracking.
 *
 * `touchActivity(tenantId)` — updates Tenant.lastActiveAt and logs a
 *   `session_start` UserEvent once per UTC day per user. Call it on any
 *   authenticated action to drive DAU/MAU without spamming the DB.
 *
 * `logUserEvent(tenantId, event, meta?)` — fire-and-forget event log.
 *   Call sites should NOT await this; errors are logged but never thrown.
 */

import { prisma } from './prisma';

// ---------------------------------------------------------------------------
// Internal: write one session_start per day per user
// ---------------------------------------------------------------------------

function utcDayStart(d: Date): Date {
  const day = new Date(d);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

async function _touchActivity(tenantId: string): Promise<void> {
  const today = utcDayStart(new Date());

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { lastActiveAt: true },
  });
  if (!tenant) return;

  const lastActive = tenant.lastActiveAt;
  const isNewDay = !lastActive || utcDayStart(lastActive) < today;

  if (isNewDay) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { lastActiveAt: new Date() },
    });
    // Log session_start so DAU/MAU can be queried from UserEvent
    await prisma.userEvent.create({
      data: { tenantId, event: 'session_start' },
    });
  }
}

async function _logUserEvent(
  tenantId: string,
  event: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  await prisma.userEvent.create({
    data: { tenantId, event, meta: meta as any ?? undefined },
  });
}

// ---------------------------------------------------------------------------
// Public API — both are fire-and-forget; never block the request
// ---------------------------------------------------------------------------

/**
 * Update Tenant.lastActiveAt and log a session_start event once per UTC day.
 * Safe to call on every authenticated request — only writes once per day.
 */
export function touchActivity(tenantId: string): void {
  _touchActivity(tenantId).catch((err) =>
    console.warn('[analytics] touchActivity failed:', err instanceof Error ? err.message : err),
  );
}

/**
 * Log a UserEvent for product analytics.
 * Does NOT block the request path.
 */
export function logUserEvent(
  tenantId: string,
  event: string,
  meta?: Record<string, unknown>,
): void {
  _logUserEvent(tenantId, event, meta).catch((err) =>
    console.warn(`[analytics] logUserEvent(${event}) failed:`, err instanceof Error ? err.message : err),
  );
}
