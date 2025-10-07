import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Clock, RotateCcw, CheckCircle2, LucideIcon } from "lucide-react";

interface StatItem {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

interface ActivityStatsProps {
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  className?: string;
}

const ActivityStats = ({ stats, className }: ActivityStatsProps) => {
  const statItems: StatItem[] = [
    {
      label: "Total",
      value: stats.total,
      icon: TrendingUp,
      color: "text-blue-500"
    },
    {
      label: "Pendentes",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-500"
    },
    {
      label: "Em Progresso",
      value: stats.inProgress,
      icon: RotateCcw,
      color: "text-blue-500"
    },
    {
      label: "Concluídas",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-green-500"
    }
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 ${className}`}>
      {statItems.map((stat) => (
        <Card key={stat.label} className="bg-card border hover:shadow-sm transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xl sm:text-2xl font-bold truncate">{stat.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ActivityStats;
