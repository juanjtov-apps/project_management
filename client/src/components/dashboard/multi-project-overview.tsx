import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import type { Project } from "@shared/schema";
import { 
  Building, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  Users,
  Calendar
} from "lucide-react";

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "border" + " " + "text-xs" + " " + "px-2" + " " + "py-1" + " " + "rounded";
    case "active":
      return "border" + " " + "text-xs" + " " + "px-2" + " " + "py-1" + " " + "rounded";
    case "on-hold":
      return "border" + " " + "text-xs" + " " + "px-2" + " " + "py-1" + " " + "rounded";
    case "delayed":
      return "border" + " " + "text-xs" + " " + "px-2" + " " + "py-1" + " " + "rounded";
    default:
      return "border" + " " + "text-xs" + " " + "px-2" + " " + "py-1" + " " + "rounded";
  }
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case "completed":
      return { backgroundColor: 'hsl(180, 70%, 40%, 0.1)', color: 'var(--brand-teal)', borderColor: 'hsl(180, 70%, 40%, 0.3)' };
    case "active":
      return { backgroundColor: 'hsl(210, 100%, 15%, 0.1)', color: 'var(--brand-blue)', borderColor: 'hsl(210, 100%, 15%, 0.3)' };
    case "on-hold":
      return { backgroundColor: 'hsl(210, 15%, 85%, 0.1)', color: 'var(--brand-ink)', borderColor: 'hsl(210, 15%, 85%, 0.3)' };
    case "delayed":
      return { backgroundColor: 'hsl(15, 85%, 65%, 0.1)', color: 'var(--brand-coral)', borderColor: 'hsl(15, 85%, 65%, 0.3)' };
    default:
      return { backgroundColor: 'hsl(210, 15%, 85%, 0.1)', color: 'var(--brand-ink)', borderColor: 'hsl(210, 15%, 85%, 0.3)' };
  }
};

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
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="multi-project-overview">
      {/* Overview Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold" style={{color: 'var(--brand-blue)'}}>Multi-Project Overview</h2>
          <Button
            variant="outline"
            onClick={() => setLocation("/projects")}
            className="hover:text-white" style={{color: 'var(--brand-teal)', borderColor: 'var(--brand-teal)'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--brand-teal)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            data-testid="view-all-projects"
          >
            View All Projects
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-4" style={{background: 'linear-gradient(to bottom right, hsl(210, 100%, 15%, 0.1), hsl(210, 100%, 15%, 0.2))', borderColor: 'hsl(210, 100%, 15%, 0.3)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{color: 'var(--brand-blue)'}}>Active Projects</p>
                <p className="text-2xl font-bold" style={{color: 'var(--brand-blue)'}}>{activeProjects.length}</p>
              </div>
              <Building style={{color: 'var(--brand-blue)'}} size={24} />
            </div>
          </Card>

          <Card className="p-4" style={{background: 'linear-gradient(to bottom right, hsl(180, 70%, 40%, 0.1), hsl(180, 70%, 40%, 0.2))', borderColor: 'hsl(180, 70%, 40%, 0.3)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{color: 'var(--brand-teal)'}}>Avg Progress</p>
                <p className="text-2xl font-bold" style={{color: 'var(--brand-teal)'}}>{averageProgress}%</p>
              </div>
              <TrendingUp style={{color: 'var(--brand-teal)'}} size={24} />
            </div>
          </Card>

          <Card className="p-4" style={{background: 'linear-gradient(to bottom right, hsl(15, 85%, 65%, 0.1), hsl(15, 85%, 65%, 0.2))', borderColor: 'hsl(15, 85%, 65%, 0.3)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{color: 'var(--brand-coral)'}}>Budget Usage</p>
                <p className="text-2xl font-bold" style={{color: 'var(--brand-coral)'}}>
                  {totalBudget > 0 ? Math.round((totalActualCost / totalBudget) * 100) : 0}%
                </p>
              </div>
              <DollarSign style={{color: 'var(--brand-coral)'}} size={24} />
            </div>
          </Card>

          <Card className="p-4" style={{background: 'linear-gradient(to bottom right, hsl(15, 85%, 65%, 0.1), hsl(15, 85%, 65%, 0.2))', borderColor: 'hsl(15, 85%, 65%, 0.3)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{color: 'var(--brand-coral)'}}>Critical Projects</p>
                <p className="text-2xl font-bold" style={{color: 'var(--brand-coral)'}}>{criticalProjects.length}</p>
              </div>
              <AlertTriangle style={{color: 'var(--brand-coral)'}} size={24} />
            </div>
          </Card>
        </div>
      </div>

      {/* Project Health Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project) => {
              const health = getHealthStatus(project.progress, project.status);
              const HealthIcon = health.icon;
              
              return (
                <Card 
                  key={project.id} 
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setLocation("/projects")}
                  data-testid={`project-health-card-${project.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold truncate" title={project.name} style={{color: 'var(--brand-blue)'}}>
                          {project.name}
                        </h4>
                        <p className="text-sm text-gray-600 truncate" title={project.location}>
                          {project.location}
                        </p>
                      </div>
                      <Badge className={getStatusColor(project.status)} style={getStatusStyle(project.status)}>
                        {project.status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <HealthIcon size={16} style={health.color} />
                        <span className="text-sm font-medium">{health.text}</span>
                      </div>
                      {project.dueDate && (
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Calendar size={14} />
                          <span>{new Date(project.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {project.budget && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Budget</span>
                          <span className="font-medium">
                            ${(project.budget / 100).toLocaleString()}
                          </span>
                        </div>
                        {project.actualCost > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Spent</span>
                            <span className={`font-medium ${
                              project.actualCost > project.budget ? 'text-red-600' : 'text-gray-800'
                            }`}>
                              ${(project.actualCost / 100).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
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