import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CalendarIcon, Clock, User, MoreHorizontal, Edit, Trash2, Building, Settings, CheckCircle, Grid3X3, List, FolderOpen } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Task, InsertTask, Project } from "@shared/schema";

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "low":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "in-progress":
      return "bg-blue-100 text-blue-800";
    case "blocked":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "project":
      return Building;
    case "administrative":
      return Settings;
    case "general":
      return CheckCircle;
    default:
      return CheckCircle;
  }
};

interface TaskCardProps {
  task: Task;
  project?: Project;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: string) => void;
}

function TaskCard({ task, project, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-2">
            <div className="flex items-center">
              {(() => {
                const IconComponent = getCategoryIcon(task.category || "general");
                const iconClass = task.category === "project" ? "text-blue-600" : 
                                 task.category === "administrative" ? "text-purple-600" : "text-green-600";
                return <IconComponent size={16} className={iconClass} />;
              })()}
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-medium construction-secondary">
                {task.title}
              </CardTitle>
              {project && (
                <p className="text-xs text-gray-500 mt-1">{project.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getPriorityColor(task.priority)} variant="outline">
              {task.priority}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit size={14} className="mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(task)} className="text-red-600">
                  <Trash2 size={14} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {task.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge className={getStatusColor(task.status)} variant="secondary">
              {task.status.replace("-", " ")}
            </Badge>
            <Select value={task.status} onValueChange={(value) => onStatusChange(task, value)}>
              <SelectTrigger className="h-6 w-auto text-xs border-0 bg-transparent p-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {task.dueDate && (
            <div className="flex items-center text-xs text-gray-500">
              <Clock size={12} className="mr-1" />
              Due: {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}
          
          {task.assigneeId && (
            <div className="flex items-center text-xs text-gray-500">
              <User size={12} className="mr-1" />
              Assigned
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TaskListItemProps {
  task: Task;
  projectName?: string;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: string) => void;
}

function TaskListItem({ task, projectName, onEdit, onDelete, onStatusChange }: TaskListItemProps) {
  const CategoryIcon = getCategoryIcon(task.category || "general");
  const iconClass = task.category === "project" ? "text-blue-600" : 
                   task.category === "administrative" ? "text-purple-600" : "text-green-600";
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <CategoryIcon size={16} className={`${iconClass} flex-shrink-0`} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-sm truncate">{task.title}</h3>
                <Badge className={`${getPriorityColor(task.priority)} text-xs px-2 py-0`}>
                  {task.priority}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                {projectName && (
                  <div className="flex items-center">
                    <FolderOpen size={12} className="mr-1" />
                    <span className="truncate max-w-32">{projectName}</span>
                  </div>
                )}
                
                {task.dueDate && (
                  <div className="flex items-center">
                    <Clock size={12} className="mr-1" />
                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
                
                {task.assigneeId && (
                  <div className="flex items-center">
                    <User size={12} className="mr-1" />
                    <span>Assigned</span>
                  </div>
                )}
              </div>
              
              {task.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-1">{task.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Select value={task.status} onValueChange={(value) => onStatusChange(task, value)}>
              <SelectTrigger className="h-7 w-auto text-xs border px-2 py-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit size={12} className="mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(task)}
                  className="text-red-600"
                >
                  <Trash2 size={12} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Tasks() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"canvas" | "list">("canvas");
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: InsertTask) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertTask> }) => 
      apiRequest("PATCH", `/api/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsEditDialogOpen(false);
      setEditingTask(null);
      editForm.reset();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: null,
      category: "general",
      status: "pending",
      priority: "medium",
      dueDate: undefined,
    },
  });

  const editForm = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: null,
      category: "general",
      status: "pending",
      priority: "medium",
      dueDate: undefined,
    },
  });

  const onSubmit = (data: InsertTask) => {
    console.log("Tasks page form data:", data);
    
    // Prepare data for API - send dates as ISO strings
    const taskData = {
      ...data,
      description: data.description?.trim() || null,
      dueDate: data.dueDate ? data.dueDate.toISOString() : null,
    };
    
    console.log("Tasks page data being sent to API:", taskData);
    createTaskMutation.mutate(taskData);
  };

  const onEditSubmit = (data: InsertTask) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data });
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    editForm.reset({
      title: task.title,
      description: task.description || "",
      projectId: task.projectId,
      category: task.category || "general",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteTask = (task: Task) => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const handleStatusChange = (task: Task, newStatus: string) => {
    updateTaskMutation.mutate({ 
      id: task.id, 
      data: { 
        status: newStatus
      }
    });
  };

  // Filter and organize tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group tasks by projects and categories
  const projectTasks = filteredTasks.filter(task => task.projectId);
  const generalTasks = filteredTasks.filter(task => !task.projectId && task.category === "general");
  const adminTasks = filteredTasks.filter(task => !task.projectId && task.category === "administrative");

  // Group project tasks by project
  const tasksByProject = projects.reduce((acc, project) => {
    const projectTasksList = projectTasks.filter(task => task.projectId === project.id);
    if (projectTasksList.length > 0) {
      acc[project.id] = {
        project,
        tasks: projectTasksList
      };
    }
    return acc;
  }, {} as Record<string, { project: Project; tasks: Task[] }>);

  if (tasksLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Task Management Canvas</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
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
        <h1 className="text-2xl font-bold construction-secondary">Task Management Canvas</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="construction-primary text-white">
              <Plus size={16} className="mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <TaskForm 
              form={form} 
              onSubmit={onSubmit} 
              projects={projects}
              isLoading={createTaskMutation.isPending}
              submitText="Create Task"
            />
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <TaskForm 
              form={editForm} 
              onSubmit={onEditSubmit} 
              projects={projects}
              isLoading={updateTaskMutation.isPending}
              submitText="Save Changes"
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex items-center border rounded-lg">
          <Button
            variant={viewMode === "canvas" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("canvas")}
            className="border-0 rounded-r-none"
          >
            <Grid3X3 size={16} className="mr-1" />
            Canvas
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="border-0 rounded-l-none"
          >
            <List size={16} className="mr-1" />
            List
          </Button>
        </div>
      </div>

      {viewMode === "list" ? (
        // List View
        <div className="space-y-6">
          {/* Project Tasks Section */}
          {Object.values(tasksByProject).length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <FolderOpen size={20} className="text-blue-600" />
                <h2 className="text-lg font-semibold text-blue-600">Project Tasks</h2>
              </div>
              
              {Object.values(tasksByProject).map(({ project, tasks }) => (
                <div key={project.id} className="space-y-2">
                  <h3 className="text-md font-medium text-gray-700 flex items-center">
                    <Building size={16} className="mr-2" />
                    {project.name}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                    </Badge>
                  </h3>
                  <div className="space-y-2 pl-6">
                    {tasks.map((task) => (
                      <TaskListItem
                        key={task.id}
                        task={task}
                        projectName={project.name}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Administrative Tasks Section */}
          {adminTasks.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Settings size={20} className="text-purple-600" />
                <h2 className="text-lg font-semibold text-purple-600">Administrative Tasks</h2>
                <Badge variant="outline" className="text-xs">
                  {adminTasks.length} task{adminTasks.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="space-y-2">
                {adminTasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* General Tasks Section */}
          {generalTasks.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} className="text-green-600" />
                <h2 className="text-lg font-semibold text-green-600">General Tasks</h2>
                <Badge variant="outline" className="text-xs">
                  {generalTasks.length} task{generalTasks.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="space-y-2">
                {generalTasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredTasks.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <List size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No tasks found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== "all" 
                    ? "Try adjusting your search or filter criteria" 
                    : "Create your first task to get started"}
                </p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="construction-primary text-white"
                >
                  <Plus size={16} className="mr-2" />
                  Create Task
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Canvas View (Tabs)
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">By Projects</TabsTrigger>
            <TabsTrigger value="administrative">Administrative</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Building className="mr-2 text-blue-600" />
                  Project Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold construction-secondary">{projectTasks.length}</div>
                <p className="text-sm text-gray-600">Tasks linked to projects</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Settings className="mr-2 text-purple-600" />
                  Administrative
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold construction-secondary">{adminTasks.length}</div>
                <p className="text-sm text-gray-600">Admin & management tasks</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="mr-2 text-green-600" />
                  General Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold construction-secondary">{generalTasks.length}</div>
                <p className="text-sm text-gray-600">General operational tasks</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Tasks */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Tasks</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.slice(0, 6).map((task) => {
                const project = projects.find(p => p.id === task.projectId);
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    project={project}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                );
              })}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="projects" className="space-y-6">
          {Object.values(tasksByProject).map(({ project, tasks }) => (
            <div key={project.id}>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Building className="mr-2 text-blue-600" />
                {project.name}
                <Badge variant="outline" className="ml-2">{tasks.length} tasks</Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    project={project}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          ))}
          {Object.keys(tasksByProject).length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No project tasks found</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="administrative">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Settings className="mr-2 text-purple-600" />
              Administrative Tasks
              <Badge variant="outline" className="ml-2">{adminTasks.length} tasks</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
            {adminTasks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No administrative tasks found</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="general">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <CheckCircle className="mr-2 text-green-600" />
              General Tasks
              <Badge variant="outline" className="ml-2">{generalTasks.length} tasks</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generalTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
            {generalTasks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No general tasks found</p>
              </div>
            )}
          </div>
        </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

interface TaskFormProps {
  form: any;
  onSubmit: (data: InsertTask) => void;
  projects: Project[];
  isLoading: boolean;
  submitText: string;
}

function TaskForm({ form, onSubmit, projects, isLoading, submitText }: TaskFormProps) {
  const watchedCategory = form.watch("category");
  const isProjectRequired = watchedCategory === "project";
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
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
          control={form.control}
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
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
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
                <FormLabel>
                  Project {isProjectRequired ? "(Required)" : "(Optional)"}
                  {isProjectRequired && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <Select onValueChange={(value) => field.onChange(value === "none" ? null : value)} defaultValue={field.value || "none"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {!isProjectRequired && <SelectItem value="none">No Project</SelectItem>}
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
                    <SelectItem value="critical">Critical</SelectItem>
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
          <Button type="submit" disabled={isLoading} className="construction-primary text-white">
            {isLoading ? "Saving..." : submitText}
          </Button>
        </div>
      </form>
    </Form>
  );
}