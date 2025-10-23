import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ProjectHealthCard } from "@/components/ui/project-health-card";
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
  ArrowUp,
  ArrowDown
} from "lucide-react";

const getHealthStatus = (progress: number, status: string) => {
  if (status === "completed") return { icon: CheckCircle, color: { color: 'var(--brand-teal)' }, text: "Complete" };
  if (status === "delayed") return { icon: AlertTriangle, color: { color: 'var(--brand-coral)' }, text: "At Risk" };
  if (progress >= 80) return { icon: TrendingUp, color: { color: 'var(--brand-teal)' }, text: "On Track" };
  if (progress >= 50) return { icon: Clock, color: { color: 'var(--brand-ink)' }, text: "Moderate" };
  return { icon: TrendingDown, color: { color: 'var(--brand-coral)' }, text: "Behind" };
};

export default function MultiProjectOverview() {
  const [, setLocation] = useLocation();
  
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Calculate insights from existing projects data only (no new backend calls)
  const delayedProjects = projects.filter(p => p.status === "delayed");
  const behindSchedule = projects.filter(p => p.status === "active" && p.progress < 50);
  const overBudget = projects.filter(p => 
    p.budget && p.actualCost && p.actualCost > p.budget
  );
  
  // Projects completing this month
  const now = new Date();
  const thisMonth = projects.filter(p => {
    if (!p.dueDate) return false;
    const due = new Date(p.dueDate);
    return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear();
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 bg-slate-200 rounded px-3"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="multi-project-overview">
      {/* Overview Header */}
      <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{color: 'var(--brand-blue)'}}>Multi-Project Overview</h2>
          <Button
            variant="outline"
            onClick={() => setLocation("/projects")}
            className="hover:text-white focus:outline-none focus:ring-4 focus:ring-slate-200" style={{color: 'var(--brand-teal)', borderColor: 'var(--brand-teal)'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--brand-teal)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            data-testid="view-all-projects"
            aria-label="View all projects"
          >
            View All Projects
          </Button>
        </div>

        {/* Insights - Different from top KPIs, computed from existing project data */}
        <div className="flex flex-wrap gap-2">
          {delayedProjects.length > 0 && (
            <div 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-sm font-medium text-red-700"
              data-testid="insight-delayed-projects"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>{delayedProjects.length} delayed project{delayedProjects.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          
          {behindSchedule.length > 0 && (
            <div 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-sm font-medium text-amber-700"
              data-testid="insight-behind-schedule"
            >
              <Clock className="h-4 w-4" />
              <span>{behindSchedule.length} behind schedule</span>
            </div>
          )}
          
          {overBudget.length > 0 && (
            <div 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-sm font-medium text-orange-700"
              data-testid="insight-over-budget"
            >
              <DollarSign className="h-4 w-4" />
              <span>{overBudget.length} over budget</span>
            </div>
          )}
          
          {thisMonth.length > 0 && (
            <div 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-sm font-medium text-blue-700"
              data-testid="insight-completing-this-month"
            >
              <Calendar className="h-4 w-4" />
              <span>{thisMonth.length} due this month</span>
            </div>
          )}
          
          {delayedProjects.length === 0 && behindSchedule.length === 0 && overBudget.length === 0 && thisMonth.length === 0 && (
            <div 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-sm font-medium text-green-700"
              data-testid="insight-all-on-track"
            >
              <CheckCircle className="h-4 w-4" />
              <span>All projects on track</span>
            </div>
          )}
        </div>
      </div>

      {/* Project Health Cards */}
      <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--brand-blue)'}}>Project Health Status</h3>
        
        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">No projects yet</p>
            <p className="text-sm">Create your first project to get started</p>
            <Button 
              className="mt-4" style={{backgroundColor: 'var(--brand-teal)'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(180, 70%, 35%)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--brand-teal)'}
              onClick={() => setLocation("/projects")}
            >
              Create Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            {projects.slice(0, 6).map((project) => {
              const health = getHealthStatus(project.progress, project.status);
              const statusMap: Record<string, "active" | "on-hold" | "completed" | "planning"> = {
                "active": "active",
                "on-hold": "on-hold",
                "completed": "completed",
                "planning": "planning",
                "delayed": "on-hold",
              };
              
              return (
                <ProjectHealthCard
                  key={project.id}
                  projectName={project.name}
                  location={project.location}
                  progress={project.progress}
                  status={statusMap[project.status] || "planning"}
                  healthIcon={health.icon}
                  healthLabel={health.text}
                  healthColor={health.color.color}
                  dueDate={project.dueDate ? new Date(project.dueDate).toLocaleDateString() : undefined}
                  onClick={() => setLocation("/projects")}
                  data-testid={`project-health-card-${project.id}`}
                />
              );
            })}
          </div>
        )}

        {projects.length > 6 && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setLocation("/projects")}
              className="hover:text-white" style={{color: 'var(--brand-teal)', borderColor: 'var(--brand-teal)'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--brand-teal)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              View All {projects.length} Projects
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}