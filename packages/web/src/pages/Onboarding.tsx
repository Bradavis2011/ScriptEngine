import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import { createTenant } from "@/lib/api";
import { toast } from "sonner";

const niches = ["Fashion", "Fitness", "Food", "Tech", "Finance", "Business"];
const frequencies = ["1", "3", "5", "10"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [selectedFreq, setSelectedFreq] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = async () => {
    if (step < 2) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const email = user?.primaryEmailAddress?.emailAddress ?? '';
      await createTenant({ email, niche: selectedNiche! }, token!);
      navigate('/library');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 pt-16 pb-8 max-w-lg mx-auto">
      <div className="flex gap-2 mb-12">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex-1"
          >
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">What do you create?</h1>
            <p className="text-muted-foreground text-sm mb-8">Pick your niche to personalize your scripts</p>
            <div className="grid grid-cols-2 gap-3">
              {niches.map((niche) => (
                <button
                  key={niche}
                  onClick={() => setSelectedNiche(niche)}
                  className={`py-4 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    selectedNiche === niche
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground"
                  }`}
                >
                  {niche}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex-1"
          >
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">How many videos per day?</h1>
            <p className="text-muted-foreground text-sm mb-8">We'll generate this many scripts each morning</p>
            <div className="grid grid-cols-2 gap-3">
              {frequencies.map((freq) => (
                <button
                  key={freq}
                  onClick={() => setSelectedFreq(freq)}
                  className={`py-6 rounded-xl text-2xl font-display font-bold transition-all active:scale-95 ${
                    selectedFreq === freq
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground"
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex-1 flex flex-col items-center justify-center text-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">You're all set</h1>
            <p className="text-muted-foreground text-sm">Generate your first script from the library</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={next}
        disabled={loading || (step === 0 && !selectedNiche) || (step === 1 && !selectedFreq)}
        className="mt-auto w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-base disabled:opacity-40 active:scale-[0.98] transition-transform"
      >
        {loading ? "Setting up..." : step === 2 ? "Go to Library" : "Continue"}
      </button>
    </div>
  );
}
