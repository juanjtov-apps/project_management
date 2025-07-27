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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Active Projects</p>
            <p className="text-3xl font-bold construction-secondary">{stats.activeProjects}</p>
            <p className="text-sm construction-success mt-1">
              <TrendingUp size={12} className="inline mr-1" /> 2 new this week
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building className="text-blue-600" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Pending Tasks</p>
            <p className="text-3xl font-bold construction-secondary">{stats.pendingTasks}</p>
            <p className="text-sm construction-warning mt-1">
              <Clock size={12} className="inline mr-1" /> 8 due today
            </p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <CheckSquare className="text-orange-600" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Photos Uploaded</p>
            <p className="text-3xl font-bold construction-secondary">{stats.photosUploaded}</p>
            <p className="text-sm construction-success mt-1">
              <TrendingUp size={12} className="inline mr-1" /> {stats.photosUploadedToday} today
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Camera className="text-green-600" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Crew Members</p>
            <p className="text-3xl font-bold construction-secondary">{stats.crewMembers}</p>
            <p className="text-sm text-gray-500 mt-1">
              <Users size={12} className="inline mr-1" /> 4 teams active
            </p>
          </div>
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Users className="text-gray-600" size={24} />
          </div>
        </div>
      </div>
    </div>
  );
}
