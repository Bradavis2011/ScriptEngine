import { mockSeries } from "@/data/mockScripts";
import StatusBadge from "@/components/StatusBadge";
import { Layers, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function SeriesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold text-foreground mb-5">Series</h1>

      <div className="space-y-4">
        {mockSeries.map((series, si) => (
          <motion.div
            key={series.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.1, type: "spring", stiffness: 300, damping: 28 }}
            className="bg-card rounded-xl p-4"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-foreground font-semibold text-sm">{series.title}</h3>
                <p className="text-muted-foreground text-xs mt-0.5">{series.description}</p>
              </div>
            </div>

            {/* Episode progress */}
            <div className="space-y-2">
              {series.episodes.map((ep) => (
                <button
                  key={ep.episodeNumber}
                  onClick={() => ep.scriptId ? navigate(`/script/${ep.scriptId}`) : undefined}
                  className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-sm transition-colors ${
                    ep.scriptId ? "bg-muted/50 active:bg-muted" : "bg-muted/20 opacity-50"
                  }`}
                >
                  <span className="text-foreground font-medium">Episode {ep.episodeNumber}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ep.status} />
                    {ep.scriptId && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{series.episodes.length} / {series.episodeCount} episodes</span>
              <span className="capitalize">{series.status.replace("_", " ")}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
