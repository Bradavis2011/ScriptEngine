import { mockScripts } from "@/data/mockScripts";
import { Video, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function CameraHub() {
  const navigate = useNavigate();
  const readyScripts = mockScripts.filter((s) => s.filmingStatus === "ready");

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold text-foreground mb-2">Ready to Film</h1>
      <p className="text-sm text-muted-foreground mb-6">Pick a script and start rolling</p>

      {readyScripts.length > 0 ? (
        <div className="space-y-3">
          {readyScripts.map((script, i) => (
            <motion.button
              key={script.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 28 }}
              onClick={() => navigate(`/teleprompter/${script.id}`)}
              className="w-full bg-card rounded-xl p-4 text-left active:scale-[0.98] transition-transform"
            >
              <p className="text-foreground font-medium text-sm line-clamp-2 mb-3">
                "{script.coldOpen}"
              </p>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">{script.duration}s</span>
                <span className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold">
                  <Video className="w-3.5 h-3.5" />
                  Film
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center pt-20 text-center">
          <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-foreground font-display font-semibold text-lg mb-1">All caught up!</h3>
          <p className="text-muted-foreground text-sm">No scripts waiting to be filmed</p>
        </div>
      )}
    </div>
  );
}
