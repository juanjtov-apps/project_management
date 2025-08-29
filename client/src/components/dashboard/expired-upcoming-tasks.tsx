import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    case "high":
      return "bg-brand-coral/10 text-brand-coral border-brand-coral/20";
    case "medium":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "low":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getPriorityValue = (priority: string): number => {
  switch (priority) {
    case "critical": return 4;
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 0;
  }
};

export default function ExpiredUpcomingTasks() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
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

  // Get expired tasks (overdue and not completed)
  const expiredTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === "completed") return false;
    const taskDate = new Date(task.dueDate);
    const now = new Date();
    return taskDate < now;
  }).slice(0, 5); // Show top 5 expired tasks

  // Get next 3 upcoming tasks by priority (due in future, not completed)
  const upcomingTasks = tasks
    .filter(task => {
      if (!task.dueDate || task.status === "completed") return false;
      const taskDate = new Date(task.dueDate);
      const now = new Date();
      return taskDate >= now;
    })
    .sort((a, b) => {
      // Sort by priority first, then by due date
      const priorityDiff = getPriorityValue(b.priority) - getPriorityValue(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      
      const aDate = new Date(a.dueDate!);
      const bDate = new Date(b.dueDate!);
      return aDate.getTime() - bDate.getTime();
    })
    .slice(0, 3); // Show next 3 tasks

  const handleTaskToggle = (task: Task, completed: boolean) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: {
        status: completed ? "completed" : "pending"
      }
    });
  };

  const formatDueDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} day(s) overdue`;
    } else if (diffDays === 0) {
      return "Due today";
    } else if (diffDays === 1) {
      return "Due tomorrow";
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  const handleTaskClick = (task: Task) => {
    console.log('🔍 Dashboard task clicked:', task.title);
    setLocation(`/tasks`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expired Tasks Loading */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-red-600">Expired Tasks</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Tasks Loading */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-blue-600">Next 3 Priority Tasks</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Expired Tasks */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="text-red-500" size={20} />
            <h3 className="text-lg font-semibold text-red-600">Expired Tasks</h3>
            <Badge className="bg-red-100 text-red-800 border-red-200">
              {expiredTasks.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            className="text-red-600 hover:text-red-700 text-sm font-medium"
            onClick={() => setLocation("/tasks")}
            data-testid="view-all-expired-tasks"
          >
            View All
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {expiredTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock size={32} className="mx-auto mb-2 text-gray-400" />
                <p>No expired tasks</p>
                <p className="text-sm">Great job staying on top of deadlines!</p>
              </div>
            ) : (
              expiredTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center space-x-3 p-3 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 transition-colors cursor-pointer"
                  data-testid={`expired-task-${task.id}`}
                  onClick={(e) => {
                    // Don't trigger click if checkbox was clicked
                    if (!(e.target as HTMLElement).closest('[role="checkbox"]')) {
                      handleTaskClick(task);
                    }
                  }}
                >
                  <Checkbox
                    checked={task.status === "completed"}
                    onCheckedChange={(checked) => handleTaskToggle(task, !!checked)}
                    className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  />
                  <div className="flex-1">
                    <h4 className={`font-medium ${task.status === "completed" ? "line-through text-gray-500" : "text-red-800"}`}>
                      {task.title}
                    </h4>
                    <p className={`text-sm ${task.status === "completed" ? "text-gray-400" : "text-red-600"}`}>
                      {task.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </Badge>
                      <span className="text-xs text-red-600 font-medium">
                        {formatDueDate(task.dueDate!)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Next 3 Priority Tasks */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="text-blue-500" size={20} />
            <h3 className="text-lg font-semibold text-blue-600">Next 3 Priority Tasks</h3>
          </div>
          <Button
            variant="ghost"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            onClick={() => setLocation("/tasks")}
            data-testid="view-all-upcoming-tasks"
          >
            View All
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {upcomingTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock size={32} className="mx-auto mb-2 text-gray-400" />
                <p>No upcoming tasks</p>
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              upcomingTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50 border border-blue-100 transition-colors cursor-pointer"
                  data-testid={`upcoming-task-${task.id}`}
                  onClick={(e) => {
                    // Don't trigger click if checkbox was clicked
                    if (!(e.target as HTMLElement).closest('[role="checkbox"]')) {
                      handleTaskClick(task);
                    }
                  }}
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                    {index + 1}
                  </div>
                  <Checkbox
                    checked={task.status === "completed"}
                    onCheckedChange={(checked) => handleTaskToggle(task, !!checked)}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <div className="flex-1">
                    <h4 className={`font-medium ${task.status === "completed" ? "line-through text-gray-500" : "text-blue-800"}`}>
                      {task.title}
                    </h4>
                    <p className={`text-sm ${task.status === "completed" ? "text-gray-400" : "text-gray-600"}`}>
                      {task.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </Badge>
                      <span className="text-xs text-blue-600 font-medium">
                        {formatDueDate(task.dueDate!)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}