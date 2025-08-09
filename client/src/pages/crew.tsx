import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, CalendarIcon, AlertTriangle, CheckCircle, Users, HardHat } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertScheduleChangeSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Task, ScheduleChange, InsertScheduleChange, Project } from "@shared/schema";

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

export default function Crew() {
  const [isScheduleChangeDialogOpen, setIsScheduleChangeDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: scheduleChanges = [] } = useQuery<ScheduleChange[]>({
    queryKey: ["/api/schedule-changes"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      apiRequest("PATCH", `/api/tasks/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  const createScheduleChangeMutation = useMutation({
    mutationFn: (data: InsertScheduleChange) => apiRequest("POST", "/api/schedule-changes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-changes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setIsScheduleChangeDialogOpen(false);
      setSelectedTask(null);
      form.reset();
      toast({
        title: "Success",
        description: "Schedule change request submitted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit schedule change request",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertScheduleChange>({
    resolver: zodResolver(insertScheduleChangeSchema),
    defaultValues: {
      taskId: "",
      userId: "sample-user-id", // In a real app, this would come from auth
      reason: "",
      originalDate: new Date(),
      newDate: new Date(),
    },
  });

  const handleTaskToggle = (task: Task, completed: boolean) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: {
        status: completed ? "completed" : "pending"
      }
    });
  };

  const handleScheduleChangeRequest = (task: Task) => {
    setSelectedTask(task);
    form.setValue("taskId", task.id);
    form.setValue("originalDate", task.dueDate || new Date());
    setIsScheduleChangeDialogOpen(true);
  };

  const onSubmit = (data: InsertScheduleChange) => {
    createScheduleChangeMutation.mutate(data);
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  // Filter tasks for crew view (assigned tasks, today's tasks, etc.)
  const today = new Date();
  const todaysTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    return taskDate.toDateString() === today.toDateString();
  });

  const upcomingTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    return taskDate > today && taskDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // Next 7 days
  });

  const recentScheduleChanges = scheduleChanges.slice(0, 5);

  if (tasksLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Crew Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 construction-primary rounded-lg flex items-center justify-center">
            <HardHat className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold construction-secondary">Crew Dashboard</h1>
            <p className="text-gray-500">Manage your daily tasks and schedule</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Today's Tasks</p>
                <p className="text-2xl font-bold construction-secondary">{todaysTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-brand-teal/10 rounded-lg flex items-center justify-center">
                <CalendarIcon className="text-brand-teal" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Upcoming Tasks</p>
                <p className="text-2xl font-bold construction-secondary">{upcomingTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed Today</p>
                <p className="text-2xl font-bold construction-secondary">
                  {tasks.filter(t => t.status === "completed" && t.completedAt && 
                    new Date(t.completedAt).toDateString() === today.toDateString()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="construction-secondary flex items-center">
              <Clock className="mr-2" size={20} />
              Today's Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todaysTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No tasks scheduled for today
                </div>
              ) : (
                todaysTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={task.status === "completed"}
                      onCheckedChange={(checked) => handleTaskToggle(task, !!checked)}
                      className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <div className="flex-1">
                      <h4 className={`font-medium ${task.status === "completed" ? "line-through text-gray-500" : "construction-secondary"}`}>
                        {task.title}
                      </h4>
                      <p className="text-sm text-blue-600">{getProjectName(task.projectId)}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {task.dueDate ? new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time set'}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleScheduleChangeRequest(task)}
                      disabled={task.status === "completed"}
                    >
                      <AlertTriangle size={14} className="mr-1" />
                      Request Change
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="construction-secondary flex items-center">
              <CalendarIcon className="mr-2" size={20} />
              Upcoming Tasks (Next 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No upcoming tasks in the next 7 days
                </div>
              ) : (
                upcomingTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <h4 className="font-medium construction-secondary">{task.title}</h4>
                      <p className="text-sm text-blue-600">{getProjectName(task.projectId)}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date set'}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleScheduleChangeRequest(task)}
                    >
                      <AlertTriangle size={14} className="mr-1" />
                      Request Change
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Schedule Change Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="construction-secondary">Recent Schedule Change Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentScheduleChanges.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No schedule change requests
              </div>
            ) : (
              recentScheduleChanges.map((change) => (
                <div key={change.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium construction-secondary">
                      {tasks.find(t => t.id === change.taskId)?.title || "Unknown Task"}
                    </h4>
                    <p className="text-sm text-gray-600">{change.reason}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Requested {new Date(change.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={
                    change.status === "approved" ? "bg-green-100 text-green-800" :
                    change.status === "rejected" ? "bg-red-100 text-red-800" :
                    "bg-brand-coral/10 text-brand-coral"
                  }>
                    {change.status.charAt(0).toUpperCase() + change.status.slice(1)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Change Request Dialog */}
      <Dialog open={isScheduleChangeDialogOpen} onOpenChange={setIsScheduleChangeDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" aria-describedby="schedule-change-description">
          <DialogHeader>
            <DialogTitle>Request Schedule Change</DialogTitle>
            <div id="schedule-change-description" className="sr-only">
              Request a change to a task's schedule with reason and new dates.
            </div>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {selectedTask && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium construction-secondary">{selectedTask.title}</h4>
                  <p className="text-sm text-blue-600">{getProjectName(selectedTask.projectId)}</p>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Schedule Change</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Explain why the schedule needs to be changed (e.g., material delay, weather conditions, equipment issues)..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="originalDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Original Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick original date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="newDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>New Requested Date</FormLabel>
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
                                <span>Pick new date</span>
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
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsScheduleChangeDialogOpen(false);
                    setSelectedTask(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createScheduleChangeMutation.isPending}
                  className="construction-primary text-white"
                >
                  {createScheduleChangeMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
