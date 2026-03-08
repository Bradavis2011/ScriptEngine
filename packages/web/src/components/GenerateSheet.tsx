import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { generateScript } from "@/lib/api";
import { ApiScript, ApiSeries } from "@/types/api";
import { Loader2 } from "lucide-react";

const SCRIPT_TYPES = [
  { value: "niche_tip", label: "Niche Tip", desc: "3 actionable tips" },
  { value: "data_drop", label: "Data Drop", desc: "Surprising stat or fact" },
  { value: "trend_take", label: "Trend Take", desc: "Hot take on a trend" },
  { value: "series_episode", label: "Series Episode", desc: "Part of an ongoing series" },
] as const;

type ScriptTypeValue = (typeof SCRIPT_TYPES)[number]["value"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  series: ApiSeries[];
}

export default function GenerateSheet({ open, onOpenChange, series }: Props) {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [scriptType, setScriptType] = useState<ScriptTypeValue>("niche_tip");
  const [seriesId, setSeriesId] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setScriptType("niche_tip");
      setSeriesId("");
      setContext("");
    }
  }, [open]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const script = (await generateScript(
        {
          scriptType,
          seriesId: scriptType === "series_episode" && seriesId ? seriesId : undefined,
          additionalContext: context.trim() || undefined,
        },
        token!
      )) as ApiScript;
      queryClient.invalidateQueries({ queryKey: ["scripts"] });
      onOpenChange(false);
      navigate(`/script/${script.id}`);
    } catch {
      toast.error("Failed to generate script. Try again.");
      setLoading(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!loading) onOpenChange(v);
      }}
    >
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-w-lg mx-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="text-left font-display">Generate Script</SheetTitle>
        </SheetHeader>

        {/* Script type grid */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {SCRIPT_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setScriptType(t.value)}
              className={`text-left p-3 rounded-xl border transition-all active:scale-95 ${
                scriptType === t.value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card"
              }`}
            >
              <p className={`text-sm font-semibold ${scriptType === t.value ? "text-primary" : "text-foreground"}`}>
                {t.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>

        {/* Series picker */}
        {scriptType === "series_episode" && (
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Series {series.length === 0 ? "(create a series first)" : ""}
            </label>
            {series.length > 0 ? (
              <select
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground"
              >
                <option value="">Select a series…</option>
                {series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-muted-foreground">Go to the Series tab to create one first.</p>
            )}
          </div>
        )}

        {/* Additional context */}
        <div className="mb-5">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Additional context{" "}
            <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            disabled={loading}
            placeholder='e.g. "focus on beginner mistakes" or "use a personal story hook"'
            rows={3}
            className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || (scriptType === "series_episode" && series.length > 0 && !seriesId)}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating…
            </>
          ) : (
            "Generate Script"
          )}
        </button>

        {loading && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            This takes 10–20 seconds. Hang tight.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
