import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { ProjectGallery } from "@/components/ProjectGallery";

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-brand-teal/10 text-brand-teal";
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
      return "bg-brand-teal";
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
      return "bg-blue-100 text-blue-800";
    case "low":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Project Edit Form Component
function ProjectEditForm({ project, onClose }: { project: Project; onClose: () => void }) {
  const queryClient = useQueryClient();
  
  const form = useForm({
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
      status: project?.status || "active",
      location: project?.location || "",
      progress: project?.progress || 0,
      dueDate: project?.dueDate ? new Date(project.dueDate) : undefined,
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (values: any) => {
      const response = await apiRequest(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: values,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      onClose();
    },
  });

  const onSubmit = (values: any) => {
    updateProjectMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="progress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Progress (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100" 
                    {...field} 
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateProjectMutation.isPending}>
            {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Project Create Form Component
function ProjectCreateForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  
  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
      location: "",
      progress: 0,
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (values: any) => {
      console.log("Creating project with data:", values);
      // Format the data for API
      const formattedData = {
        ...values,
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
      };
      console.log("Formatted data:", formattedData);
      const response = await apiRequest("/api/projects", {
        method: "POST",
        body: formattedData,
      });
      console.log("Response received:", response.status);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Project created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      onClose();
      form.reset();
    },
    onError: (error) => {
      console.error("Error creating project:", error);
      alert(`Failed to create project: ${error.message}`);
    },
  });

  const onSubmit = (values: any) => {
    createProjectMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter project name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter project description" {...field} value={field.value || ""} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="Enter project location" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="progress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Progress (%)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0" 
                  max="100" 
                  placeholder="0" 
                  {...field} 
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createProjectMutation.isPending} className="construction-primary">
            {createProjectMutation.isPending ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function Projects() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [addingTaskProject, setAddingTaskProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Get current user for company context
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    retry: false
  });

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
    setIsAddTaskOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      await apiRequest(`/api/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error: any) {
      console.error("Error deleting project:", error);
      const errorMessage = error?.message || "Failed to delete project. It may have associated data that needs to be removed first.";
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleEditTask = (task: Task) => {
    console.log("Opening task edit dialog for task:", task.id, task.title);
    setEditingTask(task);
  };

  const handleDeleteTask = async (task: Task) => {
    if (confirm(`Delete task "${task.title}"?`)) {
      try {
        await apiRequest(`/api/tasks/${task.id}`, {
          method: "DELETE",
        });
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
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Projects</h1>
          {currentUser?.company_name && (
            <p className="text-sm text-gray-600 mt-1">
              {currentUser.company_name}
            </p>
          )}
        </div>
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
          <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
            <DialogTrigger asChild>
              <Button className="construction-primary">
                <Plus size={16} className="mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <ProjectCreateForm onClose={() => setIsCreateProjectOpen(false)} />
            </DialogContent>
          </Dialog>
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
                  <ChevronRight size={20} className="text-brand-teal" /> : 
                  <ChevronDown size={20} className="text-brand-teal" />
                }
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-brand-teal rounded-full"></div>
                  <h2 className="text-lg font-semibold text-brand-teal">Active Projects</h2>
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
                              
                              {/* Gallery Button */}
                              <div className="mt-3 pt-3 border-t">
                                <ProjectGallery 
                                  projectId={project.id} 
                                  projectName={project.name}
                                />
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
                                    <div key={task.id} className="bg-gray-50 rounded p-2 text-xs group hover:bg-gray-100 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}>
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
                                          <div className="text-xs">
                                            {task.assigneeId ? "Assigned" : "Unassigned"}
                                          </div>
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
                              
                              {/* Gallery Button */}
                              <div className="mt-3 pt-3 border-t">
                                <ProjectGallery 
                                  projectId={project.id} 
                                  projectName={project.name}
                                />
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
                          <DropdownMenuItem onClick={(e) => e.preventDefault()}>
                            <ProjectGallery 
                              projectId={project.id} 
                              projectName={project.name}
                            />
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
                            <div key={task.id} className="bg-gray-50 rounded p-3 space-y-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}>
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
                                <div className="text-sm font-medium">
                                  {task.assigneeId ? "Assigned" : "Unassigned"}
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

      {/* Project Edit Dialog */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          {editingProject && <ProjectEditForm project={editingProject} onClose={() => setEditingProject(null)} />}
        </DialogContent>
      </Dialog>

      {/* Task Edit Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => {
        console.log("Task dialog onOpenChange:", open, "current editingTask:", editingTask?.id);
        if (!open) {
          setEditingTask(null);
        }
      }}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && <TaskEditForm task={editingTask} onClose={() => {
            console.log("TaskEditForm onClose called for task:", editingTask.id);
            setEditingTask(null);
          }} />}
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={isAddTaskOpen} onOpenChange={() => {
        setIsAddTaskOpen(false);
        setAddingTaskProject(null);
      }}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Add Task to {addingTaskProject?.name}</DialogTitle>
          </DialogHeader>
          {addingTaskProject && <TaskCreateForm project={addingTaskProject} onClose={() => {
            setIsAddTaskOpen(false);
            setAddingTaskProject(null);
          }} />}
        </DialogContent>
      </Dialog>

      {/* Enhanced Project Deletion Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div className="text-sm">
                Are you sure you want to delete the project <strong>"{projectToDelete?.name}"</strong>?
              </div>
              
              {projectToDelete && getProjectTasks(projectToDelete.id).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
                  <div className="font-medium text-red-800">⚠️ This will also delete:</div>
                  <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                    <li>{getProjectTasks(projectToDelete.id).length} associated tasks</li>
                    <li>All project photos and documentation</li>
                    <li>Project logs and progress history</li>
                    <li>Any schedule changes related to this project</li>
                  </ul>
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                This action cannot be undone. All data associated with this project will be permanently removed.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setProjectToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Task Edit Form Component
function TaskEditForm({ task, onClose }: { task: Task; onClose: () => void }) {
  const queryClient = useQueryClient();
  
  const form = useForm({
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      status: task?.status || "pending",
      priority: task?.priority || "medium",
      category: task?.category || "project",
      projectId: task?.projectId || "none",
      dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (values: any) => {
      console.log("Updating task:", task.id, values);
      const response = await apiRequest(`/api/tasks/${task.id}`, { method: 'PATCH', body: values });
      console.log("Task update response:", response);
      return response;
    },
    onSuccess: (data) => {
      console.log("Task update success:", data);
      
      // Close dialog immediately
      onClose();
      
      // Optimistic update - directly update cache instead of refetching
      queryClient.setQueryData(["/api/tasks"], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.map(t => t.id === task.id ? { ...t, ...data } : t);
      });
      
      console.log("Dialog closed, task updated in cache");
    },
    onError: (error: any) => {
      console.error("Task update error:", error);
      // Don't close the dialog on error so user can retry
    },
  });

  const onSubmit = (values: any) => {
    console.log("Form submit with values:", values);
    
    // Convert "none" back to null for projectId and format dates
    const submitValues = {
      ...values,
      projectId: values.projectId === "none" ? null : values.projectId,
      dueDate: values.dueDate ? values.dueDate.toISOString() : null,
    };
    
    console.log("Submitting processed values:", submitValues);
    updateTaskMutation.mutate(submitValues);
  };

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} rows={3} placeholder="Add a description..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="project">Project Related</SelectItem>
                    <SelectItem value="administrative">Administrative</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={updateTaskMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateTaskMutation.isPending} className="construction-primary">
            {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Task Create Form Component
function TaskCreateForm({ project, onClose }: { project: Project; onClose: () => void }) {
  const queryClient = useQueryClient();
  
  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: project.id,
      category: "project",
      status: "pending",
      priority: "medium",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (values: any) => {
      // Format the data for API
      const formattedData = {
        ...values,
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
      };
      const response = await apiRequest("/api/tasks", {
        method: "POST",
        body: formattedData,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      onClose();
      form.reset();
    },
  });

  const onSubmit = (values: any) => {
    createTaskMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Title *</FormLabel>
              <FormControl>
                <Input placeholder="Enter task title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter task description" {...field} value={field.value || ""} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createTaskMutation.isPending} className="construction-primary">
            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
          </Button>
        </div>
      </form>
    </Form>
  );
}