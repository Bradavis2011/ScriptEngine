import { ScriptType } from "@/data/mockScripts";

const config: Record<ScriptType, { label: string; className: string }> = {
  series_episode: { label: "Series", className: "bg-type-series/20 text-type-series" },
  data_drop: { label: "Data Drop", className: "bg-type-data/20 text-type-data" },
  trend_take: { label: "Trend Take", className: "bg-type-trend/20 text-type-trend" },
  niche_tip: { label: "Niche Tip", className: "bg-type-niche/20 text-type-niche" },
};

export default function ScriptTypeBadge({ type }: { type: ScriptType }) {
  const { label, className } = config[type];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}
