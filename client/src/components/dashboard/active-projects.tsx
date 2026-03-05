import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { getStatusConfig } from "@/lib/statusColors";
import type { Project } from "@shared/schema";
import { Building } from "lucide-react";

export default function ActiveProjects() {
  const [, setLocation] = useLocation();
  
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const activeProjects = Array.isArray(projects) ? projects.slice(0, 3) : [];

  if (isLoading) {
    return (
      <div 
        className="rounded-xl"
        style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
      >
        <div className="p-5 border-b" style={{ borderColor: '#2D333B' }}>
          <h3 className="text-lg font-semibold text-white">Active Projects</h3>
        </div>
        <div className="p-5">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 rounded-lg" style={{ backgroundColor: '#1F242C' }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-xl"
      style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
      data-testid="active-projects"
    >
      <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: '#2D333B' }}>
        <h3 className="text-lg font-semibold text-white">Active Projects</h3>
        <Button
          variant="ghost"
          className="text-sm font-medium"
          style={{ color: '#4ADE80' }}
          onClick={() => setLocation("/projects")}
          data-testid="view-all-active-projects"
        >
          View All
        </Button>
      </div>
      <div className="p-5">
        {activeProjects.length === 0 ? (
          <div className="text-center py-8">
            <Building className="mx-auto mb-3 h-12 w-12" style={{ color: '#9CA3AF' }} />
            <p className="text-white font-medium mb-1">No active projects</p>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>Create your first project to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeProjects.map((project) => {
              const config = getStatusConfig(project.status);
              return (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 hover:translate-y-[-2px]"
                  style={{ 
                    backgroundColor: '#1F242C',
                    border: '1px solid #2D333B'
                  }}
                  onClick={() => setLocation("/projects")}
                  data-testid={`active-project-${project.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: '#161B22' }}
                    >
                      <span className="font-semibold" style={{ color: '#4ADE80' }}>
                        {project.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{project.name}</h4>
                      <p className="text-sm" style={{ color: '#9CA3AF' }}>{project.location}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="w-20 h-1.5 rounded-full" style={{ backgroundColor: '#161B22' }}>
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${project.progress}%`,
                              backgroundColor: config.color
                            }}
                          ></div>
                        </div>
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>{project.progress}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: config.bg,
                        color: config.color
                      }}
                    >
                      {config.label}
                    </span>
                    <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                      Due {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'TBD'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
