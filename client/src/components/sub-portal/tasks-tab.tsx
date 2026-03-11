import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ClipboardList, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TaskInlineCard } from "@/components/sub-portal/task-inline-card";

interface SubTask {
  id: string;
  name: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "not_started" | "in_progress" | "pending_review" | "revision_requested" | "approved" | "rejected";
  startDate?: string;
  endDate?: string;
  projectId: string;
  checklistItemsTotal: number;
  checklistItemsCompleted: number;
}

interface TasksTabProps {
  projectId: string;
}

export function TasksTab({ projectId }: TasksTabProps) {
  const { t } = useTranslation('subPortal');

  const { data: tasks = [], isLoading } = useQuery<SubTask[]>({
    queryKey: ["/api/v1/sub/my-tasks", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sub/my-tasks?projectId=${projectId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--pro-text-muted)]" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
        <CardContent className="text-center py-12">
          <ClipboardList className="h-16 w-16 mx-auto text-[var(--pro-text-muted)] mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-[var(--pro-text-primary)]">
            {t('tasks.noTasksTitle')}
          </h3>
          <p className="text-[var(--pro-text-secondary)]">
            {t('tasks.noTasksDesc')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--pro-text-primary)]">
          {t('tasks.myTasks')}
        </h2>
        <p className="text-[var(--pro-text-secondary)]">
          {t('tasks.tasksAssigned', { count: tasks.length })}
        </p>
      </div>

      <div className="grid gap-4">
        {tasks.map((task) => (
          <TaskInlineCard
            key={task.id}
            taskId={task.id}
            projectId={projectId}
            taskSummary={{
              id: task.id,
              name: task.name,
              priority: task.priority,
              status: task.status,
              endDate: task.endDate,
            }}
          />
        ))}
      </div>
    </div>
  );
}
