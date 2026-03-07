import { CheckCircle, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function ThankYou() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/70 bg-card/90">
        <CardContent className="p-8 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h1 className="font-display text-2xl font-bold">You're in.</h1>
          <p className="mt-3 text-muted-foreground">
            Your purchase is confirmed. Here's what happens next:
          </p>

          <ul className="mt-6 space-y-3 text-left text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">If you ordered Concierge:</strong> your script will be in your inbox within 24 hours.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">Founders / Pro:</strong> the app is in Founders Beta — you'll get early access as soon as it's ready (targeting within 30 days).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">Questions?</strong> Email hello@scriptengine.app — we respond fast.
              </span>
            </li>
          </ul>

          <Button asChild className="mt-8 w-full">
            <Link to="/">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
