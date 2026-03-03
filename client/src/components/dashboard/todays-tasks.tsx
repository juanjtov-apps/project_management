import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";
import { ClipboardList } from "lucide-react";

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case "critical":
      return { bg: "rgba(239, 68, 68, 0.15)", color: "#EF4444", label: "Critical" };
    case "high":
      return { bg: "rgba(249, 115, 22, 0.15)", color: "#F97316", label: "High" };
    case "medium":
      return { bg: "rgba(96, 165, 250, 0.15)", color: "#60A5FA", label: "Medium" };
    case "low":
      return { bg: "rgba(74, 222, 128, 0.15)", color: "#4ADE80", label: "Low" };
    default:
      return { bg: "rgba(156, 163, 175, 0.15)", color: "#9CA3AF", label: priority };
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
      apiRequest(`/api/tasks/${id}`, { method: "PATCH", body: updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  const todaysTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const today = new Date();
    const taskDate = new Date(task.dueDate);
    return taskDate.toDateString() === today.toDateString();
  }).slice(0, 4);

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
      <div 
        className="rounded-xl"
        style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
      >
        <div className="p-5 border-b" style={{ borderColor: '#2D333B' }}>
          <h3 className="text-lg font-semibold text-white">Today's Tasks</h3>
        </div>
        <div className="p-5">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 rounded-lg" style={{ backgroundColor: '#1F242C' }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-xl"
      style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
      data-testid="todays-tasks"
    >
      <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: '#2D333B' }}>
        <h3 className="text-lg font-semibold text-white">Today's Tasks</h3>
        <Button
          variant="ghost"
          className="text-sm font-medium"
          style={{ color: '#4ADE80' }}
          onClick={() => setLocation("/tasks")}
          data-testid="view-all-todays-tasks"
        >
          View All
        </Button>
      </div>
      <div className="p-5">
        <div className="space-y-3">
          {todaysTasks.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="mx-auto mb-3 h-12 w-12" style={{ color: '#9CA3AF' }} />
              <p className="text-white font-medium mb-1">No tasks due today</p>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Enjoy your day!</p>
            </div>
          ) : (
            todaysTasks.map((task) => {
              const config = getPriorityConfig(task.priority);
              return (
                <div
                  key={task.id}
                  className="flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 hover:translate-y-[-2px]"
                  style={{ 
                    backgroundColor: '#1F242C',
                    border: '1px solid #2D333B'
                  }}
                  data-testid={`todays-task-${task.id}`}
                >
                  <Checkbox
                    checked={task.status === "completed"}
                    onCheckedChange={(checked) => handleTaskToggle(task, !!checked)}
                    className="data-[state=checked]:bg-[#4ADE80] data-[state=checked]:border-[#4ADE80]"
                  />
                  <div className="flex-1">
                    <h4 className={`font-medium ${task.status === "completed" ? "line-through" : "text-white"}`}
                      style={{ color: task.status === "completed" ? '#6B7280' : '#FFFFFF' }}>
                      {task.title}
                    </h4>
                    <p className={`text-sm ${task.status === "completed" ? "line-through" : ""}`}
                      style={{ color: task.status === "completed" ? '#4B5563' : '#9CA3AF' }}>
                      {task.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span 
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: config.bg,
                          color: config.color
                        }}
                      >
                        {config.label} Priority
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium" 
                      style={{ color: task.status === "completed" ? '#6B7280' : '#9CA3AF' }}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time set'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
