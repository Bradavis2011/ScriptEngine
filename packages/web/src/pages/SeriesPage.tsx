import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiSeries } from "@/types/api";
import { getSeries, createSeries } from "@/lib/api";
import { Layers, Plus, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

export default function SeriesPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: series = [], isLoading } = useQuery({
    queryKey: ["series"],
    queryFn: async () => {
      const token = await getToken();
      return getSeries(token!) as Promise<ApiSeries[]>;
    },
  });

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const token = await getToken();
      await createSeries({ name: name.trim() }, token!);
      queryClient.invalidateQueries({ queryKey: ["series"] });
      setName("");
      setCreateOpen(false);
      toast.success("Series created!");
    } catch {
      toast.error("Failed to create series.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-display font-bold text-foreground">Series</h1>
        <button
          onClick={() => { setName(""); setCreateOpen(true); }}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          New Series
        </button>
      </div>

      {isLoading ? (
        <div className="text-center pt-16">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      ) : series.length === 0 ? (
        <div className="flex flex-col items-center pt-20 text-center">
          <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-foreground font-display font-semibold text-lg mb-1">No series yet</h3>
          <p className="text-muted-foreground text-sm mb-5">Group related scripts into a series</p>
          <button
            onClick={() => { setName(""); setCreateOpen(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            Create your first series
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {series.map((s, si) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.06, type: "spring", stiffness: 300, damping: 28 }}
                className="bg-card rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground font-semibold text-sm">{s.name}</h3>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {s.episodeCount} episode{s.episodeCount !== 1 ? "s" : ""} · {s.status.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create series sheet */}
      <Sheet open={createOpen} onOpenChange={(v) => { if (!loading) setCreateOpen(v); }}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-w-lg mx-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left font-display">New Series</SheetTitle>
          </SheetHeader>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Series name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. Morning Routine Hacks"
            autoFocus
            className="w-full bg-card border border-border rounded-xl px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary mb-5"
          />
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Creating…" : "Create Series"}
          </button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
