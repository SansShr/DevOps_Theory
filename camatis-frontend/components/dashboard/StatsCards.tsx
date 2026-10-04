import { Card, CardContent } from "@/components/ui/Card";
import { Bus, Route, TrendingUp, AlertTriangle, Users, Gauge } from "lucide-react";

export default function StatsCards({ stats }: { stats?: any }) {
  const statItems = [
    { 
      title: "Total Routes", 
      value: stats?.total_routes ?? 0, 
      icon: Route, 
      color: "text-blue-500",
      subtitle: "Bus routes in the network"
    },
    { 
      title: "Buses Running", 
      value: stats?.active_buses ?? 0, 
      icon: Bus, 
      color: "text-green-500",
      subtitle: "Currently operating"
    },
    { 
      title: "Avg Passengers", 
      value: stats?.avg_demand ? stats.avg_demand.toFixed(0) : "0", 
      icon: Users, 
      color: "text-purple-500",
      subtitle: "Per route daily"
    },
    { 
      title: "Bus Fullness", 
      value: stats?.avg_load_factor ? `${(stats.avg_load_factor * 100).toFixed(1)}%` : "0%", 
      icon: Gauge, 
      color: "text-indigo-500",
      subtitle: "How full buses are"
    },
    { 
      title: "Crowded Routes", 
      value: stats?.high_demand_routes ?? 0, 
      icon: TrendingUp, 
      color: "text-orange-500",
      subtitle: "Need more buses"
    },
    { 
      title: "Issues Found", 
      value: stats?.anomalies ?? 0, 
      icon: AlertTriangle, 
      color: "text-red-500",
      subtitle: "Unusual patterns"
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {statItems.map(({ title, value, icon: Icon, color, subtitle }) => (
        <Card key={title}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2.5 rounded-lg bg-slate-100 ${color}`}>
                <Icon size={20} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold mb-0.5">{typeof value === 'number' ? value.toLocaleString() : value}</p>
              <p className="text-xs font-medium text-slate-600">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}