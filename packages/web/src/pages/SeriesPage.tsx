import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { ApiSeries } from "@/types/api";
import { getSeries } from "@/lib/api";
import { Layers } from "lucide-react";
import { motion } from "framer-motion";

export default function SeriesPage() {
  const { getToken } = useAuth();

  const { data: series = [], isLoading } = useQuery({
    queryKey: ["series"],
    queryFn: async () => {
      const token = await getToken();
      return getSeries(token!) as Promise<ApiSeries[]>;
    },
  });

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold text-foreground mb-5">Series</h1>

      {isLoading ? (
        <div className="text-center pt-16">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      ) : series.length === 0 ? (
        <div className="text-center pt-16">
          <p className="text-muted-foreground text-sm">No series yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {series.map((s, si) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.1, type: "spring", stiffness: 300, damping: 28 }}
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
        </div>
      )}
    </div>
  );
}
