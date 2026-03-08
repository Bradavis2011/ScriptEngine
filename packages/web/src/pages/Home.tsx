import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Rocket, Sparkles, Video, Zap } from "lucide-react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL ?? "https://scriptengine-production.up.railway.app";
const STRIPE_FOUNDERS_URL = import.meta.env.VITE_STRIPE_FOUNDERS_URL as string | undefined;

const NICHES = ["Fashion", "Fitness", "Food", "Tech", "Finance", "Business"];

async function createCheckoutSession(
  endpoint: string,
  body: Record<string, string>
): Promise<string> {
  const res = await fetch(`${API_URL}/api/checkout/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? "Checkout failed");
  }
  const { url } = await res.json();
  return url;
}

// ---------------------------------------------------------------------------
// $25 Script Pack form
// ---------------------------------------------------------------------------
function PackForm({ onCancel }: { onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [niche, setNiche] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !niche || !topic) {
      toast.error("Fill in all fields before continuing.");
      return;
    }
    setLoading(true);
    try {
      const url = await createCheckoutSession("pack", { email, niche, topic });
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <select
        value={niche}
        onChange={(e) => setNiche(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">Select your niche…</option>
        {NICHES.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Broad topic (e.g. 'morning routines', 'gym beginner mistakes')"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        maxLength={200}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <p className="text-xs text-muted-foreground">
        Keep it broad — a direction, not a thesis. Scripts are generated across multiple formats.
      </p>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={loading} className="flex-1">
          {loading ? "Redirecting…" : "Continue to Payment →"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// $50 Concierge form
// ---------------------------------------------------------------------------
function ConciergeForm({ onCancel }: { onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [niche, setNiche] = useState("");
  const [topic, setTopic] = useState("");
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !niche || !topic) {
      toast.error("Fill in your email, niche, and topic.");
      return;
    }
    setLoading(true);
    try {
      const url = await createCheckoutSession("concierge", { email, niche, topic, brief });
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <select
        value={niche}
        onChange={(e) => setNiche(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">Select your niche…</option>
        {NICHES.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Specific topic & angle (e.g. 'how Paris Fashion Week 2026 reinvented minimalism')"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        maxLength={490}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <textarea
        placeholder="Anything else we should know? (CTA goal, audience, tone, data points to include — optional)"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={3}
        maxLength={490}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <p className="text-xs text-muted-foreground">
        2 tweaks included — reply to the delivery email. Tweaks = refinements, not full rewrites.
      </p>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={loading} className="flex-1">
          {loading ? "Redirecting…" : "Continue to Payment →"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------
export default function Home() {
  const [packOpen, setPackOpen] = useState(false);
  const [conciergeOpen, setConciergeOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">

        {/* Header */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary font-display text-sm font-bold text-primary-foreground">
              CS
            </div>
            <span className="font-display text-2xl font-bold">ClipScript</span>
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">
            Film-ready scripts.<br />In your inbox in minutes.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Short-form video scripts with teleprompter text, camera directions, B-roll cues, and captions — built for creators who actually film.
          </p>
        </header>

        {/* 3 products — equal, above the fold */}
        <div className="grid gap-4 md:grid-cols-3 mb-12">

          {/* $25 Script Pack */}
          <Card className="border-border/70 bg-card/90 flex flex-col">
            <CardContent className="p-6 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Instant delivery</span>
              </div>
              <h2 className="font-display text-xl font-bold mt-1">Script Pack</h2>
              <p className="text-3xl font-extrabold mt-1">$25</p>
              <p className="text-sm text-muted-foreground mt-2 flex-1">
                5 AI-generated scripts on your topic — different formats, all teleprompter-ready. Delivered to your inbox in minutes.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 5 scripts, mixed formats</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Teleprompter text included</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Captions + hashtags</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 1–2 days of content</li>
              </ul>

              {!packOpen ? (
                <Button className="mt-5 w-full" onClick={() => { setConciergeOpen(false); setPackOpen(true); }}>
                  Get 5 Scripts — $25
                </Button>
              ) : (
                <PackForm onCancel={() => setPackOpen(false)} />
              )}
            </CardContent>
          </Card>

          {/* $50 Concierge */}
          <Card className="border-primary/40 bg-card/90 flex flex-col ring-1 ring-primary/20">
            <CardContent className="p-6 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-secondary" />
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Personalized</span>
              </div>
              <h2 className="font-display text-xl font-bold mt-1">Concierge Script</h2>
              <p className="text-3xl font-extrabold mt-1">$50</p>
              <p className="text-sm text-muted-foreground mt-2 flex-1">
                One custom script built around your specific angle. You give us the topic and direction — we handle the rest. 2 tweaks included.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Your specific angle</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Full production brief</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 2 tweaks via email</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Delivered within 24 hrs</li>
              </ul>

              {!conciergeOpen ? (
                <Button className="mt-5 w-full" variant="secondary" onClick={() => { setPackOpen(false); setConciergeOpen(true); }}>
                  Order Concierge — $50
                </Button>
              ) : (
                <ConciergeForm onCancel={() => setConciergeOpen(false)} />
              )}
            </CardContent>
          </Card>

          {/* $60 Founders Annual */}
          <Card className="border-border/70 bg-card/90 flex flex-col">
            <CardContent className="p-6 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Rocket className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">First 100 only</span>
              </div>
              <h2 className="font-display text-xl font-bold mt-1">Founders Annual</h2>
              <p className="text-3xl font-extrabold mt-1">$60<span className="text-lg font-normal text-muted-foreground">/yr</span></p>
              <p className="text-sm text-muted-foreground mt-2 flex-1">
                Lock in the founding price for year one. Full app access when we launch — scripts, teleprompter, series management, everything.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Full app (mobile, iOS + Android)</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 5 scripts/day</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 1 free Concierge Script</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Founding price locked yr 1</li>
              </ul>

              <Button
                className="mt-5 w-full bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => {
                  if (STRIPE_FOUNDERS_URL) window.location.href = STRIPE_FOUNDERS_URL;
                  else toast.error("Founders link not configured yet — email hello@clipscriptai.com");
                }}
              >
                Claim Founders Seat — $60/yr
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-center mb-6">How it works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Video, title: "Pick your pack", desc: "Choose the Script Pack for a burst of content, or Concierge for a custom script on your exact angle." },
              { icon: Sparkles, title: "We generate it", desc: "Powered by Gemini — scripts include cold open, sections, camera directions, B-roll cues, and captions." },
              { icon: Check, title: "Film it", desc: "Copy the teleprompter text, read it to camera, post. That's the whole workflow." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border/60 bg-card/70 p-5 text-center">
                <item.icon className="h-5 w-5 text-primary mx-auto mb-3" />
                <p className="font-display font-semibold text-sm">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground py-8 border-t border-border/40">
          <p>Questions? Email <a href="mailto:hello@clipscriptai.com" className="underline">hello@clipscriptai.com</a></p>
          <p className="mt-2">ClipScript — scripts built for filming, not for reading</p>
        </footer>
      </div>
    </main>
  );
}
