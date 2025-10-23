import { useQuery } from "@tanstack/react-query";
import { Building, CheckSquare, Camera, Clock } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

interface DashboardStats {
  activeProjects: number;
  pendingTasks: number;
  photosUploaded: number;
  photosUploadedToday: number;
  crewMembers: number;
}

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm min-h-[88px] animate-pulse">
            <div className="h-4 bg-slate-200 rounded mb-2"></div>
            <div className="h-6 bg-slate-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4 mb-8">
      <StatCard
        icon={Building}
        value={stats.activeProjects}
        label="Active Projects"
        sublabel="2 new this week"
        tone="teal"
        data-testid="stat-active-projects"
      />

      <StatCard
        icon={Clock}
        value={stats.pendingTasks}
        label="Tasks Due Today"
        sublabel="8 due today"
        tone="coral"
        data-testid="stat-tasks-due"
      />

      <StatCard
        icon={CheckSquare}
        value={156}
        label="Completed Tasks"
        sublabel={`${stats.photosUploadedToday} today`}
        tone="teal"
        data-testid="stat-completed-tasks"
      />

      <StatCard
        icon={Camera}
        value={stats.photosUploaded}
        label="Photos Uploaded"
        sublabel={`${stats.photosUploadedToday} today`}
        tone="teal"
        data-testid="stat-photos-uploaded"
      />
    </div>
  );
}
