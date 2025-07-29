import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Calendar, Clock, CheckSquare, Users, Target, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTaskSchema } from "@shared/schema";
import type { Task, Project, User, SubcontractorAssignment } from "@shared/schema";

// Extend the task schema for subcontractor tasks
const subcontractorTaskSchema = z.object({
  projectId: z.string().min(1, "Project selection is required").refine(val => val !== "none", "Please select a project"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  category: z.string().default("subcontractor"),
  status: z.string().default("pending"),
  priority: z.string().default("medium"),
  dueDate: z.union([z.date(), z.string()]).optional().nullable(),
  isMilestone: z.boolean().default(false),
});

type SubcontractorTaskForm = z.infer<typeof subcontractorTaskSchema>;

export default function Subs() {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { toast } = useToast();

  // Fetch data
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: usersResponse = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users/"],
  });

  // Ensure users is always an array
  const users = Array.isArray(usersResponse) ? usersResponse : [];

  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery<SubcontractorAssignment[]>({
    queryKey: ["/api/subcontractor-assignments/"],
  });

  // Filter data for subcontractors
  const subcontractors = users.filter(user => user.role === "subcontractor");
  const subcontractorTasks = tasks.filter(task => 
    task.category === "subcontractor" || 
    subcontractors.some(sub => sub.id === task.assigneeId)
  );

  // Get current date for daily/weekly views
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  // Filter tasks for today and this week
  const todayTasks = subcontractorTasks.filter(task => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    return taskDate.toDateString() === today.toDateString();
  });

  const weekTasks = subcontractorTasks.filter(task => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    return taskDate >= startOfWeek && taskDate <= endOfWeek;
  });

  // Task creation mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: SubcontractorTaskForm) => {
      const formattedData = {
        ...data,
        category: "subcontractor",
        assigneeId: data.assigneeId === "unassigned" ? null : data.assigneeId || null, // Convert "unassigned" to null
        projectId: data.projectId, // Project is now mandatory
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      };
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsAddTaskOpen(false);
      // Reset form to default values to clear previous data
      form.reset({
        projectId: "",
        title: "",
        description: "",
        assigneeId: "unassigned",
        priority: "medium",
        category: "subcontractor",
        status: "pending",
        isMilestone: false,
      });
      toast({ title: "Task created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating task", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Form setup
  const form = useForm<SubcontractorTaskForm>({
    resolver: zodResolver(subcontractorTaskSchema),
    defaultValues: {
      projectId: "",
      title: "",
      description: "",
      assigneeId: "unassigned",
      priority: "medium",
      category: "subcontractor",
      status: "pending",
      isMilestone: false,
    },
  });

  const onSubmitTask = (data: SubcontractorTaskForm) => {
    createTaskMutation.mutate(data);
  };

  // Task update mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<SubcontractorTaskForm> }) => {
      const formattedData = {
        ...data.updates,
        assigneeId: data.updates.assigneeId === "unassigned" ? null : data.updates.assigneeId || null,
        dueDate: data.updates.dueDate ? new Date(data.updates.dueDate).toISOString() : null,
      };
      const response = await fetch(`/api/tasks/${data.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsEditTaskOpen(false);
      setEditingTask(null);
      toast({ title: "Task updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating task", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    editForm.reset({
      title: task.title,
      description: task.description || "",
      projectId: task.projectId || "",
      assigneeId: task.assigneeId || "unassigned",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "",
      isMilestone: task.isMilestone || false,
    });
    setIsEditTaskOpen(true);
  };

  // Edit form setup
  const editForm = useForm<SubcontractorTaskForm>({
    resolver: zodResolver(subcontractorTaskSchema),
    defaultValues: {
      projectId: "",
      title: "",
      description: "",
      assigneeId: "",
      priority: "medium",
      category: "subcontractor",
      status: "pending",
      isMilestone: false,
    },
  });

  const onSubmitEditTask = (data: SubcontractorTaskForm) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, updates: data });
    }
  };

  // Quick completion toggle function
  const handleTaskCompletionToggle = async (task: Task, checked: boolean) => {
    const newStatus = checked ? "completed" : "pending";
    
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ 
        title: checked ? "Task completed!" : "Task marked as pending",
        description: `${task.title} has been ${checked ? "marked as completed" : "reopened"}.`
      });
    } catch (error) {
      toast({ 
        title: "Error updating task", 
        description: "Failed to update task status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "blocked": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      default: return "bg-green-500";
    }
  };

  if (isLoadingTasks || isLoadingProjects || isLoadingUsers || isLoadingAssignments) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading subcontractor data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold construction-secondary">Subcontractors</h1>
          <p className="text-gray-600 mt-2">Manage subcontractor assignments, tasks, and schedules</p>
        </div>
        <Dialog open={isAddTaskOpen} onOpenChange={(open) => {
          if (open) {
            // Reset form to default values when opening dialog
            form.reset({
              projectId: "",
              title: "",
              description: "",
              assigneeId: "unassigned",
              priority: "medium",
              category: "subcontractor",
              status: "pending",
              isMilestone: false,
            });
          }
          setIsAddTaskOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button className="construction-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Subcontractor Task</DialogTitle>
              <DialogDescription>
                Add a new task or milestone for subcontractors
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitTask)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                        <Textarea placeholder="Enter task description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Subcontractor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select subcontractor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {subcontractors.length > 0 ? (
                            subcontractors.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id}>
                                {sub.name} ({sub.username})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-subs" disabled>
                              No subcontractors available
                            </SelectItem>
                          )}
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                          value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />



                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddTaskOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTaskMutation.isPending}
                    className="construction-primary"
                  >
                    {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={isEditTaskOpen} onOpenChange={setIsEditTaskOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Subcontractor Task</DialogTitle>
              <DialogDescription>
                Update task details and assignment
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onSubmitEditTask)} className="space-y-4">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter task description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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

                <FormField
                  control={editForm.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Subcontractor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select subcontractor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {subcontractors.length > 0 ? (
                            subcontractors.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id}>
                                {sub.name} ({sub.username})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-subs" disabled>
                              No subcontractors available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                  control={editForm.control}
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
                  control={editForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                          value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditTaskOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateTaskMutation.isPending}
                    className="construction-primary"
                  >
                    {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-gray-100">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users size={16} />
            Overview
          </TabsTrigger>
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Clock size={16} />
            Daily Tasks
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Calendar size={16} />
            Weekly View
          </TabsTrigger>
          <TabsTrigger value="by-projects" className="flex items-center gap-2">
            <Building2 size={16} />
            By Projects
          </TabsTrigger>
          <TabsTrigger value="by-subs" className="flex items-center gap-2">
            <Users size={16} />
            By Subcontractors
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Target size={16} />
            Milestones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subcontractors</CardTitle>
                <Users className="h-4 w-4 ml-auto text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subcontractors.length}</div>
                <p className="text-xs text-muted-foreground">Registered subcontractors</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                <CheckSquare className="h-4 w-4 ml-auto text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {subcontractorTasks.filter(t => t.status === "pending").length}
                </div>
                <p className="text-xs text-muted-foreground">Tasks awaiting start</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Due Today</CardTitle>
                <Clock className="h-4 w-4 ml-auto text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayTasks.length}</div>
                <p className="text-xs text-muted-foreground">Tasks due today</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Recent Subcontractor Activity</h3>
            <div className="space-y-4">
              {subcontractorTasks.slice(0, 5).map((task) => {
                const assignee = users.find(u => u.id === task.assigneeId);
                const project = projects.find(p => p.id === task.projectId);
                
                return (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        checked={task.status === "completed"}
                        onCheckedChange={(checked) => handleTaskCompletionToggle(task, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <div className={cn("w-3 h-3 rounded-full", getPriorityColor(task.priority))} />
                      <div>
                        <p className={cn("font-medium", task.status === "completed" && "line-through text-gray-500")}>
                          {task.title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {assignee?.name || "Unassigned"} • {project?.name || "General Task"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                      {task.isMilestone && (
                        <Badge variant="outline" className="text-blue-600">
                          <Target className="w-3 h-3 mr-1" />
                          Milestone
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="daily">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Tasks Due Today ({today.toLocaleDateString()})</h3>
            {todayTasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No tasks due today</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayTasks.map((task) => {
                  const assignee = users.find(u => u.id === task.assigneeId);
                  const project = projects.find(p => p.id === task.projectId);
                  
                  return (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleTaskClick(task)}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={task.status === "completed"}
                              onCheckedChange={(checked) => handleTaskCompletionToggle(task, checked as boolean)}
                              onClick={(e) => e.stopPropagation()}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                            <CardTitle className={cn("text-sm", task.status === "completed" && "line-through text-gray-500")}>
                              {task.title}
                            </CardTitle>
                          </div>
                          <div className={cn("w-3 h-3 rounded-full", getPriorityColor(task.priority))} />
                        </div>
                        <CardDescription>
                          {assignee?.name || "Unassigned"} • {project?.name || "General"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                          {task.isMilestone && (
                            <Badge variant="outline" className="text-blue-600">
                              <Target className="w-3 h-3 mr-1" />
                              Milestone
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="weekly">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Week of {startOfWeek.toLocaleDateString()} - {endOfWeek.toLocaleDateString()}
            </h3>
            {weekTasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No tasks scheduled for this week</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weekTasks.map((task) => {
                  const assignee = users.find(u => u.id === task.assigneeId);
                  const project = projects.find(p => p.id === task.projectId);
                  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                  
                  return (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleTaskClick(task)}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={task.status === "completed"}
                              onCheckedChange={(checked) => handleTaskCompletionToggle(task, checked as boolean)}
                              onClick={(e) => e.stopPropagation()}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                            <CardTitle className={cn("text-sm", task.status === "completed" && "line-through text-gray-500")}>
                              {task.title}
                            </CardTitle>
                          </div>
                          <div className={cn("w-3 h-3 rounded-full", getPriorityColor(task.priority))} />
                        </div>
                        <CardDescription>
                          {assignee?.name || "Unassigned"} • {project?.name || "General"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                          {task.isMilestone && (
                            <Badge variant="outline" className="text-blue-600">
                              <Target className="w-3 h-3 mr-1" />
                              Milestone
                            </Badge>
                          )}
                        </div>
                        {dueDate && (
                          <p className="text-xs text-gray-500">
                            Due: {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="by-projects">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Tasks Organized by Projects</h3>
            {projects.map((project) => {
              const projectTasks = subcontractorTasks.filter(t => t.projectId === project.id);
              
              if (projectTasks.length === 0) return null;
              
              return (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{project.name}</span>
                      <Badge variant="outline">{projectTasks.length} tasks</Badge>
                    </CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {projectTasks.map((task) => {
                        const assignee = users.find(u => u.id === task.assigneeId);
                        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                        
                        return (
                          <div 
                            key={task.id}
                            className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleTaskClick(task)}
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={task.status === "completed"}
                                onCheckedChange={(checked) => handleTaskCompletionToggle(task, checked as boolean)}
                                onClick={(e) => e.stopPropagation()}
                                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                              />
                              <div className={cn("w-3 h-3 rounded-full", getPriorityColor(task.priority))} />
                              <div>
                                <p className={cn("font-medium", task.status === "completed" && "line-through text-gray-500")}>
                                  {task.title}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Assigned to: {assignee?.name || "Unassigned"}
                                  {dueDate && ` • Due: ${dueDate.toLocaleDateString()}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(task.status)}>
                                {task.status}
                              </Badge>
                              {task.isMilestone && (
                                <Badge variant="outline" className="text-blue-600">
                                  <Target className="w-3 h-3 mr-1" />
                                  Milestone
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="by-subs">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Tasks Organized by Subcontractors</h3>
            {subcontractors.map((subcontractor) => {
              const subTasks = subcontractorTasks.filter(t => t.assigneeId === subcontractor.id);
              
              return (
                <Card key={subcontractor.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{subcontractor.name}</span>
                      <Badge variant="outline">{subTasks.length} tasks</Badge>
                    </CardTitle>
                    <CardDescription>{subcontractor.email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {subTasks.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No tasks assigned</p>
                    ) : (
                      <div className="space-y-3">
                        {subTasks.map((task) => {
                          const project = projects.find(p => p.id === task.projectId);
                          const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                          
                          return (
                            <div 
                              key={task.id}
                              className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => handleTaskClick(task)}
                            >
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  checked={task.status === "completed"}
                                  onCheckedChange={(checked) => handleTaskCompletionToggle(task, checked as boolean)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                />
                                <div className={cn("w-3 h-3 rounded-full", getPriorityColor(task.priority))} />
                                <div>
                                  <p className={cn("font-medium", task.status === "completed" && "line-through text-gray-500")}>
                                    {task.title}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Project: {project?.name || "General Task"}
                                    {dueDate && ` • Due: ${dueDate.toLocaleDateString()}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge className={getStatusColor(task.status)}>
                                  {task.status}
                                </Badge>
                                {task.isMilestone && (
                                  <Badge variant="outline" className="text-blue-600">
                                    <Target className="w-3 h-3 mr-1" />
                                    Milestone
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Unassigned tasks */}
            {(() => {
              const unassignedTasks = subcontractorTasks.filter(t => !t.assigneeId);
              if (unassignedTasks.length === 0) return null;
              
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Unassigned Tasks</span>
                      <Badge variant="outline">{unassignedTasks.length} tasks</Badge>
                    </CardTitle>
                    <CardDescription>Tasks that need subcontractor assignment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {unassignedTasks.map((task) => {
                        const project = projects.find(p => p.id === task.projectId);
                        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                        
                        return (
                          <div 
                            key={task.id}
                            className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleTaskClick(task)}
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={task.status === "completed"}
                                onCheckedChange={(checked) => handleTaskCompletionToggle(task, checked as boolean)}
                                onClick={(e) => e.stopPropagation()}
                                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                              />
                              <div className={cn("w-3 h-3 rounded-full", getPriorityColor(task.priority))} />
                              <div>
                                <p className={cn("font-medium", task.status === "completed" && "line-through text-gray-500")}>
                                  {task.title}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Project: {project?.name || "General Task"}
                                  {dueDate && ` • Due: ${dueDate.toLocaleDateString()}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(task.status)}>
                                {task.status}
                              </Badge>
                              {task.isMilestone && (
                                <Badge variant="outline" className="text-blue-600">
                                  <Target className="w-3 h-3 mr-1" />
                                  Milestone
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Milestone Tasks</h3>
            {subcontractorTasks.filter(task => task.isMilestone).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No milestone tasks found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subcontractorTasks.filter(task => task.isMilestone).map((task) => {
                  const assignee = users.find(u => u.id === task.assigneeId);
                  const project = projects.find(p => p.id === task.projectId);
                  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                  
                  return (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500" onClick={() => handleTaskClick(task)}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={task.status === "completed"}
                              onCheckedChange={(checked) => handleTaskCompletionToggle(task, checked as boolean)}
                              onClick={(e) => e.stopPropagation()}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                            <CardTitle className={cn("text-sm flex items-center", task.status === "completed" && "line-through text-gray-500")}>
                              <Target className="w-4 h-4 mr-2 text-blue-600" />
                              {task.title}
                            </CardTitle>
                          </div>
                          <div className={cn("w-3 h-3 rounded-full", getPriorityColor(task.priority))} />
                        </div>
                        <CardDescription>
                          {assignee?.name || "Unassigned"} • {project?.name || "General"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                          <Badge variant="outline" className="text-blue-600">
                            Milestone
                          </Badge>
                        </div>
                        {dueDate && (
                          <p className="text-xs text-gray-500">
                            Due: {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}