import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, CalendarIcon, MapPin, Users, MoreHorizontal, Edit, Trash2, ChevronDown, ChevronRight, Clock, CheckCircle, Grid3X3, List } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema, insertTaskSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Project, InsertProject, InsertTask, Task } from "@shared/schema";
import { TaskAssignmentDropdown } from "@/components/TaskAssignmentDropdown";

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-orange-100 text-orange-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "delayed":
      return "bg-red-100 text-red-800";
    case "on-hold":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getProgressColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-orange-500";
    case "completed":
      return "bg-green-500";
    case "delayed":
      return "bg-red-500";
    case "on-hold":
      return "bg-gray-500";
    default:
      return "bg-blue-500";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
    case "critical":
      return "bg-red-100 text-red-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function Projects() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [addingTaskProject, setAddingTaskProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const getProjectTasks = (projectId: string) => {
    return tasks.filter(task => task.projectId === projectId);
  };

  const activeProjects = projects.filter(p => p.status !== "completed");
  const completedProjects = projects.filter(p => p.status === "completed");

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
  };

  const handleAddTask = (project: Project) => {
    setAddingTaskProject(project);
  };

  const handleDeleteProject = async (project: Project) => {
    if (confirm(`Delete project "${project.name}"?`)) {
      try {
        await apiRequest(`/api/projects/${project.id}`, { method: "DELETE" });
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    }
  };

  const handleEditTask = (task: Task) => {
    // Navigate to schedule page for task editing
    window.location.href = '/schedule';
  };

  const handleDeleteTask = async (task: Task) => {
    if (confirm(`Delete task "${task.title}"?`)) {
      try {
        await apiRequest(`/api/tasks/${task.id}`, { method: "DELETE" });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  };

  if (projectsLoading || tasksLoading) {
    return <div className="p-6">Loading projects...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold construction-primary">Projects</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
              className="rounded-r-none"
            >
              <Grid3X3 size={16} className="mr-2" />
              Cards
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List size={16} className="mr-2" />
              List
            </Button>
          </div>
          <Button>
            <Plus size={16} className="mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {viewMode === "cards" ? (
        // Cards View
        <div className="space-y-6">
          {/* Active Projects */}
          {activeProjects.length > 0 && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => toggleSection('active')}
                className="flex items-center space-x-2 w-full justify-start p-2 h-auto hover:bg-gray-50"
              >
                {collapsedSections['active'] ? 
                  <ChevronRight size={20} className="text-orange-600" /> : 
                  <ChevronDown size={20} className="text-orange-600" />
                }
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <h2 className="text-lg font-semibold text-orange-600">Active Projects</h2>
                </div>
                <Badge variant="outline" className="ml-2 text-xs">
                  {activeProjects.length} projects
                </Badge>
              </Button>
              
              {!collapsedSections['active'] && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeProjects.map((project) => {
                    const projectTasks = getProjectTasks(project.id);
                    
                    return (
                      <Card 
                        key={project.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleEditProject(project)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-medium text-lg construction-secondary">{project.name}</h3>
                                <Badge className={getStatusColor(project.status)}>
                                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                </Badge>
                                <div className="flex items-center text-sm text-gray-500">
                                  <MapPin size={14} className="mr-1" />
                                  {project.location}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Progress:</span>
                                  <span className="font-medium">{project.progress}%</span>
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${getProgressColor(project.status)}`}
                                      style={{ width: `${project.progress}%` }}
                                    ></div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Users size={14} />
                                  <span>{projectTasks.length} tasks</span>
                                </div>
                                {project.dueDate && (
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <CalendarIcon size={14} />
                                    <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0" 
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditProject(project)}>
                                  <Edit size={14} className="mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAddTask(project)}>
                                  <Plus size={14} className="mr-2" />
                                  Add Task
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteProject(project)}
                                  className="text-red-600"
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          {/* Tasks Section */}
                          <div className="border-t pt-3 mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleProjectExpansion(project.id);
                              }}
                              className="w-full justify-between p-2 h-auto"
                            >
                              <div className="flex items-center text-sm">
                                <span className="font-medium">Tasks ({projectTasks.length})</span>
                              </div>
                              {expandedProject === project.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </Button>
                            
                            {expandedProject === project.id && (
                              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                                {projectTasks.length === 0 ? (
                                  <p className="text-xs text-gray-500 text-center py-2">No tasks yet</p>
                                ) : (
                                  projectTasks.map((task) => (
                                    <div key={task.id} className="bg-gray-50 rounded p-2 text-xs group hover:bg-gray-100 transition-colors" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium truncate flex-1">{task.title}</span>
                                        <div className="flex items-center gap-1">
                                          <Badge className={getStatusColor(task.status)} variant="outline">
                                            {task.status === "in-progress" ? "In Progress" : task.status}
                                          </Badge>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                                                <MoreHorizontal size={12} />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                                <Edit size={12} className="mr-2" />
                                                Edit
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handleDeleteTask(task)} className="text-red-600">
                                                <Trash2 size={12} className="mr-2" />
                                                Delete
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between text-gray-500">
                                          <Badge className={getPriorityColor(task.priority)} variant="outline">
                                            {task.priority}
                                          </Badge>
                                          {task.dueDate && (
                                            <div className="flex items-center">
                                              <Clock size={10} className="mr-1" />
                                              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-600 mb-1">Assigned to:</div>
                                          <TaskAssignmentDropdown task={task} />
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Completed Projects Section */}
          {completedProjects.length > 0 && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => toggleSection('completed')}
                className="flex items-center space-x-2 w-full justify-start p-2 h-auto hover:bg-gray-50"
              >
                {collapsedSections['completed'] ? 
                  <ChevronRight size={20} className="text-green-600" /> : 
                  <ChevronDown size={20} className="text-green-600" />
                }
                <CheckCircle size={16} className="text-green-600" />
                <h2 className="text-lg font-semibold text-green-600">Completed Projects</h2>
                <Badge variant="outline" className="ml-2 text-xs">
                  {completedProjects.length} projects
                </Badge>
              </Button>
              
              {!collapsedSections['completed'] && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {completedProjects.map((project) => {
                    const projectTasks = getProjectTasks(project.id);
                    
                    return (
                      <Card key={project.id} className="hover:shadow-md transition-shadow border-green-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-medium text-lg text-green-700">{project.name}</h3>
                                <Badge className={getStatusColor(project.status)}>
                                  Completed
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Progress:</span>
                                  <span className="font-medium text-green-600">{project.progress}%</span>
                                </div>
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Users size={14} />
                                  <span>{projectTasks.length} tasks</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // List View
        <div className="space-y-4">
          {projects.map((project) => {
            const projectTasks = getProjectTasks(project.id);
            
            return (
              <Card key={project.id} className="hover:shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <h3 className="font-medium text-lg">{project.name}</h3>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </Badge>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin size={14} className="mr-1" />
                          {project.location}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Users size={14} className="mr-1" />
                          {projectTasks.length} tasks
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{project.progress}% complete</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditProject(project)}>
                            <Edit size={14} className="mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddTask(project)}>
                            <Plus size={14} className="mr-2" />
                            Add Task
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProject(project)}
                            className="text-red-600"
                          >
                            <Trash2 size={14} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Tasks Section */}
                  <div className="border-t pt-3 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProjectExpansion(project.id);
                      }}
                      className="w-full justify-between p-2 h-auto"
                    >
                      <div className="flex items-center text-sm">
                        <span className="font-medium">Tasks ({projectTasks.length})</span>
                      </div>
                      {expandedProject === project.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>
                    
                    {expandedProject === project.id && (
                      <div className="mt-2 space-y-2">
                        {projectTasks.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No tasks yet</p>
                        ) : (
                          projectTasks.map((task) => (
                            <div key={task.id} className="bg-gray-50 rounded p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{task.title}</span>
                                <div className="flex items-center gap-2">
                                  <Badge className={getStatusColor(task.status)} variant="outline">
                                    {task.status === "in-progress" ? "In Progress" : task.status}
                                  </Badge>
                                  <Badge className={getPriorityColor(task.priority)} variant="outline">
                                    {task.priority}
                                  </Badge>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => e.stopPropagation()}>
                                        <MoreHorizontal size={14} />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                        <Edit size={14} className="mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDeleteTask(task)} className="text-red-600">
                                        <Trash2 size={14} className="mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}