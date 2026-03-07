import { useState } from "react";
import { mockScripts, FilmingStatus } from "@/data/mockScripts";
import ScriptCard from "@/components/ScriptCard";

const tabs: { label: string; status: FilmingStatus }[] = [
  { label: "Ready", status: "ready" },
  { label: "Filmed", status: "filmed" },
  { label: "Posted", status: "posted" },
];

export default function Library() {
  const [activeTab, setActiveTab] = useState<FilmingStatus>("ready");
  const filtered = mockScripts.filter((s) => s.filmingStatus === activeTab);

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold text-foreground mb-4">Script Library</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-xl p-1 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.status}
            onClick={() => setActiveTab(tab.status)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.status
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((script, i) => (
          <ScriptCard key={script.id} script={script} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center pt-16">
          <p className="text-muted-foreground text-sm">
            No {activeTab} scripts yet
          </p>
        </div>
      )}
    </div>
  );
}
