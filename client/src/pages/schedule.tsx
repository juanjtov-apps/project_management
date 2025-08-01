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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CalendarIcon, Clock, AlertTriangle, CheckCircle, XCircle, CalendarDays, List } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertScheduleChangeSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import type { Task, ScheduleChange, InsertScheduleChange, Project } from "@shared/schema";

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "approved":
      return <CheckCircle size={16} className="text-green-600" />;
    case "rejected":
      return <XCircle size={16} className="text-red-600" />;
    case "pending":
      return <Clock size={16} className="text-orange-600" />;
    default:
      return <AlertTriangle size={16} className="text-gray-600" />;
  }
};

export default function Schedule() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedScheduleChange, setSelectedScheduleChange] = useState<ScheduleChange | null>(null);
  const [selectedTask, setSelectedTask] = useState("");
  const [currentView, setCurrentView] = useState<"overview" | "timeline" | "gantt" | "calendar">("overview");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: scheduleChanges = [], isLoading: changesLoading } = useQuery<ScheduleChange[]>({
    queryKey: ["/api/schedule-changes"],
  });

  const createScheduleChangeMutation = useMutation({
    mutationFn: (data: InsertScheduleChange) => apiRequest("POST", "/api/schedule-changes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-changes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); // Refresh task data to show updated due dates
      setIsCreateDialogOpen(false);
      form.reset();
    },
  });

  const updateScheduleChangeMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InsertScheduleChange> }) =>
      apiRequest("PATCH", `/api/schedule-changes/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-changes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); // Refresh task data to show updated due dates
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

  const editForm = useForm<InsertScheduleChange>({
    resolver: zodResolver(insertScheduleChangeSchema),
    defaultValues: {
      taskId: "",
      userId: "sample-user-id",
      reason: "",
      originalDate: new Date(),
      newDate: new Date(),
    },
  });

  const onSubmit = (data: InsertScheduleChange) => {
    createScheduleChangeMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertScheduleChange) => {
    if (selectedScheduleChange) {
      updateScheduleChangeMutation.mutate({
        id: selectedScheduleChange.id,
        updates: data
      });
      setIsEditDialogOpen(false);
      setSelectedScheduleChange(null);
      editForm.reset();
    }
  };

  const handleScheduleChangeClick = (scheduleChange: ScheduleChange) => {
    setSelectedScheduleChange(scheduleChange);
    editForm.reset({
      taskId: scheduleChange.taskId,
      userId: scheduleChange.userId,
      reason: scheduleChange.reason,
      originalDate: new Date(scheduleChange.originalDate),
      newDate: new Date(scheduleChange.newDate),
    });
    setIsEditDialogOpen(true);
  };

  const getTaskName = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    return task?.title || "Unknown Task";
  };

  const getProjectName = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const project = projects.find(p => p.id === task?.projectId);
    return project?.name || "Unknown Project";
  };

  const tasksWithSchedules = tasks.filter(task => task.dueDate);
  const upcomingTasks = tasksWithSchedules
    .filter(task => new Date(task.dueDate!) >= new Date())
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  // Timeline data processing
  const timelineData = tasksWithSchedules
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .map(task => ({
      ...task,
      project: projects.find(p => p.id === task.projectId),
      daysFromNow: Math.ceil((new Date(task.dueDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }));

  // Calendar data processing
  const calendarDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getTasksForDay = (day: Date) => {
    return tasksWithSchedules.filter(task => 
      isSameDay(new Date(task.dueDate!), day)
    );
  };

  const getProjectDeadlinesForDay = (day: Date) => {
    return projects.filter(project => 
      project.dueDate && isSameDay(new Date(project.dueDate), day)
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "project": return "bg-blue-600";
      case "administrative": return "bg-purple-600";
      case "general": return "bg-gray-600";
      default: return "bg-gray-500";
    }
  };

  if (tasksLoading || changesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Schedule</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold construction-secondary">Schedule Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="construction-primary text-white">
              <Plus size={16} className="mr-2" />
              Update Task Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Update Task Schedule</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="taskId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select task" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tasks.map(task => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title} - {getProjectName(task.id)}
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
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Schedule Change</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Explain why the schedule needs to be changed..." 
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
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createScheduleChangeMutation.isPending}
                    className="construction-primary text-white"
                  >
                    {createScheduleChangeMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Schedule Change Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Update Task Schedule</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="taskId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select task" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tasks.map(task => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title} - {getProjectName(task.id)}
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
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Schedule Change</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Explain why the schedule needs to be changed..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
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
                  
                  <FormField
                    control={editForm.control}
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
                      setIsEditDialogOpen(false);
                      setSelectedScheduleChange(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateScheduleChangeMutation.isPending}
                    className="construction-primary text-white"
                  >
                    {updateScheduleChangeMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <List size={16} />
            Overview
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock size={16} />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="gantt" className="flex items-center gap-2">
            <CalendarIcon size={16} />
            Gantt Chart
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays size={16} />
            Calendar
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="construction-secondary">Upcoming Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No upcoming scheduled tasks
                    </div>
                  ) : (
                    upcomingTasks.slice(0, 10).map((task) => (
                      <div 
                        key={task.id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedTask(task.id);
                          form.setValue('taskId', task.id);
                          form.setValue('originalDate', new Date(task.dueDate!));
                          setIsCreateDialogOpen(true);
                        }}
                      >
                        <div>
                          <h4 className="font-medium construction-secondary">{task.title}</h4>
                          <p className="text-sm text-blue-600">{getProjectName(task.id)}</p>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Clock size={14} className="mr-1" />
                            {new Date(task.dueDate!).toLocaleDateString()} at{" "}
                            {new Date(task.dueDate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            Click to update schedule
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                          <Badge className={task.status === "completed" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Schedule Change Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="construction-secondary">Recent Schedule Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scheduleChanges.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No recent schedule updates
                    </div>
                  ) : (
                    scheduleChanges.map((change) => (
                      <div 
                        key={change.id} 
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium construction-secondary">{getTaskName(change.taskId)}</h4>
                            <p className="text-sm text-blue-600">{getProjectName(change.taskId)}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            Updated
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600">{change.reason}</p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Original Date:</span>
                            <p className="font-medium">{new Date(change.originalDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Updated Date:</span>
                            <p className="font-medium text-green-600">{new Date(change.newDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        

                        
                        <div className="text-xs text-gray-500">
                          Updated {new Date(change.createdAt).toLocaleDateString()} at {new Date(change.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Horizontal Timeline View */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="construction-secondary">Horizontal Timeline</CardTitle>
              <p className="text-sm text-gray-600">Chronological progression of all tasks and project deadlines</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-4">
                {timelineData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No scheduled tasks or project deadlines
                  </div>
                ) : (
                  <div className="relative min-w-[800px]">
                    {/* Horizontal timeline line */}
                    <div className="absolute top-12 left-8 right-8 h-0.5 bg-gray-300"></div>
                    
                    <div className="flex items-start justify-between px-8 pt-4">
                      {timelineData.map((item, index) => {
                        const percentage = (index / (timelineData.length - 1)) * 100;
                        return (
                          <div key={item.id} className="relative flex-shrink-0" style={{ left: `${percentage}%`, position: index === 0 ? 'relative' : 'absolute', transform: index === 0 ? 'none' : 'translateX(-50%)' }}>
                            {/* Timeline dot */}
                            <div className={`relative z-10 w-6 h-6 rounded-full border-2 border-white ${getPriorityColor(item.priority)} flex items-center justify-center mx-auto`}>
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                            
                            {/* Timeline content card */}
                            <div className="w-64 mt-4">
                              <div 
                                className="bg-white border rounded-lg p-3 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => {
                                  setSelectedTask(item.id);
                                  form.setValue('taskId', item.id);
                                  form.setValue('originalDate', new Date(item.dueDate!));
                                  setIsCreateDialogOpen(true);
                                }}
                              >
                                <div className="space-y-2">
                                  <h4 className="font-medium construction-secondary text-sm leading-tight">{item.title}</h4>
                                  {item.project && (
                                    <p className="text-xs text-blue-600">{item.project.name}</p>
                                  )}
                                  <div className="flex items-center text-xs text-gray-500">
                                    <Clock size={12} className="mr-1" />
                                    {format(new Date(item.dueDate!), "MMM d, yyyy")}
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className={`px-2 py-1 rounded text-xs font-medium text-white ${getCategoryColor(item.category)}`}>
                                      {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`}></div>
                                      <Badge className={`text-xs ${item.status === "completed" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {item.daysFromNow < 0 
                                      ? <span className="text-red-500 font-medium">{Math.abs(item.daysFromNow)} days overdue</span>
                                      : item.daysFromNow === 0 
                                      ? <span className="text-orange-500 font-medium">Due today</span>
                                      : `${item.daysFromNow} days remaining`
                                    }
                                  </div>
                                  <div className="text-xs text-blue-600 mt-1">
                                    Click to update schedule
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gantt Chart View */}
        <TabsContent value="gantt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="construction-secondary">Gantt Chart</CardTitle>
              <p className="text-sm text-gray-600">Project timeline with task durations and dependencies</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {timelineData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No scheduled tasks or project deadlines
                  </div>
                ) : (
                  <div className="min-w-[1000px]">
                    {/* Gantt header with date labels */}
                    <div className="flex border-b border-gray-200 pb-2 mb-4">
                      <div className="w-64 flex-shrink-0 font-medium text-sm text-gray-700">Tasks</div>
                      <div className="flex-1 grid grid-cols-7 gap-1 text-xs text-gray-500">
                        {Array.from({ length: 7 }, (_, i) => {
                          const date = new Date();
                          date.setDate(date.getDate() + i);
                          return (
                            <div key={i} className="text-center p-1">
                              {format(date, "MMM d")}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Gantt rows */}
                    <div className="space-y-2">
                      {timelineData.map((item) => {
                        // Calculate position based on due date
                        const dueDate = new Date(item.dueDate!);
                        const today = new Date();
                        const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const startPosition = Math.max(0, Math.min(6, daysDiff));
                        const duration = Math.max(1, Math.min(3, 2)); // Default 2-day duration, max 3 days
                        
                        return (
                          <div 
                            key={item.id} 
                            className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors rounded p-2"
                            onClick={() => {
                              setSelectedTask(item.id);
                              form.setValue('taskId', item.id);
                              form.setValue('originalDate', new Date(item.dueDate!));
                              setIsCreateDialogOpen(true);
                            }}
                          >
                            {/* Task name column */}
                            <div className="w-64 flex-shrink-0 pr-4">
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority)}`}></div>
                                <div>
                                  <div className="font-medium text-sm construction-secondary truncate">{item.title}</div>
                                  {item.project && (
                                    <div className="text-xs text-blue-600 truncate">{item.project.name}</div>
                                  )}
                                  <div className="text-xs text-gray-500">Click to update schedule</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Gantt bar area */}
                            <div className="flex-1 relative h-8">
                              <div className="grid grid-cols-7 gap-1 h-full">
                                {Array.from({ length: 7 }, (_, colIndex) => (
                                  <div key={colIndex} className="border-r border-gray-100 last:border-r-0"></div>
                                ))}
                              </div>
                              
                              {/* Task bar */}
                              <div 
                                className={`absolute top-1 h-6 rounded ${
                                  item.status === "completed" 
                                    ? "bg-green-500" 
                                    : item.daysFromNow < 0 
                                    ? "bg-red-500" 
                                    : getPriorityColor(item.priority).replace('bg-', 'bg-opacity-80 bg-')
                                } flex items-center px-2`}
                                style={{
                                  left: `${(startPosition / 7) * 100}%`,
                                  width: `${(duration / 7) * 100}%`,
                                }}
                              >
                                <span className="text-white text-xs font-medium truncate">
                                  {item.status === "completed" ? "✓" : format(new Date(item.dueDate!), "MMM d")}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-6 text-xs text-gray-600">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded"></div>
                          <span>High Priority</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                          <span>Medium Priority</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span>Low Priority / Completed</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded"></div>
                          <span>Overdue</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="construction-secondary">Calendar View</CardTitle>
                  <p className="text-sm text-gray-600">Monthly view of tasks and project deadlines</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    Previous
                  </Button>
                  <span className="font-medium px-4">
                    {format(currentMonth, "MMMM yyyy")}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="h-10 flex items-center justify-center font-medium text-gray-500 text-sm">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {calendarDays.map((day, index) => {
                  const dayTasks = getTasksForDay(day);
                  const projectDeadlines = getProjectDeadlinesForDay(day);
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-h-[120px] border rounded-lg p-2 space-y-1",
                        isCurrentMonth ? "bg-white" : "bg-gray-50",
                        isToday(day) && "bg-blue-50 border-blue-200"
                      )}
                    >
                      <div className={cn(
                        "text-sm font-medium",
                        isCurrentMonth ? "text-gray-900" : "text-gray-400",
                        isToday(day) && "text-blue-600"
                      )}>
                        {day.getDate()}
                      </div>
                      
                      {/* Project deadlines */}
                      {projectDeadlines.map(project => (
                        <div
                          key={project.id}
                          className="text-xs p-1 bg-purple-100 text-purple-800 rounded truncate"
                          title={`Project: ${project.name}`}
                        >
                          📋 {project.name}
                        </div>
                      ))}
                      
                      {/* Tasks */}
                      {dayTasks.slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          className={cn(
                            "text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity",
                            task.status === "completed" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-orange-100 text-orange-800"
                          )}
                          title={`${task.title} - Click to request schedule change`}
                          onClick={() => {
                            setSelectedTask(task.id);
                            form.setValue('taskId', task.id);
                            form.setValue('originalDate', new Date(task.dueDate!));
                            setIsCreateDialogOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(task.priority)}`}></div>
                            <span className="truncate">{task.title}</span>
                          </div>
                        </div>
                      ))}
                      
                      {/* Show count if more tasks */}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
