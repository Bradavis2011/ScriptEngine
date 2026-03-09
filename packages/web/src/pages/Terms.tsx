import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <Link to="/" className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">
            ← ClipScript
          </Link>
        </div>

        <h1 className="font-display text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Effective date: March 9, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">1. Agreement</h2>
            <p>
              By using ClipScript ("Service"), you agree to these Terms of Service. If you do not agree,
              do not use the Service. "ClipScript", "we", "us", and "our" refer to the operator of clipscriptai.com.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">2. The Service</h2>
            <p className="mb-3">ClipScript provides AI-generated short-form video scripts delivered via email and a browser-based report. Products currently offered:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li><span className="font-medium text-foreground">Script Pack ($25)</span> — five AI-generated scripts on your chosen niche and topic, delivered by email.</li>
              <li><span className="font-medium text-foreground">Concierge Brief ($50)</span> — a full content strategy brief including YouTube trend research, audience profile, keyword analysis, series plan, hook library, and scripts, delivered by email. Includes two rounds of revisions via email reply.</li>
              <li><span className="font-medium text-foreground">Pro Subscription ($7/mo or $60/yr)</span> — access to the ClipScript mobile application including daily script generation, teleprompter camera, and series management.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">3. Payment</h2>
            <p className="mb-3">
              All one-time purchases are processed by Stripe. Subscriptions are managed through Stripe (web)
              or your mobile platform's app store (iOS App Store / Google Play). Prices are in USD.
            </p>
            <p>
              By completing a purchase you authorize the applicable payment. Subscription charges recur at
              the stated interval until cancelled. You may cancel a subscription at any time through your
              account settings or by contacting us; cancellation takes effect at the end of the current
              billing period.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">4. Refunds</h2>
            <p className="mb-3">
              Because our products are digitally delivered immediately after payment, all sales are
              generally final. However:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>If you were charged but did not receive your delivery within one hour, email{" "}
                <a href="mailto:hello@clipscriptai.com" className="text-primary underline">hello@clipscriptai.com</a>{" "}
                and we will redeliver or issue a full refund.</li>
              <li>If you are unsatisfied with your Script Pack, contact us within 48 hours and we will
                regenerate your scripts once at no charge.</li>
              <li>Concierge Brief revisions are handled via email reply — you receive two included revisions.</li>
              <li>Subscription refunds are subject to Apple App Store or Google Play refund policies when
                purchased through those platforms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">5. AI-generated content</h2>
            <p className="mb-3">
              Scripts and briefs are generated using Google's Gemini AI and are based on the inputs you provide.
              By using the Service you acknowledge:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Generated content may not be unique. Similar outputs may be produced for other users with the same inputs.</li>
              <li>We do not guarantee that any script will achieve specific views, follower counts, or commercial results.</li>
              <li>You are responsible for reviewing generated content before publishing and for ensuring it complies with applicable platform rules and laws.</li>
              <li>ClipScript does not verify the factual accuracy of AI-generated content. Do not present generated statistics or claims as verified facts without independent confirmation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">6. Ownership of output</h2>
            <p>
              You own the scripts and content generated for you through your paid order. You may use, publish,
              modify, and monetize them freely. We retain no ownership over your generated output.
              We reserve the right to use anonymized, non-attributable examples of generated content
              for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">7. Acceptable use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Resell or redistribute the Service itself (reselling your generated content is permitted).</li>
              <li>Attempt to reverse-engineer, scrape, or automate access to the Service.</li>
              <li>Use the Service to generate content that is illegal, defamatory, harassing, or in violation of any third party's rights.</li>
              <li>Submit false or misleading information to manipulate script generation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">8. Intellectual property</h2>
            <p>
              The ClipScript name, logo, website design, and underlying software are owned by ClipScript
              and may not be used without written permission. These Terms do not grant you any rights
              to our trademarks or branding.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">9. Disclaimer of warranties</h2>
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind, express or
              implied. We do not warrant that the Service will be uninterrupted, error-free, or that
              generated content will meet your specific requirements.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">10. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by applicable law, ClipScript's total liability for any claim
              arising out of or relating to these Terms or the Service is limited to the amount you paid
              for the order giving rise to the claim. We are not liable for any indirect, incidental,
              consequential, or punitive damages.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">11. Governing law</h2>
            <p>
              These Terms are governed by the laws of the United States. Any disputes will be resolved
              through binding arbitration or in a court of competent jurisdiction in the United States,
              at our election.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">12. Changes</h2>
            <p>
              We may update these Terms at any time. The effective date above will reflect the latest
              revision. Continued use of the Service after changes constitutes acceptance of the
              updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">13. Contact</h2>
            <p>
              Questions about these Terms:{" "}
              <a href="mailto:hello@clipscriptai.com" className="text-primary underline">
                hello@clipscriptai.com
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border/40 flex gap-6 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link to="/faq" className="hover:text-foreground">FAQ</Link>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </div>
      </div>
    </main>
  );
}
