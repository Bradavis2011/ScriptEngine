import { Router, Request, Response } from 'express';
import Stripe from 'stripe';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'https://clipscriptai.com';

function stripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// POST /api/checkout/pack — $25, 5 AI scripts delivered by email
router.post('/pack', async (req: Request, res: Response) => {
  const { email, niche, topic } = req.body as {
    email?: string;
    niche?: string;
    topic?: string;
  };

  if (!email || !niche || !topic) {
    res.status(400).json({ error: 'email, niche, and topic are required' });
    return;
  }

  const stripe = stripeClient();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'ClipScript — 5-Script Pack',
            description: `5 ${niche} scripts on "${topic}" — in your inbox within minutes`,
          },
          unit_amount: 2500,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    customer_email: email,
    metadata: {
      orderType: 'pack',
      niche,
      topic: topic.slice(0, 490), // Stripe metadata 500-char limit
      email,
    },
    success_url: `${FRONTEND_URL}/thank-you?type=pack`,
    cancel_url: `${FRONTEND_URL}/`,
  });

  res.json({ url: session.url });
});

// POST /api/checkout/concierge — $50, 1 custom script with brief, 2 tweaks
router.post('/concierge', async (req: Request, res: Response) => {
  const { email, niche, topic, brief } = req.body as {
    email?: string;
    niche?: string;
    topic?: string;
    brief?: string;
  };

  if (!email || !niche || !topic) {
    res.status(400).json({ error: 'email, niche, and topic are required' });
    return;
  }

  const stripe = stripeClient();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'ClipScript — Concierge Script',
            description: `Custom ${niche} script on "${topic}" — 2 tweaks included`,
          },
          unit_amount: 5000,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    customer_email: email,
    metadata: {
      orderType: 'concierge',
      niche,
      topic: topic.slice(0, 490),
      brief: (brief ?? '').slice(0, 490),
      email,
    },
    success_url: `${FRONTEND_URL}/thank-you?type=concierge`,
    cancel_url: `${FRONTEND_URL}/`,
  });

  res.json({ url: session.url });
});

export default router;
