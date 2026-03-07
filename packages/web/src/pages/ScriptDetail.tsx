import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { ApiScript, fromApiScript } from "@/types/api";
import { getScript } from "@/lib/api";
import ScriptTypeBadge from "@/components/ScriptTypeBadge";
import StatusBadge from "@/components/StatusBadge";
import { ArrowLeft, Video, Copy, Hash, Clock, Camera, Film, Type, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ScriptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const { data: script, isLoading } = useQuery({
    queryKey: ["script", id],
    queryFn: async () => {
      const token = await getToken();
      const raw = await getScript(id!, token!) as ApiScript;
      return fromApiScript(raw);
    },
    enabled: !!id,
  });

  if (isLoading || !script) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{isLoading ? "Loading..." : "Script not found"}</p>
      </div>
    );
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const shareScript = () => {
    const sectionLines = script.sections
      .slice(0, 3)
      .map((s) => `→ ${s.spokenWords.slice(0, 60)}${s.spokenWords.length > 60 ? "…" : ""}`)
      .join("\n");
    const text = `Here's the script I used for today's video:\n\n"${script.coldOpen}"\n\n${sectionLines}\n\nMade with ClipScript 🎬 clipscriptai.com`;
    navigator.clipboard.writeText(text);
    toast.success("Script card copied — paste it as a post!");
  };

  return (
    <div className="min-h-screen pb-32 max-w-lg mx-auto">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl px-4 py-3 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ScriptTypeBadge type={script.scriptType} />
          <StatusBadge status={script.filmingStatus} />
        </div>
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>{script.duration}s</span>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {script.seriesTitle && (
          <div className="bg-secondary/10 rounded-lg px-3 py-2 text-sm text-secondary">
            {script.seriesTitle} · Episode {script.episodeNumber}
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className="bg-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Cold Open</span>
          </div>
          <p className="text-foreground font-medium leading-relaxed mb-3">"{script.coldOpen}"</p>
          {script.coldOpenCamera && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Camera className="w-3.5 h-3.5" />
              <span>{script.coldOpenCamera}</span>
            </div>
          )}
        </motion.div>

        {script.sections.map((section, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 300, damping: 28 }}
            className="bg-card rounded-xl p-4"
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{section.title}</span>
            <p className="text-foreground leading-relaxed mt-2 mb-3">"{section.spokenWords}"</p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {section.cameraDirection && (
                <div className="flex items-start gap-1.5">
                  <Camera className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{section.cameraDirection}</span>
                </div>
              )}
              {section.bRollSuggestion && (
                <div className="flex items-start gap-1.5">
                  <Film className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{section.bRollSuggestion}</span>
                </div>
              )}
              {section.textOverlay && (
                <div className="flex items-start gap-1.5">
                  <Type className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{section.textOverlay}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 25 }}
          className="bg-card rounded-xl p-4"
        >
          <span className="text-xs font-semibold text-success uppercase tracking-wider">Call to Action</span>
          <p className="text-foreground leading-relaxed mt-2 mb-3">"{script.callToAction}"</p>
          {script.callToActionCamera && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Camera className="w-3.5 h-3.5" />
              <span>{script.callToActionCamera}</span>
            </div>
          )}
        </motion.div>

        <div className="flex gap-2">
          <button
            onClick={() => copyToClipboard(script.caption, "Caption")}
            className="flex-1 flex items-center justify-center gap-2 bg-card text-foreground py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform"
          >
            <Copy className="w-4 h-4" />
            Copy Caption
          </button>
          <button
            onClick={() => copyToClipboard(script.hashtags.join(" "), "Hashtags")}
            className="flex-1 flex items-center justify-center gap-2 bg-card text-foreground py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform"
          >
            <Hash className="w-4 h-4" />
            Copy Hashtags
          </button>
        </div>

        <button
          onClick={shareScript}
          className="w-full flex items-center justify-center gap-2 border border-primary/40 text-primary py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform"
        >
          <Share2 className="w-4 h-4" />
          Share Script Card
        </button>
      </div>

      {script.filmingStatus === "ready" && (
        <div className="fixed bottom-20 left-0 right-0 px-4 max-w-lg mx-auto">
          <button
            onClick={() => navigate(`/teleprompter/${script.id}`)}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-base shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
          >
            <Video className="w-5 h-5" />
            Film With Teleprompter
          </button>
        </div>
      )}
    </div>
  );
}
