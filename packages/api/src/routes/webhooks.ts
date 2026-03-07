import { Router, Request, Response } from 'express';
import express from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { generateScript } from '../lib/gemini';
import { sendConciergeDelivery, sendInternalConciergeAlert } from '../lib/resend';

const router = Router();

// Raw body parser required for Stripe signature verification
router.use(express.raw({ type: 'application/json' }));

// ---------------------------------------------------------------------------
// Stripe webhook — handles concierge one-time purchases
// ---------------------------------------------------------------------------
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: `Webhook signature verification failed: ${msg}` });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email ?? '';
    const stripePaymentId = session.payment_intent as string ?? session.id;
    const niche = (session.metadata?.niche ?? '') as string;

    // Persist order
    await prisma.conciergeOrder.upsert({
      where: { stripePaymentId },
      update: {},
      create: { stripePaymentId, email, niche },
    });

    // Alert internal team
    await sendInternalConciergeAlert({ orderEmail: email, niche, stripePaymentId });

    // Auto-generate and deliver script
    try {
      const scriptData = await generateScript({
        niche: niche || 'general lifestyle',
        scriptType: 'niche_tip',
        additionalContext: `This is a concierge order for ${email}. Make it exceptional.`,
      });

      await prisma.conciergeOrder.update({
        where: { stripePaymentId },
        data: { scriptDelivered: true },
      });

      await sendConciergeDelivery({ toEmail: email, scriptData, niche: niche || 'lifestyle' });
    } catch (genErr) {
      // Generation failure is non-fatal for the webhook — order is logged, team is alerted
      console.error('Concierge script generation failed:', genErr);
    }
  }

  res.json({ received: true });
});

// ---------------------------------------------------------------------------
// RevenueCat webhook — handles subscription events
// ---------------------------------------------------------------------------
router.post('/revenuecat', async (req: Request, res: Response) => {
  // RevenueCat signs webhooks with a shared secret in the Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  let body: any;
  try {
    body = JSON.parse(req.body.toString());
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const { event } = body;
  if (!event) {
    res.json({ received: true });
    return;
  }

  const { type, app_user_id: clerkUserId, product_id } = event;

  // Map product to tier
  const tierMap: Record<string, string> = {
    founders_annual: 'founders',
    pro_monthly: 'pro',
    pro_annual: 'pro',
  };

  const scriptsPerDayMap: Record<string, number> = {
    founders: 5,
    pro: 5,
    free: 1,
  };

  if (['INITIAL_PURCHASE', 'RENEWAL', 'REACTIVATION'].includes(type)) {
    const tier = tierMap[product_id] ?? 'pro';
    const scriptsPerDay = scriptsPerDayMap[tier] ?? 5;

    await prisma.tenant.updateMany({
      where: { clerkUserId },
      data: { tier, scriptsPerDay },
    });
  }

  if (['EXPIRATION', 'CANCELLATION'].includes(type)) {
    await prisma.tenant.updateMany({
      where: { clerkUserId },
      data: { tier: 'free', scriptsPerDay: 1 },
    });
  }

  res.json({ received: true });
});

export default router;
