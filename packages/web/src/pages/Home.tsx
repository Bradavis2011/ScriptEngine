import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Rocket, Sparkles, Video, Zap, X } from "lucide-react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL ?? "https://scriptengine-production.up.railway.app";
const STRIPE_FOUNDERS_URL = import.meta.env.VITE_STRIPE_FOUNDERS_URL as string | undefined;
const STRIPE_PRO_MONTHLY_URL = import.meta.env.VITE_STRIPE_PRO_MONTHLY_URL as string | undefined;

const NICHES = ["Real Estate", "Finance", "Business", "Fashion", "Fitness", "Food", "Tech", "Beauty", "Travel", "Gaming", "Education"];
const PLATFORMS = ["TikTok", "Instagram Reels", "YouTube Shorts", "All platforms"];
const STAGES = ["Just starting", "1k–10k followers", "10k–100k followers", "100k+ followers"];
const GOALS = ["Grow my following", "Drive sales / leads", "Build authority", "Monetize through brands"];

async function createCheckoutSession(endpoint: string, body: Record<string, string>): Promise<string> {
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
// Example script preview (static, shows product value)
// ---------------------------------------------------------------------------
function ExampleScript() {
  return (
    <section id="example" className="mb-14">
      <div className="text-center mb-6">
        <span className="text-xs font-bold text-primary uppercase tracking-widest">Example output</span>
        <h2 className="font-display text-2xl font-bold mt-2">This is what you get</h2>
        <p className="text-sm text-muted-foreground mt-1">Every script includes hook, sections, teleprompter text, caption, and hashtags.</p>
      </div>
      <Card className="border-primary/30 bg-card/80 max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Market Tip — 62s</span>
            <span className="text-xs text-muted-foreground">Real Estate · ready to film</span>
          </div>
          <div className="mb-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Cold Open</p>
            <p className="text-lg font-bold leading-snug">"If you want a 3-bed under $450k in Austin, stop scrolling listings until you hear this."</p>
          </div>
          <div className="space-y-3 mb-4">
            {[
              { heading: "The Timing Secret", body: "New listings go live between 6–8pm. Set your alerts for that window or you'll see them the next morning — already gone.", broll: "Phone screen showing listing notification pop up" },
              { heading: "Pre-Approval First", body: "Sellers take pre-approved buyers seriously. Without a letter, your offer hits the bottom of the pile no matter what you bid.", broll: "Close-up of pre-approval letter on desk" },
              { heading: "The Closing Date Edge", body: "Most buyers fight over price. Smart buyers offer sellers flexibility on the closing date — that alone wins deals in competitive markets.", broll: "Calendar being marked, agent shaking hands with clients" },
            ].map((s) => (
              <div key={s.heading} className="border border-border/50 rounded-lg p-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{s.heading}</p>
                <p className="text-sm leading-relaxed">{s.body}</p>
                <p className="text-xs text-muted-foreground mt-1 italic">B-Roll: {s.broll}</p>
              </div>
            ))}
          </div>
          <div className="bg-background/60 rounded-lg p-3 mb-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Teleprompter text</p>
            <p className="text-sm leading-relaxed text-muted-foreground">If you want a 3-bed under $450k in Austin, stop scrolling listings until you hear this. New listings go live between 6 and 8pm — set your alerts for that window or you'll see them the next morning, already gone. Pre-approval first. Sellers take pre-approved buyers seriously...</p>
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Caption + CTA</p>
            <p className="text-sm">Buying in Austin? Stop searching alone. DM me 'SHOW' →</p>
            <p className="text-xs text-muted-foreground mt-1">#austinrealestate #homebuying #firsttimehomebuyer #realtor #househunting #realestatetips #austinhomes</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------
// $25 Script Pack form (inline)
// ---------------------------------------------------------------------------
function PackForm({ onCancel }: { onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [niche, setNiche] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !niche || !topic) { toast.error("Fill in all fields."); return; }
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
      <input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
      <select value={niche} onChange={(e) => setNiche(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
        <option value="">Select your niche…</option>
        {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <input type="text" placeholder="Broad topic (e.g. 'gym tips', 'meal prep', 'European art')"
        value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
      <p className="text-xs text-muted-foreground">5 quick scripts on your topic — all teleprompter-ready. Delivered in minutes.</p>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={loading} className="flex-1">{loading ? "Redirecting…" : "Continue to Payment →"}</Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// $50 Concierge — multi-step modal
// ---------------------------------------------------------------------------
function ConciergeModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState("");
  const [niche, setNiche] = useState("");
  const [stage, setStage] = useState("");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [goals, setGoals] = useState("");
  const [brief, setBrief] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const nextStep = () => {
    if (step === 1 && (!platform || !niche || !stage)) { toast.error("Fill in all fields to continue."); return; }
    if (step === 2 && (!topic || !audience)) { toast.error("Topic and audience are required."); return; }
    setStep((s) => s + 1);
  };

  const submit = async () => {
    if (!email) { toast.error("Email is required."); return; }
    setLoading(true);
    try {
      const url = await createCheckoutSession("concierge", { email, niche, topic, brief, platform, stage, audience, goals });
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong.");
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
  const chipCls = (active: boolean) =>
    `cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
      active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-wider">Content Strategy Brief — $50</p>
            <p className="text-sm text-muted-foreground mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-accent/10 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-border">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        <div className="px-6 py-5 space-y-4">
          {step === 1 && (
            <>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Platform</p>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map((p) => (
                    <button key={p} onClick={() => setPlatform(p)} className={chipCls(platform === p)}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Your niche</p>
                <select value={niche} onChange={(e) => setNiche(e.target.value)} className={inputCls}>
                  <option value="">Select your niche…</option>
                  {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Current stage</p>
                <div className="grid grid-cols-2 gap-2">
                  {STAGES.map((s) => (
                    <button key={s} onClick={() => setStage(s)} className={chipCls(stage === s)}>{s}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Topic or series premise</p>
                <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} maxLength={490}
                  placeholder="e.g. 'A series debunking popular fitness myths for beginners' or 'The real cost of fast fashion — what brands don't tell you'"
                  className={`${inputCls} resize-none`} />
                <p className="text-xs text-muted-foreground mt-1">Specific angle, not just a topic. What's your take?</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Who are you trying to reach?</p>
                <textarea value={audience} onChange={(e) => setAudience(e.target.value)} rows={2} maxLength={490}
                  placeholder="e.g. 'Women 25-35 who want to get fit but feel overwhelmed by gym culture'"
                  className={`${inputCls} resize-none`} />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Primary goal</p>
                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map((g) => (
                    <button key={g} onClick={() => setGoals(g)} className={chipCls(goals === g)}>{g}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Anything else? <span className="font-normal normal-case">(optional)</span></p>
                <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={2} maxLength={490}
                  placeholder="Competitors you admire, tone preferences, angles to avoid, data points you already have…"
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Your email</p>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" className={inputCls} />
              </div>
              <div className="bg-background/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You'll receive a full strategy brief — premise refinement, audience profile, keyword/SEO layer, competitive analysis, 8-episode series plan, 12 custom hooks, 2 full scripts, and growth notes — plus a link to view it in your browser. <strong className="text-foreground">2 tweaks included.</strong>
                </p>
              </div>
            </>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-2">
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={loading} className="flex-none">Back</Button>
          )}
          {step < 3 ? (
            <Button onClick={nextStep} className="flex-1">Continue →</Button>
          ) : (
            <Button onClick={submit} disabled={loading} className="flex-1">
              {loading ? "Redirecting…" : "Continue to Payment — $50 →"}
            </Button>
          )}
        </div>
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
      {conciergeOpen && <ConciergeModal onClose={() => setConciergeOpen(false)} />}

      {/* HERO — full-bleed with gradient orb background */}
      <section className="relative overflow-hidden pb-20 pt-4">
        {/* Background orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute -top-20 right-0 h-[500px] w-[500px] rounded-full bg-secondary/20 blur-[120px]" />
        </div>

        {/* Nav */}
        <nav className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="ClipScript icon" className="h-8 w-8 rounded-lg" />
            <img src="/logo.png" alt="ClipScript" className="h-7" />
          </div>
          <Button size="sm" onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}>
            Get Scripts
          </Button>
        </nav>

        {/* Hero content */}
        <div className="relative mx-auto max-w-5xl px-4 pt-12 text-center md:px-8 md:pt-20 lg:pt-24">
          {/* Kicker pill */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">AI-Powered Scripts</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Write it.<br />
            <span className="hero-gradient-text">Film it.</span><br />
            Post it.
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
            Film-ready short-form scripts with teleprompter text, B-roll cues, and captions — delivered in minutes, not days.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="shadow-[0_0_24px_hsl(175_97%_55%/0.35)]"
              onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
            >
              Get Film-Ready Scripts
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("example")?.scrollIntoView({ behavior: "smooth" })}
            >
              See an Example
            </Button>
          </div>

          {/* Platform badges */}
          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span>TikTok</span>
            <span className="text-border">|</span>
            <span>Instagram Reels</span>
            <span className="text-border">|</span>
            <span>YouTube Shorts</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pb-10 md:px-8">

        {/* Example output */}
        <ExampleScript />

        {/* 3 products */}
        <div id="products" className="grid gap-4 md:grid-cols-3 mb-12">

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
                5 AI-generated scripts on your topic — hooks, viral loops, tips, data drops. All teleprompter-ready. In your inbox in minutes.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 5 scripts, 5 formats</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Teleprompter text included</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Captions + hashtags</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> View in browser + email</li>
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
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Full strategy brief</span>
              </div>
              <h2 className="font-display text-xl font-bold mt-1">Concierge Brief</h2>
              <p className="text-3xl font-extrabold mt-1">$50</p>
              <p className="text-sm text-muted-foreground mt-2 flex-1">
                Deep research on your topic. YouTube trend analysis, audience profile, keyword layer, series plan, hook library, and 2 full scripts.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Platform performance patterns</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Keywords + hashtag strategy</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 8-episode series plan</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 12 custom hooks + 2 full scripts</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 2 tweaks via email</li>
              </ul>
              <Button className="mt-5 w-full" variant="secondary"
                onClick={() => { setPackOpen(false); setConciergeOpen(true); }}>
                Order Concierge — $50
              </Button>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card className="border-border/70 bg-card/90 flex flex-col">
            <CardContent className="p-6 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Rocket className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Full app access</span>
              </div>
              <h2 className="font-display text-xl font-bold mt-1">Pro Subscription</h2>
              <p className="text-sm text-muted-foreground mt-2 mb-4 flex-1">
                Local market hooks, your CTA baked in, teleprompter camera, series management — everything to script, film, and post same-day.
              </p>
              <ul className="mb-5 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 5 scripts/day, local hooks included</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Your CTA injected automatically</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Built-in teleprompter camera</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Series + library management</li>
              </ul>

              {/* Monthly option */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">Monthly</span>
                <span className="font-extrabold">$99<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
              </div>
              <Button size="sm" variant="outline" className="w-full mb-4"
                onClick={() => {
                  if (STRIPE_PRO_MONTHLY_URL) window.location.href = STRIPE_PRO_MONTHLY_URL;
                  else toast.error("Coming soon — email hello@clipscriptai.com");
                }}>
                Subscribe Monthly
              </Button>

              {/* Founders option */}
              <div className="border-t border-amber-500/30 pt-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Founders Annual</span>
                    <span className="inline-flex items-center justify-center text-xs font-bold leading-none bg-amber-500 text-black rounded-full px-2.5 py-1 whitespace-nowrap">First 100</span>
                  </div>
                  <span className="font-extrabold text-amber-500">$60<span className="text-xs font-normal text-muted-foreground">/yr</span></span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">~$5/mo — price locked for year 1. Includes 1 free Concierge Brief.</p>
                <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
                  onClick={() => {
                    if (STRIPE_FOUNDERS_URL) window.location.href = STRIPE_FOUNDERS_URL;
                    else toast.error("Coming soon — email hello@clipscriptai.com");
                  }}>
                  Claim Founders Seat
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Browse Free Scripts — SEO link section, passes PageRank to programmatic pages */}
        <section className="mb-12">
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Free script libraries</span>
            <h2 className="font-display text-2xl font-bold mt-2">Browse scripts by niche</h2>
            <p className="text-sm text-muted-foreground mt-1">Free teleprompter-ready script examples for every niche — real estate, fitness, finance, and more.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {[
              { niche: "Real Estate", slug: "tiktok-scripts-for-real-estate" },
              { niche: "Fitness", slug: "tiktok-scripts-for-fitness" },
              { niche: "Finance", slug: "tiktok-scripts-for-finance" },
              { niche: "Food", slug: "tiktok-scripts-for-food" },
              { niche: "Beauty", slug: "tiktok-scripts-for-beauty" },
              { niche: "Fashion", slug: "tiktok-scripts-for-fashion" },
              { niche: "Tech", slug: "tiktok-scripts-for-tech" },
              { niche: "Business", slug: "tiktok-scripts-for-business" },
              { niche: "Travel", slug: "tiktok-scripts-for-travel" },
              { niche: "Education", slug: "tiktok-scripts-for-education" },
            ].map(({ niche, slug }) => (
              <a
                key={slug}
                href={`/s/${slug}`}
                className="rounded-lg border border-border/60 bg-card/70 px-3 py-3 text-center text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                {niche}
              </a>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-center mb-6">How it works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Video, title: "Pick your pack", desc: "Script Pack for a quick burst of content. Concierge Brief for a full strategy with YouTube research, series plan, and custom hooks." },
              { icon: Sparkles, title: "We generate it", desc: "Powered by Gemini + real YouTube performance data. Scripts include hook, sections, B-roll cues, teleprompter text, and captions." },
              { icon: Check, title: "Film it", desc: "Read the teleprompter text to camera and post. The whole ClipScript workflow in one shot." },
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
          <div className="mt-4 flex justify-center gap-5">
            <a href="/faq" className="underline hover:text-foreground">FAQ</a>
            <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
            <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
