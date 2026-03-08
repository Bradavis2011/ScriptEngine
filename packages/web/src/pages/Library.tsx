import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FilmingStatus } from "@/data/mockScripts";
import { ApiScript, ApiSeries, fromApiScript } from "@/types/api";
import { getScripts, getSeries } from "@/lib/api";
import ScriptCard from "@/components/ScriptCard";
import GenerateSheet from "@/components/GenerateSheet";
import { Plus } from "lucide-react";

const tabs: { label: string; status: FilmingStatus }[] = [
  { label: "Ready", status: "ready" },
  { label: "Filmed", status: "filmed" },
  { label: "Posted", status: "posted" },
];

export default function Library() {
  const [activeTab, setActiveTab] = useState<FilmingStatus>("ready");
  const [generateOpen, setGenerateOpen] = useState(false);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const { data: seriesList = [] } = useQuery({
    queryKey: ["series"],
    queryFn: async () => {
      const token = await getToken();
      return getSeries(token!) as Promise<ApiSeries[]>;
    },
  });

  const { data: scripts = [], isLoading, isError, error } = useQuery({
    queryKey: ["scripts", activeTab],
    queryFn: async () => {
      const token = await getToken();
      const raw = await getScripts(activeTab, token!) as ApiScript[];
      return raw.map(fromApiScript);
    },
  });

  useEffect(() => {
    if (isError && (error as Error).message?.includes('Tenant not found')) {
      navigate('/onboarding');
    }
  }, [isError, error, navigate]);

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Script Library</h1>
        <button
          onClick={() => setGenerateOpen(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          Generate
        </button>
      </div>
      <GenerateSheet open={generateOpen} onOpenChange={setGenerateOpen} series={seriesList} />

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

      {isLoading ? (
        <div className="text-center pt-16">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scripts.map((script, i) => (
            <ScriptCard key={script.id} script={script} index={i} />
          ))}
          {scripts.length === 0 && (
            <div className="text-center pt-16">
              <p className="text-muted-foreground text-sm">No {activeTab} scripts yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
