import { useQuery } from "@tanstack/react-query";
import { Building, CheckSquare, Camera, Clock, DollarSign, TrendingUp } from "lucide-react";

interface DashboardStats {
  activeProjects: number;
  pendingTasks: number;
  photosUploaded: number;
  photosUploadedToday: number;
  crewMembers: number;
}

interface KPICardProps {
  icon: any;
  value: string | number;
  label: string;
  sublabel?: string;
  hasRadial?: boolean;
  radialValue?: number;
  accentColor?: string;
}

function KPICard({ icon: Icon, value, label, sublabel, hasRadial, radialValue = 0, accentColor = "#4ADE80" }: KPICardProps) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (radialValue / 100) * circumference;
  
  return (
    <div 
      className="rounded-xl p-5 transition-all duration-300 hover:translate-y-[-2px]"
      style={{ 
        backgroundColor: '#161B22',
        border: '1px solid #2D333B',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="h-4 w-4" style={{ color: '#9CA3AF' }} />
            <span className="text-sm font-medium" style={{ color: '#9CA3AF' }}>{label}</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{value}</div>
          {sublabel && (
            <div className="text-xs font-medium" style={{ color: accentColor }}>
              {sublabel}
            </div>
          )}
        </div>
        
        {hasRadial && (
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="#1F242C"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke={accentColor}
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{radialValue}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className="rounded-xl p-5 min-h-[120px]"
            style={{ 
              backgroundColor: '#161B22',
              border: '1px solid #2D333B'
            }}
          >
            <div className="animate-pulse space-y-3">
              <div className="h-4 rounded w-24" style={{ backgroundColor: '#1F242C' }}></div>
              <div className="h-8 rounded w-16" style={{ backgroundColor: '#1F242C' }}></div>
              <div className="h-3 rounded w-20" style={{ backgroundColor: '#1F242C' }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4 mb-8">
      <KPICard
        icon={Building}
        value={stats.activeProjects}
        label="Active Projects"
        sublabel="+2 this week"
        accentColor="#4ADE80"
        data-testid="stat-active-projects"
      />

      <KPICard
        icon={Clock}
        value={stats.pendingTasks}
        label="Tasks Due Today"
        sublabel="8 overdue"
        accentColor="#F97316"
        data-testid="stat-tasks-due"
      />

      <KPICard
        icon={CheckSquare}
        value={156}
        label="Completed Tasks"
        sublabel={`+${stats.photosUploadedToday} this week`}
        accentColor="#4ADE80"
        data-testid="stat-completed-tasks"
      />

      <KPICard
        icon={DollarSign}
        value="$1.2M"
        label="Financial Health"
        sublabel="On budget"
        hasRadial={true}
        radialValue={78}
        accentColor="#4ADE80"
        data-testid="stat-financial-health"
      />
    </div>
  );
}
