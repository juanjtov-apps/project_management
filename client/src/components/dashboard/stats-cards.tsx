import { useQuery } from "@tanstack/react-query";
import { Building, CheckSquare, Camera, Users, TrendingUp, Clock, ArrowUpRight, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface DashboardStats {
  activeProjects: number;
  pendingTasks: number;
  photosUploaded: number;
  photosUploadedToday: number;
  crewMembers: number;
}

export default function StatsCards() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const kpis = [
    {
      title: "Active Projects",
      value: stats?.activeProjects || 0,
      change: "+2 this week",
      changeType: "positive" as const,
      icon: Building,
      color: "brand",
      href: "/projects"
    },
    {
      title: "Tasks Due Today",
      value: stats?.pendingTasks || 0,
      change: "8 due today",
      changeType: "warning" as const,
      icon: Clock,
      color: "warning",
      href: "/tasks"
    },
    {
      title: "Completed Tasks",
      value: 156,
      change: `+${stats?.photosUploadedToday || 0} today`,
      changeType: "positive" as const,
      icon: CheckSquare,
      color: "success",
      href: "/tasks"
    },
    {
      title: "Photos Uploaded",
      value: stats?.photosUploaded || 0,
      change: `+${stats?.photosUploadedToday || 0} today`,
      changeType: "neutral" as const,
      icon: Camera,
      color: "brand",
      href: "/photos"
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card p-6 rounded-xl border border-border animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-10 w-10 bg-muted rounded-lg"></div>
            </div>
            <div className="h-8 bg-muted rounded w-16 mb-2"></div>
            <div className="h-3 bg-muted rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const getColorClasses = (color: string) => {
    switch (color) {
      case "brand":
        return {
          icon: "text-brand-500",
          bg: "bg-brand-50",
          border: "border-brand-200"
        };
      case "warning":
        return {
          icon: "text-orange-500",
          bg: "bg-orange-50",
          border: "border-orange-200"
        };
      case "success":
        return {
          icon: "text-green-500",
          bg: "bg-green-50",
          border: "border-green-200"
        };
      default:
        return {
          icon: "text-brand-500",
          bg: "bg-brand-50",
          border: "border-brand-200"
        };
    }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case "positive": return "text-green-600";
      case "warning": return "text-orange-600";
      case "negative": return "text-red-600";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        const colors = getColorClasses(kpi.color);
        
        return (
          <div
            key={index}
            onClick={() => setLocation(kpi.href)}
            className={cn(
              "group bg-card p-6 rounded-xl border border-border",
              "hover:border-primary/20 hover:shadow-lg",
              "transition-all duration-200 cursor-pointer",
              "btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {kpi.title}
                </p>
                <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
                  {kpi.value.toLocaleString()}
                </p>
              </div>
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                colors.bg, colors.border, "border",
                "group-hover:scale-110 transition-transform duration-200"
              )}>
                <Icon size={20} className={colors.icon} />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                {kpi.changeType === "positive" && <TrendingUp size={12} className="text-green-600" />}
                {kpi.changeType === "warning" && <AlertTriangle size={12} className="text-orange-600" />}
                <span className={cn("text-xs font-medium", getChangeColor(kpi.changeType))}>
                  {kpi.change}
                </span>
              </div>
              <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
