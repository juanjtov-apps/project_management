import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, User, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Task, Project } from "@shared/schema";

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical":
      return "bg-red-100 text-red-800";
    case "high":
      return "bg-brand-coral/10 text-brand-coral";
    case "medium":
      return "bg-blue-100 text-blue-800";
    case "low":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const columns = [
  { id: "pending", title: "Pending", color: "bg-gray-100" },
  { id: "in-progress", title: "In Progress", color: "bg-blue-100" },
  { id: "completed", title: "Completed", color: "bg-green-100" },
  { id: "blocked", title: "Blocked", color: "bg-red-100" },
];

interface TaskBoardProps {
  projectId?: string;
}

export default function TaskBoard({ projectId }: TaskBoardProps) {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: projectId ? ["/api/tasks", projectId] : ["/api/tasks"],
    queryFn: () => {
      const url = projectId ? `/api/tasks?projectId=${projectId}` : "/api/tasks";
      return fetch(url).then(res => res.json());
    },
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      apiRequest(`/api/tasks/${id}`, {
        method: "PATCH",
        body: updates,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  const handleStatusChange = (task: Task, newStatus: string) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: { status: newStatus }
    });
  };

  const handleTaskToggle = (task: Task, completed: boolean) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: {
        status: completed ? "completed" : "pending"
      }
    });
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => (
          <Card key={column.id} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id);
        
        return (
          <Card key={column.id} className="h-fit">
            <CardHeader className={`${column.color} rounded-t-lg`}>
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="construction-secondary">{column.title}</span>
                <Badge variant="outline" className="bg-white">
                  {columnTasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {columnTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No {column.title.toLowerCase()} tasks
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start space-x-2">
                            <Checkbox
                              checked={task.status === "completed"}
                              onCheckedChange={(checked) => handleTaskToggle(task, !!checked)}
                              className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                            <div className="flex-1">
                              <h4 className={`font-medium text-sm ${task.status === "completed" ? "line-through text-gray-500" : "construction-secondary"}`}>
                                {task.title}
                              </h4>
                              {!projectId && (
                                <p className="text-xs text-blue-600 mt-1">
                                  {task.projectId ? getProjectName(task.projectId) : 'No Project'}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {task.description && (
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </Badge>
                            
                            {task.dueDate && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock size={12} className="mr-1" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          
                          {task.assigneeId && (
                            <div className="flex items-center text-xs text-gray-500">
                              <User size={12} className="mr-1" />
                              Assigned
                            </div>
                          )}
                          
                          {task.status !== "completed" && task.status !== column.id && (
                            <div className="flex space-x-1">
                              {columns
                                .filter(col => col.id !== task.status && col.id !== "completed")
                                .slice(0, 2)
                                .map((col) => (
                                  <Button
                                    key={col.id}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-6 px-2"
                                    onClick={() => handleStatusChange(task, col.id)}
                                  >
                                    {col.title}
                                  </Button>
                                ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
