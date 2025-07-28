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



export default function Projects() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskEditDialogOpen, setIsTaskEditDialogOpen] = useState(false);
  const [expandedProjectEdit, setExpandedProjectEdit] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: InsertProject) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertProject> }) => 
      apiRequest("PATCH", `/api/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setExpandedProjectEdit(null);
      setEditingProject(null);
      editForm.reset();
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: InsertTask) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsTaskDialogOpen(false);
      setSelectedProject(null);
      taskForm.reset();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertTask> }) => 
      apiRequest("PATCH", `/api/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsTaskEditDialogOpen(false);
      setEditingTask(null);
      taskEditForm.reset();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      status: "active",
      progress: 0,
      dueDate: undefined,
    },
  });

  const editForm = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      status: "active",
      progress: 0,
      dueDate: undefined,
    },
  });

  const taskForm = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: null,
      category: "project",
      status: "pending",
      priority: "medium",
      dueDate: undefined,
    },
  });

  const taskEditForm = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: null,
      category: "project",
      status: "pending",
      priority: "medium",
      dueDate: undefined,
    },
  });

  const onSubmit = (data: InsertProject) => {
    createProjectMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertProject) => {
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data });
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setExpandedProjectEdit(project.id);
    editForm.reset({
      name: project.name,
      description: project.description || "",
      location: project.location,
      status: project.status,
      progress: project.progress,
      dueDate: project.dueDate ? new Date(project.dueDate) : undefined,
    });
  };

  const handleDeleteProject = (project: Project) => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
      deleteProjectMutation.mutate(project.id);
    }
  };

  const handleAddTask = (project: Project) => {
    setSelectedProject(project);
    taskForm.reset({
      title: "",
      description: "",
      projectId: project.id,
      category: "project",
      status: "pending",
      priority: "medium",
      dueDate: undefined,
    });
    setIsTaskDialogOpen(true);
  };

  const onTaskSubmit = (data: InsertTask) => {
    console.log("Form data before mutation:", data);
    
    // Ensure projectId is properly set for project tasks and prepare data for API
    const taskData = {
      ...data,
      projectId: selectedProject?.id || data.projectId,
      description: data.description?.trim() || null,
      // Send dueDate as ISO string - server will handle conversion
      dueDate: data.dueDate ? (data.dueDate instanceof Date ? data.dueDate.toISOString() : data.dueDate) : null,
    };
    
    console.log("Task data being sent to API:", taskData);
    createTaskMutation.mutate(taskData);
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  const getProjectTasks = (projectId: string) => {
    return allTasks.filter(task => task.projectId === projectId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "blocked": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-gray-100 text-gray-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "critical": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    taskEditForm.reset({
      title: task.title,
      description: task.description || "",
      projectId: task.projectId,
      category: task.category || "project",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    });
    setIsTaskEditDialogOpen(true);
  };

  const handleDeleteTask = (task: Task) => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const onTaskEditSubmit = (data: InsertTask) => {
    if (editingTask) {
      const taskData = {
        ...data,
        description: data.description?.trim() || null,
        dueDate: data.dueDate ? (data.dueDate instanceof Date ? data.dueDate.toISOString() : data.dueDate) : null,
      };
      updateTaskMutation.mutate({ id: editingTask.id, data: taskData });
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group projects by status
  const activeProjects = filteredProjects.filter(project => project.status === "active");
  const completedProjects = filteredProjects.filter(project => project.status === "completed");
  const delayedProjects = filteredProjects.filter(project => project.status === "delayed");
  const onHoldProjects = filteredProjects.filter(project => project.status === "on-hold");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Projects</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold construction-secondary">Projects</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="construction-primary text-white">
              <Plus size={16} className="mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
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
                        <Textarea placeholder="Enter project description" {...field} value={field.value || ""} />
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
                
                <div className="grid grid-cols-2 gap-4">
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
                              date < new Date()
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProjectMutation.isPending}
                    className="construction-primary text-white"
                  >
                    {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>



        {/* Expandable Project Edit Modal */}
        {expandedProjectEdit && editingProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Edit Project: {editingProject.name}</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setExpandedProjectEdit(null);
                    setEditingProject(null);
                  }}
                >
                  ✕
                </Button>
              </div>
              
              <div className="p-6">
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter project name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editForm.control}
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
                    </div>

                    <FormField
                      control={editForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter project description" 
                              rows={4}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={editForm.control}
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
                        control={editForm.control}
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
                        control={editForm.control}
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
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date < new Date()
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Project Tasks Section */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium mb-4">Project Tasks</h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {getProjectTasks(editingProject.id).length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No tasks assigned to this project</p>
                        ) : (
                          getProjectTasks(editingProject.id).map((task) => (
                            <div key={task.id} className="bg-gray-50 rounded p-3 flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{task.title}</span>
                                  <Badge className={getStatusColor(task.status)} variant="outline">
                                    {task.status === "in-progress" ? "In Progress" : task.status}
                                  </Badge>
                                  <Badge className={getPriorityColor(task.priority)} variant="outline">
                                    {task.priority}
                                  </Badge>
                                </div>
                                {task.dueDate && (
                                  <div className="text-sm text-gray-500">
                                    Due: {new Date(task.dueDate).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal size={16} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                    <Edit size={14} className="mr-2" />
                                    Edit Task
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteTask(task)} className="text-red-600">
                                    <Trash2 size={14} className="mr-2" />
                                    Delete Task
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ))
                        )}
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => handleAddTask(editingProject)}
                        className="mt-3 w-full"
                      >
                        <Plus size={16} className="mr-2" />
                        Add New Task
                      </Button>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setExpandedProjectEdit(null);
                          setEditingProject(null);
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={updateProjectMutation.isPending} 
                        className="flex-1"
                      >
                        {updateProjectMutation.isPending ? "Updating..." : "Update Project"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        )}

        {/* Add Task Dialog */}
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add Task to {selectedProject?.name}</DialogTitle>
            </DialogHeader>
            <Form {...taskForm}>
              <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-4">
                <FormField
                  control={taskForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter task title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={taskForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter task description" 
                          {...field} 
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={taskForm.control}
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
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={taskForm.control}
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
                  control={taskForm.control}
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
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsTaskDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTaskMutation.isPending}
                    className="construction-primary text-white"
                  >
                    {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="flex items-center gap-2"
          >
            <Grid3X3 size={16} />
            Cards
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="flex items-center gap-2"
          >
            <List size={16} />
            List
          </Button>
        </div>
      </div>

      {/* Cards View */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const projectTasks = getProjectTasks(project.id);
            const isExpanded = expandedProject === project.id;
            
            return (
              <Card 
                key={project.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleEditProject(project)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg construction-secondary">{project.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditProject(project)}>
                            <Edit size={16} className="mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddTask(project)}>
                            <Plus size={16} className="mr-2" />
                            Add Task
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProject(project)}
                            className="text-red-600"
                          >
                            <Trash2 size={16} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin size={14} className="mr-1" />
                    {project.location}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getProgressColor(project.status)}`}
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {project.dueDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Due Date:</span>
                        <span className="font-medium">{new Date(project.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    {/* Tasks Section */}
                    <div className="border-t pt-3">
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
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </Button>
                      
                      {isExpanded && (
                        <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                          {projectTasks.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-2">No tasks yet</p>
                          ) : (
                            projectTasks.map((task) => (
                              <div key={task.id} className="bg-gray-50 rounded p-2 text-xs group hover:bg-gray-100 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium truncate flex-1">{task.title}</span>
                                  <div className="flex items-center gap-1">
                                    <Badge className={getStatusColor(task.status)} variant="outline">
                                      {task.status === "in-progress" ? "In Progress" : task.status}
                                    </Badge>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100">
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
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* List View - Collapsible Sections by Status */}
      {viewMode === "list" && (
        <div className="space-y-6">
          {/* Active Projects Section */}
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
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <h2 className="text-lg font-semibold text-orange-600">Active Projects</h2>
                <Badge variant="outline" className="ml-2 text-xs">
                  {activeProjects.length} projects
                </Badge>
              </Button>
              
              {!collapsedSections['active'] && (
                <div className="space-y-3 ml-8">
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
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                              onClick={() => toggleProjectExpansion(project.id)}
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
                                    <div key={task.id} className="bg-gray-50 rounded p-2 text-xs group hover:bg-gray-100 transition-colors">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium truncate flex-1">{task.title}</span>
                                        <div className="flex items-center gap-1">
                                          <Badge className={getStatusColor(task.status)} variant="outline">
                                            {task.status === "in-progress" ? "In Progress" : task.status}
                                          </Badge>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100">
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
                <div className="space-y-3 ml-8">
                  {completedProjects.map((project) => {
                    const projectTasks = getProjectTasks(project.id);
                    
                    return (
                      <Card key={project.id} className="hover:shadow-md transition-shadow border-green-200">
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
                                  <span className="font-medium text-green-600">{project.progress}%</span>
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div className="h-2 rounded-full bg-green-500" style={{ width: `${project.progress}%` }}></div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Users size={14} />
                                  <span>{projectTasks.length} tasks</span>
                                </div>
                                {project.dueDate && (
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <CalendarIcon size={14} />
                                    <span>Completed: {new Date(project.dueDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                              onClick={() => toggleProjectExpansion(project.id)}
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
                                    <div key={task.id} className="bg-gray-50 rounded p-2 text-xs group hover:bg-gray-100 transition-colors">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium truncate flex-1">{task.title}</span>
                                        <div className="flex items-center gap-1">
                                          <Badge className={getStatusColor(task.status)} variant="outline">
                                            {task.status === "in-progress" ? "In Progress" : task.status}
                                          </Badge>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100">
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

          {/* Delayed Projects Section */}
          {delayedProjects.length > 0 && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => toggleSection('delayed')}
                className="flex items-center space-x-2 w-full justify-start p-2 h-auto hover:bg-gray-50"
              >
                {collapsedSections['delayed'] ? 
                  <ChevronRight size={20} className="text-red-600" /> : 
                  <ChevronDown size={20} className="text-red-600" />
                }
                <Clock size={16} className="text-red-600" />
                <h2 className="text-lg font-semibold text-red-600">Delayed Projects</h2>
                <Badge variant="outline" className="ml-2 text-xs">
                  {delayedProjects.length} projects
                </Badge>
              </Button>
              
              {!collapsedSections['delayed'] && (
                <div className="space-y-3 ml-8">
                  {delayedProjects.map((project) => {
                    const projectTasks = getProjectTasks(project.id);
                    
                    return (
                      <Card key={project.id} className="hover:shadow-md transition-shadow border-red-200">
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
                                  <span className="font-medium text-red-600">{project.progress}%</span>
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div className="h-2 rounded-full bg-red-500" style={{ width: `${project.progress}%` }}></div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Users size={14} />
                                  <span>{projectTasks.length} tasks</span>
                                </div>
                                {project.dueDate && (
                                  <div className="flex items-center gap-1 text-red-500">
                                    <CalendarIcon size={14} />
                                    <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                              onClick={() => toggleProjectExpansion(project.id)}
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
                                    <div key={task.id} className="bg-gray-50 rounded p-2 text-xs group hover:bg-gray-100 transition-colors">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium truncate flex-1">{task.title}</span>
                                        <div className="flex items-center gap-1">
                                          <Badge className={getStatusColor(task.status)} variant="outline">
                                            {task.status === "in-progress" ? "In Progress" : task.status}
                                          </Badge>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100">
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

          {/* On Hold Projects Section */}
          {onHoldProjects.length > 0 && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => toggleSection('on-hold')}
                className="flex items-center space-x-2 w-full justify-start p-2 h-auto hover:bg-gray-50"
              >
                {collapsedSections['on-hold'] ? 
                  <ChevronRight size={20} className="text-gray-600" /> : 
                  <ChevronDown size={20} className="text-gray-600" />
                }
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <h2 className="text-lg font-semibold text-gray-600">On Hold Projects</h2>
                <Badge variant="outline" className="ml-2 text-xs">
                  {onHoldProjects.length} projects
                </Badge>
              </Button>
              
              {!collapsedSections['on-hold'] && (
                <div className="space-y-3 ml-8">
                  {onHoldProjects.map((project) => {
                    const projectTasks = getProjectTasks(project.id);
                    
                    return (
                      <Card key={project.id} className="hover:shadow-md transition-shadow border-gray-200">
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
                                    <div className="h-2 rounded-full bg-gray-500" style={{ width: `${project.progress}%` }}></div>
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
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                              onClick={() => toggleProjectExpansion(project.id)}
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
                                    <div key={task.id} className="bg-gray-50 rounded p-2 text-xs group hover:bg-gray-100 transition-colors">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium truncate flex-1">{task.title}</span>
                                        <div className="flex items-center gap-1">
                                          <Badge className={getStatusColor(task.status)} variant="outline">
                                            {task.status === "in-progress" ? "In Progress" : task.status}
                                          </Badge>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100">
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
        </div>
      )}

      {filteredProjects.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No projects found</p>
          <p className="text-gray-400">Create your first project to get started</p>
        </div>
      )}

      {/* Task Edit Dialog */}
      <Dialog open={isTaskEditDialogOpen} onOpenChange={setIsTaskEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <Form {...taskEditForm}>
            <form onSubmit={taskEditForm.handleSubmit(onTaskEditSubmit)} className="space-y-4">
              <FormField
                control={taskEditForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={taskEditForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter task description" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskEditForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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

                <FormField
                  control={taskEditForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
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

              <FormField
                control={taskEditForm.control}
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
                          selected={field.value}
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

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTaskEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateTaskMutation.isPending}
                  className="construction-primary text-white"
                >
                  {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
