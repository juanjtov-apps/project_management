import { useQuery } from "@tanstack/react-query";
import { Building, Clock } from "lucide-react";

interface DashboardStats {
  activeProjects: number;
  pendingTasks: number;
}

interface KPICardProps {
  icon: any;
  value: string | number;
  label: string;
  sublabel?: string;
  accentColor?: string;
}

function KPICard({ icon: Icon, value, label, sublabel, accentColor = "#4ADE80" }: KPICardProps) {
  return (
    <div
      className="rounded-xl p-5 transition-all duration-300 hover:translate-y-[-2px]"
      style={{
        backgroundColor: '#161B22',
        border: '1px solid #2D333B',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
      }}
    >
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
  );
}

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:gap-6 mb-8">
        {Array.from({ length: 2 }).map((_, i) => (
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
    <div className="grid grid-cols-2 gap-4 md:gap-6 mb-8">
      <KPICard
        icon={Building}
        value={stats.activeProjects}
        label="Active Projects"
        sublabel="+2 this week"
        accentColor="#4ADE80"
      />

      <KPICard
        icon={Clock}
        value={stats.pendingTasks}
        label="Tasks Due Today"
        sublabel="8 overdue"
        accentColor="#F97316"
      />
    </div>
  );
}
