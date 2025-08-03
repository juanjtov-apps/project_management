import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

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

export default function TodaysTasks() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      apiRequest("PATCH", `/api/tasks/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  // Filter tasks due today
  const todaysTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const today = new Date();
    const taskDate = new Date(task.dueDate);
    return taskDate.toDateString() === today.toDateString();
  }).slice(0, 4); // Show only first 4 for dashboard

  const handleTaskToggle = (task: Task, completed: boolean) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: {
        status: completed ? "completed" : "pending"
      }
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Today's Tasks</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold construction-secondary">Today's Tasks</h3>
        <Button
          variant="ghost"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          onClick={() => setLocation("/tasks")}
        >
          View All
        </Button>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {todaysTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tasks due today
            </div>
          ) : (
            todaysTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Checkbox
                  checked={task.status === "completed"}
                  onCheckedChange={(checked) => handleTaskToggle(task, !!checked)}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <div className="flex-1">
                  <h4 className={`font-medium ${task.status === "completed" ? "line-through text-gray-500" : "construction-secondary"}`}>
                    {task.title}
                  </h4>
                  <p className={`text-sm ${task.status === "completed" ? "text-gray-400" : "text-gray-500"}`}>
                    {task.description}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${task.status === "completed" ? "text-gray-400" : "construction-secondary"}`}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time set'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
