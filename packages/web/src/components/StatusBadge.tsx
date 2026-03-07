import { FilmingStatus } from "@/data/mockScripts";

const config: Record<FilmingStatus, { label: string; className: string }> = {
  ready: { label: "Ready", className: "bg-primary/20 text-primary" },
  filmed: { label: "Filmed", className: "bg-secondary/20 text-secondary" },
  posted: { label: "Posted", className: "bg-success/20 text-success" },
};

export default function StatusBadge({ status }: { status: FilmingStatus }) {
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
