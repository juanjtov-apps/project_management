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
import { Plus, CalendarIcon, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertScheduleChangeSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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
  const [selectedTask, setSelectedTask] = useState("");
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
      setIsCreateDialogOpen(false);
      form.reset();
    },
  });

  const updateScheduleChangeMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InsertScheduleChange> }) =>
      apiRequest("PATCH", `/api/schedule-changes/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-changes"] });
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

  const onSubmit = (data: InsertScheduleChange) => {
    createScheduleChangeMutation.mutate(data);
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
              Report Schedule Change
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Report Schedule Change</DialogTitle>
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
                    {createScheduleChangeMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

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
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <h4 className="font-medium construction-secondary">{task.title}</h4>
                      <p className="text-sm text-blue-600">{getProjectName(task.id)}</p>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Clock size={14} className="mr-1" />
                        {new Date(task.dueDate!).toLocaleDateString()} at{" "}
                        {new Date(task.dueDate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <Badge className={task.status === "completed" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                      {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Schedule Change Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="construction-secondary">Schedule Change Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scheduleChanges.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No schedule change requests
                </div>
              ) : (
                scheduleChanges.map((change) => (
                  <div key={change.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium construction-secondary">{getTaskName(change.taskId)}</h4>
                        <p className="text-sm text-blue-600">{getProjectName(change.taskId)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(change.status)}
                        <Badge className={getStatusColor(change.status)}>
                          {change.status.charAt(0).toUpperCase() + change.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600">{change.reason}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Original Date:</span>
                        <p className="font-medium">{new Date(change.originalDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Requested Date:</span>
                        <p className="font-medium">{new Date(change.newDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    {change.status === "pending" && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="bg-green-600 text-white hover:bg-green-700"
                          onClick={() => updateScheduleChangeMutation.mutate({
                            id: change.id,
                            updates: { status: "approved" }
                          })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-600 hover:bg-red-50"
                          onClick={() => updateScheduleChangeMutation.mutate({
                            id: change.id,
                            updates: { status: "rejected" }
                          })}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400">
                      Requested {new Date(change.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
