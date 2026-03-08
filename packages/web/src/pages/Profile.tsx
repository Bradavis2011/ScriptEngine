import { useAuth, useUser } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { User, BarChart3, Film, Send } from "lucide-react";
import { ApiScript } from "@/types/api";
import { getScripts } from "@/lib/api";

export default function Profile() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const { data: filmed = [] } = useQuery({
    queryKey: ["scripts", "filmed"],
    queryFn: async () => {
      const token = await getToken();
      return await getScripts("filmed", token!) as ApiScript[];
    },
  });

  const { data: posted = [] } = useQuery({
    queryKey: ["scripts", "posted"],
    queryFn: async () => {
      const token = await getToken();
      return await getScripts("posted", token!) as ApiScript[];
    },
  });

  const stats = [
    { icon: Film, label: "Filmed", value: filmed.length + posted.length },
    { icon: Send, label: "Posted", value: posted.length },
    { icon: BarChart3, label: "Scripts", value: filmed.length + posted.length },
  ];

  const displayName = user?.fullName ?? user?.username ?? "Creator";
  const planLabel = "Free Plan";

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex flex-col items-center mb-6">
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt={displayName} className="w-20 h-20 rounded-full object-cover mb-3" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center mb-3">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        <h1 className="text-xl font-display font-bold text-foreground">{displayName}</h1>
        <p className="text-sm text-muted-foreground">{planLabel}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl p-4 text-center">
            <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-foreground font-display font-bold text-lg">{stat.value}</p>
            <p className="text-muted-foreground text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {posted.length > 0 && (
        <>
          <h2 className="text-lg font-display font-semibold text-foreground mb-3">Posted Scripts</h2>
          <div className="space-y-2">
            {posted.map((script) => (
              <div key={script.id} className="bg-card rounded-xl p-3">
                <p className="text-foreground text-sm font-medium truncate">
                  "{script.scriptData.coldOpen.slice(0, 60)}..."
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {new Date(script.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
