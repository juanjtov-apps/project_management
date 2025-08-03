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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white p-6 rounded-lg border border-[var(--proesphere-mist)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:bg-gray-50/30 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--proesphere-teal)]/40 focus:ring-offset-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--proesphere-graphite)] opacity-70 font-medium">Active Projects</p>
            <p className="text-2xl font-bold text-[var(--proesphere-deep-blue)] tabular-nums">{stats.activeProjects}</p>
            <p className="text-sm text-[var(--proesphere-teal)] mt-1 font-medium">
              <TrendingUp size={12} className="inline mr-1" /> 2 new this week
            </p>
          </div>
          <div className="w-12 h-12 bg-[var(--proesphere-teal)]/10 rounded-lg flex items-center justify-center">
            <Building className="text-[var(--proesphere-teal)]" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-[var(--proesphere-mist)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:bg-gray-50/30 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--proesphere-teal)]/40 focus:ring-offset-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--proesphere-graphite)] opacity-70 font-medium">Tasks Due Today</p>
            <p className="text-2xl font-bold text-[var(--proesphere-deep-blue)] tabular-nums">{stats.pendingTasks}</p>
            <p className="text-sm text-[var(--proesphere-coral)] mt-1 font-medium">
              <Clock size={12} className="inline mr-1" /> 8 due today
            </p>
          </div>
          <div className="w-12 h-12 bg-[var(--proesphere-teal)]/10 rounded-lg flex items-center justify-center">
            <Clock className="text-[var(--proesphere-teal)]" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-[var(--proesphere-mist)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:bg-gray-50/30 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--proesphere-teal)]/40 focus:ring-offset-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--proesphere-graphite)] opacity-70 font-medium">Completed Tasks</p>
            <p className="text-2xl font-bold text-[var(--proesphere-deep-blue)] tabular-nums">156</p>
            <p className="text-sm text-[var(--proesphere-teal)] mt-1 font-medium">
              <TrendingUp size={12} className="inline mr-1" /> {stats.photosUploadedToday} today
            </p>
          </div>
          <div className="w-12 h-12 bg-[var(--proesphere-teal)]/10 rounded-lg flex items-center justify-center">
            <CheckSquare className="text-[var(--proesphere-teal)]" size={24} />
          </div>
        </div>
      </div>
    </div>
  );
}
