import { Script } from "@/data/mockScripts";
import ScriptTypeBadge from "./ScriptTypeBadge";
import StatusBadge from "./StatusBadge";
import { Clock, Video } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function ScriptCard({ script, index = 0 }: { script: Script; index?: number }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      onClick={() => navigate(`/script/${script.id}`)}
      className="bg-card rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-2 mb-3">
        <ScriptTypeBadge type={script.scriptType} />
        {script.seriesTitle && (
          <span className="text-xs text-muted-foreground truncate">
            {script.seriesTitle} · Ep {script.episodeNumber}
          </span>
        )}
        <div className="ml-auto">
          <StatusBadge status={script.filmingStatus} />
        </div>
      </div>

      <p className="text-foreground font-medium text-sm leading-relaxed line-clamp-2 mb-3">
        "{script.coldOpen}"
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>{script.duration}s</span>
        </div>

        {script.filmingStatus === "ready" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/teleprompter/${script.id}`);
            }}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-transform"
          >
            <Video className="w-3.5 h-3.5" />
            Film This
          </button>
        )}
      </div>
    </motion.div>
  );
}
