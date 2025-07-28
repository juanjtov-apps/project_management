import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, MapPin, Users } from "lucide-react";
import type { Project, Task } from "@shared/schema";
import { TaskAssignmentDropdown } from "@/components/TaskAssignmentDropdown";

export default function Projects() {
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const getProjectTasks = (projectId: string) => {
    return tasks.filter(task => task.projectId === projectId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-orange-100 text-orange-800";
      case "completed": return "bg-green-100 text-green-800";
      case "delayed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (projectsLoading || tasksLoading) {
    return <div className="p-6">Loading projects...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button>
          <Plus size={16} className="mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid gap-6">
        {projects.map((project) => {
          const projectTasks = getProjectTasks(project.id);
          
          return (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        {project.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        {projectTasks.length} tasks
                      </div>
                      {project.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          Due: {new Date(project.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-gray-600 mb-4">{project.description}</p>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                {projectTasks.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Project Tasks</h4>
                    <div className="space-y-3">
                      {projectTasks.map((task) => (
                        <div key={task.id} className="bg-gray-50 rounded p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{task.title}</span>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(task.status)} variant="outline">
                                {task.status === "in-progress" ? "In Progress" : task.status}
                              </Badge>
                              <Badge className={getPriorityColor(task.priority)} variant="outline">
                                {task.priority}
                              </Badge>
                            </div>
                          </div>
                          
                          {task.dueDate && (
                            <div className="text-sm text-gray-600">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                          )}
                          
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Assigned to:</div>
                            <TaskAssignmentDropdown task={task} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}