import { mockScripts } from "@/data/mockScripts";
import { User, BarChart3, Film, Send, TrendingUp } from "lucide-react";

export default function Profile() {
  const posted = mockScripts.filter((s) => s.filmingStatus === "posted");
  const filmed = mockScripts.filter((s) => s.filmingStatus === "filmed");
  const totalViews = posted.reduce((a, s) => a + (s.performance?.views || 0), 0);
  const totalFollows = posted.reduce((a, s) => a + (s.performance?.follows || 0), 0);

  const stats = [
    { icon: Film, label: "Filmed", value: filmed.length + posted.length },
    { icon: Send, label: "Posted", value: posted.length },
    { icon: BarChart3, label: "Views", value: totalViews.toLocaleString() },
    { icon: TrendingUp, label: "Follows", value: `+${totalFollows}` },
  ];

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center mb-3">
          <User className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-display font-bold text-foreground">Creator</h1>
        <p className="text-sm text-muted-foreground">Pro Plan · Business</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl p-4 text-center">
            <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-foreground font-display font-bold text-lg">{stat.value}</p>
            <p className="text-muted-foreground text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Performance logs for posted scripts */}
      <h2 className="text-lg font-display font-semibold text-foreground mb-3">Performance</h2>
      <div className="space-y-2">
        {posted.map((script) => (
          <div key={script.id} className="bg-card rounded-xl p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-medium truncate">"{script.coldOpen.slice(0, 50)}..."</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {script.performance?.views.toLocaleString()} views · {script.performance?.likes} likes · {script.performance?.shares} shares
              </p>
            </div>
            <span className="text-primary text-sm font-semibold">+{script.performance?.follows}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
