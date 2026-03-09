import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <Link to="/" className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">
            ← ClipScript
          </Link>
        </div>

        <h1 className="font-display text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Effective date: March 9, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">1. Who we are</h2>
            <p>
              ClipScript ("we", "us", "our") is a short-form video script generation service operated
              at clipscriptai.com. Questions about this policy can be directed to{" "}
              <a href="mailto:hello@clipscriptai.com" className="text-primary underline">
                hello@clipscriptai.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">2. What we collect and why</h2>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-foreground">Email address</p>
                <p>Collected at checkout to deliver your scripts and order confirmation. We do not send marketing email without your consent.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Content preferences</p>
                <p>Your niche, topic, brief, target audience, platform, stage, and goals — provided when you place an order. Used solely to generate your scripts and research brief. Stored so we can recover or redeliver your order if something goes wrong.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Payment information</p>
                <p>Payments are processed entirely by Stripe. ClipScript never sees, stores, or has access to your card number, CVV, or full billing details. See <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Stripe's privacy policy</a>.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Mobile app (when available)</p>
                <p>The ClipScript mobile app uses Clerk for authentication. Clerk may collect your name, email, and OAuth profile data (if you sign in with Google or Apple). See <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Clerk's privacy policy</a>. Subscription purchases on mobile are handled by Apple App Store or Google Play — we do not receive your payment details.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">3. Third-party services</h2>
            <p className="mb-3">We share data with the following processors only to the extent necessary to operate the service:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li><span className="font-medium text-foreground">Stripe</span> — payment processing. Receives your email and order total.</li>
              <li><span className="font-medium text-foreground">Resend</span> — transactional email delivery. Receives your email address and the content of your delivery email.</li>
              <li><span className="font-medium text-foreground">Google (Gemini API)</span> — AI script and brief generation. Your niche, topic, and brief are sent to Google's Gemini API to generate your content. See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google's privacy policy</a>.</li>
              <li><span className="font-medium text-foreground">Google (YouTube Data API)</span> — used for the Concierge Brief to research trending content in your niche. No personal data is sent; only your topic and niche are used as search queries.</li>
              <li><span className="font-medium text-foreground">Railway</span> — API hosting and database. Your order data (email, niche, topic, brief, generated scripts) is stored in a PostgreSQL database hosted on Railway's infrastructure.</li>
              <li><span className="font-medium text-foreground">Vercel</span> — web hosting for clipscriptai.com. Vercel may log standard request metadata (IP, user agent).</li>
              <li><span className="font-medium text-foreground">Clerk</span> (mobile app only) — authentication and user management.</li>
              <li><span className="font-medium text-foreground">RevenueCat</span> (mobile app only) — subscription management and purchase validation.</li>
            </ul>
            <p className="mt-3">We do not sell your data to any third party.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">4. Data retention</h2>
            <p>
              Order data (email, niche, topic, brief, generated scripts) is retained indefinitely to support
              order recovery, dispute resolution, and redelivery requests. If you would like your data deleted,
              email{" "}
              <a href="mailto:hello@clipscriptai.com" className="text-primary underline">
                hello@clipscriptai.com
              </a>{" "}
              and we will remove it within 30 days, except where retention is required for legal or fraud-prevention purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">5. Cookies and tracking</h2>
            <p>
              The ClipScript website does not use tracking cookies or analytics beyond what Stripe's hosted
              checkout page may set during payment. We do not use Google Analytics, Meta Pixel, or any
              advertising trackers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">6. Children's privacy</h2>
            <p>
              ClipScript is not directed at children under 13. We do not knowingly collect personal information
              from anyone under 13. If you believe a child has provided us with personal information, contact us
              and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">7. Your rights</h2>
            <p>
              Depending on your location, you may have rights to access, correct, or delete your personal data,
              or to object to or restrict its processing. To exercise any of these rights, email{" "}
              <a href="mailto:hello@clipscriptai.com" className="text-primary underline">
                hello@clipscriptai.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">8. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. The effective date at the top will reflect
              the most recent revision. Continued use of the service after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">9. Contact</h2>
            <p>
              For any privacy questions or requests:{" "}
              <a href="mailto:hello@clipscriptai.com" className="text-primary underline">
                hello@clipscriptai.com
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border/40 flex gap-6 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link to="/faq" className="hover:text-foreground">FAQ</Link>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </div>
      </div>
    </main>
  );
}
