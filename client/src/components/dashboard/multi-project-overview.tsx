import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { MiniMetric } from "@/components/ui/mini-metric";
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
  Calendar
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

  // Calculate overview statistics
  const activeProjects = projects.filter(p => p.status === "active");
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalActualCost = projects.reduce((sum, p) => sum + (p.actualCost || 0), 0);
  const averageProgress = projects.length > 0 
    ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
    : 0;

  const criticalProjects = projects.filter(p => 
    p.status === "delayed" || (p.progress < 50 && p.status === "active")
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-slate-200 rounded"></div>
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

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
          <MiniMetric
            icon={Building}
            value={activeProjects.length}
            label="Active Projects"
            tone="blue"
            data-testid="metric-active-projects"
          />

          <MiniMetric
            icon={TrendingUp}
            value={`${averageProgress}%`}
            label="Avg Progress"
            tone="teal"
            data-testid="metric-avg-progress"
          />

          <MiniMetric
            icon={DollarSign}
            value={`${totalBudget > 0 ? Math.round((totalActualCost / totalBudget) * 100) : 0}%`}
            label="Budget Usage"
            tone="coral"
            data-testid="metric-budget-usage"
          />

          <MiniMetric
            icon={AlertTriangle}
            value={criticalProjects.length}
            label="Critical Projects"
            tone="coral"
            data-testid="metric-critical-projects"
          />
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