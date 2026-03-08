import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, PlayCircle, Rocket, Sparkles, Users, Video } from "lucide-react";

// Payment links are created in your Stripe dashboard → Payment Links
// Set these in packages/web/.env.local (prefix VITE_ so Vite exposes them)
const STRIPE_CONCIERGE_URL = import.meta.env.VITE_STRIPE_CONCIERGE_URL as string | undefined;
const STRIPE_FOUNDERS_URL = import.meta.env.VITE_STRIPE_FOUNDERS_URL as string | undefined;
const STRIPE_PRO_MONTHLY_URL = import.meta.env.VITE_STRIPE_PRO_MONTHLY_URL as string | undefined;
const STRIPE_PRO_ANNUAL_URL = import.meta.env.VITE_STRIPE_PRO_ANNUAL_URL as string | undefined;

function openPayment(url: string | undefined, label: string) {
  if (!url) {
    console.error(`Payment URL not configured: ${label}. Set VITE_${label} in .env.local`);
    return;
  }
  window.location.href = url;
}

const featureItems = [
  {
    title: "Teleprompter-ready",
    description: "Auto-formatted teleprompter text for instant filming",
    icon: Video,
  },
  {
    title: "Platform captions",
    description: "Optimized caption formats for TikTok, Reels, and Shorts",
    icon: Sparkles,
  },
  {
    title: "Film flow",
    description: "Script → Film → Save to camera roll",
    icon: PlayCircle,
  },
];

const pricing = [
  {
    name: "Free",
    price: "Free",
    details: "1 script/day • 7-day history",
    cta: "Get Free",
    paymentUrl: undefined as string | undefined,
    paymentKey: "free",
  },
  {
    name: "Pro",
    price: "$7 / mo",
    details: "$72 / year — 2 months free",
    perks: ["Teleprompter", "5 scripts/day", "Full captions & hashtags"],
    cta: "Start Pro",
    paymentUrl: STRIPE_PRO_MONTHLY_URL,
    paymentKey: "STRIPE_PRO_MONTHLY_URL",
  },
  {
    name: "Founders",
    price: "$60 / yr",
    details: "Limited seats — locked price for year 1",
    perks: ["Everything in Pro", "1 free Concierge Script", "Founders channel"],
    cta: "Claim Founders",
    paymentUrl: STRIPE_FOUNDERS_URL,
    paymentKey: "STRIPE_FOUNDERS_URL",
  },
];

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate("/library", { replace: true });
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary font-display text-sm font-bold text-primary-foreground">
              CS
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">ClipScript</h1>
              <p className="text-sm text-muted-foreground">Film-ready short-form scripts — teleprompter-ready, one-tap to film.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Founders: limited $60/yr
            </Badge>
            <Button size="sm" onClick={() => openPayment(STRIPE_FOUNDERS_URL, "STRIPE_FOUNDERS_URL")}>
              Buy Founders
            </Button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <Card className="border-border/70 bg-card/90 shadow-2xl shadow-background/50">
            <CardContent className="p-6">
              <p className="font-display text-3xl font-bold leading-tight md:text-4xl">Open the app → script → film</p>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                ClipScript generates teleprompter-ready scripts with camera directions, B-roll, and captions. Film in minutes — no
                copy/paste.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => openPayment(STRIPE_CONCIERGE_URL, "STRIPE_CONCIERGE_URL")}>Order Concierge Script — $50</Button>
                <Button variant="secondary" onClick={() => openPayment(STRIPE_FOUNDERS_URL, "STRIPE_FOUNDERS_URL")}>
                  Founders $60/yr
                </Button>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {featureItems.map((item) => (
                  <div key={item.title} className="rounded-xl border border-border/70 bg-background/40 p-4">
                    <item.icon className="mb-2 h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-secondary/40 bg-gradient-to-r from-secondary/15 to-primary/10 p-4">
                <p className="font-display text-sm font-semibold text-secondary-foreground">Launch Special — Concierge Script</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Get a production-ready 60s script (teleprompter text + 3 B-roll cues) delivered in 24 hours.
                </p>
                <Button className="mt-3" size="sm" variant="secondary" onClick={() => openPayment(STRIPE_CONCIERGE_URL, "STRIPE_CONCIERGE_URL")}>
                  Order Now — $50
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="border-border/70 bg-card/90">
              <CardContent className="p-6">
                <h2 className="font-display text-lg font-bold">How it works</h2>
                <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-success" /> Buy Concierge or Founders seat
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-success" /> We generate & deliver script in 24 hrs
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-success" /> Film with teleprompter, post, and grow
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90">
              <CardContent className="p-6">
                <h2 className="font-display text-lg font-bold">Founders Perks</h2>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Rocket className="mt-0.5 h-4 w-4 text-primary" /> Founders price locked for year 1
                  </li>
                  <li className="flex items-start gap-2">
                    <Rocket className="mt-0.5 h-4 w-4 text-primary" /> 1 free Concierge Script
                  </li>
                  <li className="flex items-start gap-2">
                    <Rocket className="mt-0.5 h-4 w-4 text-primary" /> Invite to founders channel
                  </li>
                </ul>
                <Button className="mt-4 w-full" variant="secondary" onClick={() => openPayment(STRIPE_FOUNDERS_URL, "STRIPE_FOUNDERS_URL")}>
                  Claim Founders Seat
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-2xl font-bold">Pricing</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {pricing.map((plan) => (
              <Card key={plan.name} className="border-border/70 bg-card/90">
                <CardContent className="p-5">
                  <p className="font-display text-lg font-bold">{plan.name}</p>
                  <p className="mt-1 text-2xl font-extrabold">{plan.price}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{plan.details}</p>
                  {plan.perks && (
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {plan.perks.map((perk) => (
                        <li key={perk} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-success" /> {perk}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    className="mt-4 w-full"
                    variant={plan.name === "Free" ? "outline" : plan.name === "Founders" ? "secondary" : "default"}
                    disabled={plan.name === "Free"}
                    onClick={() => plan.paymentUrl && openPayment(plan.paymentUrl, plan.paymentKey)}
                  >
                    {plan.name === "Free" ? "Coming soon" : plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-border/70 bg-card/60 p-4">
            <p className="font-display font-semibold">Agency / Teams</p>
            <p className="mt-1 text-sm text-muted-foreground">Bulk seats, shared libraries, and onboarding for agencies. Contact sales.</p>
            <div className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> hello@clipscriptai.com
            </div>
          </div>
        </section>

        <footer className="pb-24 pt-8 text-center text-xs text-muted-foreground">Questions? Email hello@clipscriptai.com • Crafted for creators</footer>
      </div>

    </main>
  );
}

