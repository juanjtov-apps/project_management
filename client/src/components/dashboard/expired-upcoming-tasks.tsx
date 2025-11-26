import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";

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
      apiRequest(`/api/tasks/${id}`, { method: "PATCH", body: updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  const expiredTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === "completed") return false;
    const taskDate = new Date(task.dueDate);
    const now = new Date();
    return taskDate < now;
  }).slice(0, 5);

  const upcomingTasks = tasks
    .filter(task => {
      if (!task.dueDate || task.status === "completed") return false;
      const taskDate = new Date(task.dueDate);
      const now = new Date();
      return taskDate >= now;
    })
    .sort((a, b) => {
      const priorityDiff = getPriorityValue(b.priority) - getPriorityValue(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      
      const aDate = new Date(a.dueDate!);
      const bDate = new Date(b.dueDate!);
      return aDate.getTime() - bDate.getTime();
    })
    .slice(0, 3);

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
    setLocation(`/tasks`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div 
          className="rounded-xl"
          style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
        >
          <div className="p-5 border-b" style={{ borderColor: '#2D333B' }}>
            <h3 className="text-lg font-semibold" style={{ color: '#EF4444' }}>Expired Tasks</h3>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 rounded-lg" style={{ backgroundColor: '#1F242C' }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div 
          className="rounded-xl"
          style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
        >
          <div className="p-5 border-b" style={{ borderColor: '#2D333B' }}>
            <h3 className="text-lg font-semibold" style={{ color: '#60A5FA' }}>Next 3 Priority Tasks</h3>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 rounded-lg" style={{ backgroundColor: '#1F242C' }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="expired-upcoming-tasks">
      <div 
        className="rounded-xl"
        style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
      >
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: '#2D333B' }}>
          <div className="flex items-center space-x-2">
            <AlertTriangle size={20} style={{ color: '#EF4444' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#EF4444' }}>Expired Tasks</h3>
            <span 
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444'
              }}
            >
              {expiredTasks.length}
            </span>
          </div>
          <Button
            variant="ghost"
            className="text-sm font-medium"
            style={{ color: '#EF4444' }}
            onClick={() => setLocation("/tasks")}
            data-testid="view-all-expired-tasks"
          >
            View All
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {expiredTasks.length === 0 ? (
              <div className="text-center py-8">
                <Clock size={32} className="mx-auto mb-2" style={{ color: '#9CA3AF' }} />
                <p className="text-white font-medium">No expired tasks</p>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>Great job staying on top of deadlines!</p>
              </div>
            ) : (
              expiredTasks.map((task) => {
                const config = getPriorityConfig(task.priority);
                return (
                  <div
                    key={task.id}
                    className="flex items-center space-x-3 p-4 rounded-xl cursor-pointer transition-all duration-200 hover:translate-y-[-2px]"
                    style={{ 
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}
                    data-testid={`expired-task-${task.id}`}
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest('[role="checkbox"]')) {
                        handleTaskClick(task);
                      }
                    }}
                  >
                    <Checkbox
                      checked={task.status === "completed"}
                      onCheckedChange={(checked) => handleTaskToggle(task, !!checked)}
                      className="data-[state=checked]:bg-[#EF4444] data-[state=checked]:border-[#EF4444]"
                    />
                    <div className="flex-1">
                      <h4 className={`font-medium ${task.status === "completed" ? "line-through" : ""}`}
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
                          {config.label}
                        </span>
                        <span className="text-xs font-medium" style={{ color: '#EF4444' }}>
                          {formatDueDate(task.dueDate!)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div 
        className="rounded-xl"
        style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
      >
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: '#2D333B' }}>
          <div className="flex items-center space-x-2">
            <Clock size={20} style={{ color: '#60A5FA' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#60A5FA' }}>Next 3 Priority Tasks</h3>
          </div>
          <Button
            variant="ghost"
            className="text-sm font-medium"
            style={{ color: '#60A5FA' }}
            onClick={() => setLocation("/tasks")}
            data-testid="view-all-upcoming-tasks"
          >
            View All
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {upcomingTasks.length === 0 ? (
              <div className="text-center py-8">
                <Clock size={32} className="mx-auto mb-2" style={{ color: '#9CA3AF' }} />
                <p className="text-white font-medium">No upcoming tasks</p>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>You're all caught up!</p>
              </div>
            ) : (
              upcomingTasks.map((task, index) => {
                const config = getPriorityConfig(task.priority);
                return (
                  <div
                    key={task.id}
                    className="flex items-center space-x-3 p-4 rounded-xl cursor-pointer transition-all duration-200 hover:translate-y-[-2px]"
                    style={{ 
                      backgroundColor: 'rgba(96, 165, 250, 0.08)',
                      border: '1px solid rgba(96, 165, 250, 0.2)'
                    }}
                    data-testid={`upcoming-task-${task.id}`}
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest('[role="checkbox"]')) {
                        handleTaskClick(task);
                      }
                    }}
                  >
                    <div 
                      className="flex items-center justify-center w-6 h-6 rounded-full text-sm font-semibold"
                      style={{ 
                        backgroundColor: 'rgba(96, 165, 250, 0.2)',
                        color: '#60A5FA'
                      }}
                    >
                      {index + 1}
                    </div>
                    <Checkbox
                      checked={task.status === "completed"}
                      onCheckedChange={(checked) => handleTaskToggle(task, !!checked)}
                      className="data-[state=checked]:bg-[#60A5FA] data-[state=checked]:border-[#60A5FA]"
                    />
                    <div className="flex-1">
                      <h4 className={`font-medium ${task.status === "completed" ? "line-through" : ""}`}
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
                          {config.label}
                        </span>
                        <span className="text-xs font-medium" style={{ color: '#60A5FA' }}>
                          {formatDueDate(task.dueDate!)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
