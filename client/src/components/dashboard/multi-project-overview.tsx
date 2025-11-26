import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import type { Project } from "@shared/schema";
import { 
  Building, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  Calendar,
  ArrowRight
} from "lucide-react";

const getStatusConfig = (status: string) => {
  switch (status) {
    case "completed":
      return { color: "#10B981", bgColor: "rgba(16, 185, 129, 0.15)", label: "Complete" };
    case "delayed":
      return { color: "#EF4444", bgColor: "rgba(239, 68, 68, 0.15)", label: "Delayed" };
    case "on-hold":
      return { color: "#F97316", bgColor: "rgba(249, 115, 22, 0.15)", label: "At Risk" };
    default:
      return { color: "#4ADE80", bgColor: "rgba(74, 222, 128, 0.15)", label: "On Track" };
  }
};

const statusColors = {
  "On Track": "#4ADE80",
  "At Risk": "#F97316",
  "Delayed": "#EF4444",
};

interface TimelineProject {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: string;
}

export default function MultiProjectOverview() {
  const [, setLocation] = useLocation();
  
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const delayedProjects = projects.filter(p => p.status === "delayed");
  const behindSchedule = projects.filter(p => p.status === "active" && p.progress < 50);
  const overBudget = projects.filter(p => 
    p.budget && p.actualCost && p.actualCost > p.budget
  );
  
  const now = new Date();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div 
          className="rounded-xl p-5"
          style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
        >
          <div className="animate-pulse space-y-4">
            <div className="h-6 rounded w-1/3" style={{ backgroundColor: '#1F242C' }}></div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 rounded" style={{ backgroundColor: '#1F242C' }}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const timelineProjects: TimelineProject[] = projects.slice(0, 4).map(p => {
    const createdDate = (p as any).createdAt ? new Date((p as any).createdAt) : new Date();
    return {
      id: p.id,
      name: p.name,
      startDate: createdDate,
      endDate: p.dueDate ? new Date(p.dueDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      progress: p.progress,
      status: p.status === "delayed" ? "Delayed" : p.status === "on-hold" ? "At Risk" : "On Track",
    };
  });

  const minDate = timelineProjects.length > 0 
    ? new Date(Math.min(...timelineProjects.map(p => p.startDate.getTime())))
    : new Date();
  const maxDate = timelineProjects.length > 0
    ? new Date(Math.max(...timelineProjects.map(p => p.endDate.getTime())))
    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
  
  const todayPosition = ((now.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100;

  return (
    <div className="space-y-6" data-testid="multi-project-overview">
      <div 
        className="rounded-xl p-5"
        style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">Multi-Project Overview</h2>
            <div className="flex items-center gap-4 ml-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4ADE80' }}></div>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>On Track</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F97316' }}></div>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>At Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>Delayed</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => setLocation("/projects")}
            className="text-[#4ADE80] hover:text-[#4ADE80] hover:bg-[#1F242C]"
            data-testid="view-all-projects"
          >
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <Building size={48} className="mx-auto mb-4" style={{ color: '#9CA3AF' }} />
            <p className="text-lg mb-2 text-white">No projects yet</p>
            <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>Create your first project to get started</p>
            <Button 
              onClick={() => setLocation("/projects")}
              style={{ backgroundColor: '#4ADE80', color: '#0F1115' }}
              className="hover:opacity-90"
            >
              Create Project
            </Button>
          </div>
        ) : (
          <div className="relative">
            <div 
              className="absolute top-0 bottom-0 w-0.5 z-10"
              style={{ 
                left: `${Math.max(0, Math.min(100, todayPosition))}%`,
                backgroundColor: 'white'
              }}
            >
              <div 
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded whitespace-nowrap"
                style={{ backgroundColor: 'white', color: '#0F1115' }}
              >
                Today
              </div>
            </div>
            
            <div className="space-y-4 pt-8">
              {timelineProjects.map((project) => {
                const startOffset = ((project.startDate.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100;
                const width = ((project.endDate.getTime() - project.startDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100;
                const statusColor = statusColors[project.status as keyof typeof statusColors] || "#4ADE80";
                
                return (
                  <div key={project.id} className="flex items-center gap-4">
                    <div className="w-32 shrink-0">
                      <span className="text-sm font-medium text-white truncate block">{project.name}</span>
                    </div>
                    <div className="flex-1 h-7 rounded-full relative" style={{ backgroundColor: '#1F242C' }}>
                      <div 
                        className="absolute h-full rounded-full transition-all duration-500"
                        style={{ 
                          left: `${startOffset}%`,
                          width: `${Math.max(width, 5)}%`,
                          backgroundColor: statusColor,
                          opacity: 0.3
                        }}
                      />
                      <div 
                        className="absolute h-full rounded-full transition-all duration-500"
                        style={{ 
                          left: `${startOffset}%`,
                          width: `${Math.max((width * project.progress) / 100, 2)}%`,
                          backgroundColor: statusColor
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projects.slice(0, 3).map((project) => {
          const config = getStatusConfig(project.status);
          return (
            <div 
              key={project.id}
              className="rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:translate-y-[-4px]"
              style={{ 
                backgroundColor: '#161B22',
                border: '1px solid #2D333B'
              }}
              onClick={() => setLocation("/projects")}
              data-testid={`project-thumbnail-${project.id}`}
            >
              <div 
                className="h-40 relative"
                style={{ 
                  background: `linear-gradient(135deg, #1F242C 0%, #0F1115 100%)`
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building className="h-16 w-16" style={{ color: '#2D333B' }} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold text-sm truncate">{project.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div 
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: '#1F242C' }}
                    >
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${project.progress}%`,
                          backgroundColor: config.color
                        }}
                      />
                    </div>
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ 
                        backgroundColor: config.bgColor,
                        color: config.color
                      }}
                    >
                      {config.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
