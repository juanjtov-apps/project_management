import { useQuery } from "@tanstack/react-query";
import { Building, CheckSquare, Camera, Users, TrendingUp, Clock } from "lucide-react";

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 grid-gap mb-8">
      <div className="elevated card-padding hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer focus-ring" tabIndex={0}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(31, 167, 124, 0.1)' }}>
            <Building size={24} style={{ color: '#1FA77C', fill: 'none', stroke: '#1FA77C', strokeWidth: 2 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">Active Projects</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums leading-none">{stats.activeProjects}</p>
            <p className="text-sm text-brand-teal mt-1 font-medium flex items-center gap-1">
              <TrendingUp size={12} /> 2 new this week
            </p>
          </div>
        </div>
      </div>

      <div className="elevated card-padding hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer focus-ring" tabIndex={0}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-teal/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Clock className="text-brand-teal" size={24} style={{ color: '#1FA77C' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">Tasks Due Today</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums leading-none">{stats.pendingTasks}</p>
            <p className="text-sm text-brand-coral mt-1 font-medium flex items-center gap-1">
              <Clock size={12} /> 8 due today
            </p>
          </div>
        </div>
      </div>

      <div className="elevated card-padding hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer focus-ring" tabIndex={0}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(31, 167, 124, 0.1)' }}>
            <CheckSquare size={24} style={{ color: '#1FA77C', fill: 'none', stroke: '#1FA77C', strokeWidth: 2 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">Completed Tasks</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums leading-none">156</p>
            <p className="text-sm text-brand-teal mt-1 font-medium flex items-center gap-1">
              <TrendingUp size={12} /> {stats.photosUploadedToday} today
            </p>
          </div>
        </div>
      </div>

      <div className="elevated card-padding hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer focus-ring" tabIndex={0}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-teal/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Camera className="text-brand-teal" size={24} style={{ color: '#1FA77C' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">Photos Uploaded</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums leading-none">{stats.photosUploaded}</p>
            <p className="text-sm text-brand-coral mt-1 font-medium flex items-center gap-1">
              <Camera size={12} /> {stats.photosUploadedToday} today
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
