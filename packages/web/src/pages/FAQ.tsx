import { Link } from "react-router-dom";

const FAQS = [
  {
    q: "How long does delivery take?",
    a: "Script Packs are generated and emailed within a few minutes of payment. Concierge Briefs include YouTube research and a full strategy document — expect delivery within 5–10 minutes. If you haven't received your email after 15 minutes, check your spam folder or email us.",
  },
  {
    q: "What exactly is in the Script Pack?",
    a: "Five AI-generated short-form video scripts on your niche and topic. Each script includes a cold open (hook), 3 body sections with B-roll suggestions and camera direction, a call to action, full teleprompter text, an optimized caption, and 5–8 hashtags. Scripts use a mix of formats: tips, data-driven, hot take, beginner, and trend angles.",
  },
  {
    q: "What is in the Concierge Brief?",
    a: "A full content strategy document delivered as a polished HTML report (viewable in your browser and emailed to you). It includes: premise refinement, an audience profile, 8 keywords with search tier labels, 15+ categorized hashtags, 4–5 trending angles, competitive landscape analysis using real YouTube data, 3–4 content pillars, an 8-episode series plan, a 12-hook library written specifically for your topic, 2 full scripts, and 3-month growth projections.",
  },
  {
    q: "How do the 2 tweaks work for the Concierge Brief?",
    a: "Reply directly to your delivery email with what you'd like adjusted — tone, angle, wording, a section you want rewritten. We'll regenerate or revise and reply with the updated version. Tweaks are refinements, not complete restarts.",
  },
  {
    q: "Is the content unique to me?",
    a: "Scripts are generated specifically from your inputs (niche, topic, brief, audience). However, because they are AI-generated, similar inputs from other users could produce similar content. We do not guarantee exclusivity. Review and personalize your scripts before publishing.",
  },
  {
    q: "Do I own the scripts I receive?",
    a: "Yes. You own all content generated for your paid order. You can publish, modify, and monetize it however you like.",
  },
  {
    q: "What niches does ClipScript support?",
    a: "Fashion, Fitness, Food, Tech, Finance, Business, Beauty, Travel, Gaming, and Education are available in the current selector. If your niche isn't listed, pick the closest match and describe your topic specifically — the AI will tailor to your actual content.",
  },
  {
    q: "Will the scripts work on TikTok, Instagram Reels, and YouTube Shorts?",
    a: "Yes. Scripts are written for 45–75 second delivery, optimized for the short-form format common across all three platforms. The Concierge Brief lets you specify your primary platform for more targeted recommendations.",
  },
  {
    q: "I didn't receive my email — what do I do?",
    a: "First, check your spam or promotions folder. If it's not there, email hello@clipscriptai.com with the email address you used at checkout and your order type (Script Pack or Concierge). We'll redeliver or refund.",
  },
  {
    q: "Can I get a refund?",
    a: "If you were charged and never received your delivery, we'll redeliver or refund in full. If you're unsatisfied with your Script Pack, contact us within 48 hours and we'll regenerate once at no charge. Because the product is delivered digitally and immediately, we don't offer discretionary refunds beyond this. See our Terms of Service for full details.",
  },
  {
    q: "What is the mobile app and when is it available?",
    a: "The ClipScript mobile app (iOS and Android) includes daily script generation, a built-in teleprompter camera, series management, and your full script library. It's in development — Founders subscribers get early access on launch. Sign up for the Founders Annual plan ($60/yr) to lock in early access and a lower price.",
  },
  {
    q: "What is the Founders plan?",
    a: "A limited offer for the first 100 subscribers: $60/year (~$5/month), price locked for year 1, includes 1 free Concierge Brief, and early access to the mobile app on launch. Once 100 seats are filled, this price will not be offered again.",
  },
  {
    q: "How is the YouTube research data sourced for the Concierge Brief?",
    a: "We query the YouTube Data API for real videos matching your topic and niche, ranked by view count. The top results (titles, channels, view counts) are fed into the AI to ground the competitive analysis and trend recommendations in actual performance data.",
  },
];

export default function FAQ() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <Link to="/" className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">
            ← ClipScript
          </Link>
        </div>

        <h1 className="font-display text-3xl font-bold mb-2">FAQ</h1>
        <p className="text-sm text-muted-foreground mb-10">Common questions about ClipScript.</p>

        <div className="space-y-6">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="border border-border/60 rounded-xl p-5">
              <p className="font-semibold text-foreground mb-2">{q}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-primary/30 bg-card/80 p-6">
          <h2 className="font-display text-lg font-bold mb-2">Still have a question?</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Email us and we'll get back to you quickly.
          </p>
          <a
            href="mailto:hello@clipscriptai.com"
            className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            hello@clipscriptai.com
          </a>
        </div>

        <div className="mt-12 pt-8 border-t border-border/40 flex gap-6 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </div>
      </div>
    </main>
  );
}
