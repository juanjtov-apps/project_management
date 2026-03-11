import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  Sun,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScheduleTask {
  id: string;
  name: string;
  status: "not_started" | "in_progress" | "pending_review" | "revision_requested" | "approved" | "rejected";
  priority: "low" | "medium" | "high" | "urgent";
  startDate?: string;
  endDate?: string;
  location?: string;
  checklistItemsTotal: number;
  checklistItemsCompleted: number;
}

interface ScheduleTabProps {
  projectId: string;
}

const statusOrder: ScheduleTask["status"][] = [
  "in_progress",
  "revision_requested",
  "not_started",
  "pending_review",
  "approved",
  "rejected",
];

export function ScheduleTab({ projectId }: ScheduleTabProps) {
  const { t } = useTranslation('subPortal');

  const statusConfig: Record<
    ScheduleTask["status"],
    { label: string; className: string; barColor: string; icon: typeof Clock }
  > = {
    not_started: {
      label: t('status.not_started'),
      className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
      barColor: "bg-zinc-500",
      icon: Clock,
    },
    in_progress: {
      label: t('status.in_progress'),
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      barColor: "bg-blue-500",
      icon: AlertCircle,
    },
    pending_review: {
      label: t('status.pending_review'),
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      barColor: "bg-amber-500",
      icon: Clock,
    },
    revision_requested: {
      label: t('status.revision_requested'),
      className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      barColor: "bg-orange-500",
      icon: AlertCircle,
    },
    approved: {
      label: t('status.approved'),
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      barColor: "bg-emerald-500",
      icon: CheckCircle,
    },
    rejected: {
      label: t('status.rejected'),
      className: "bg-red-500/20 text-red-400 border-red-500/30",
      barColor: "bg-red-500",
      icon: AlertCircle,
    },
  };

  const { data: tasks = [], isLoading } = useQuery<ScheduleTask[]>({
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return t('schedule.tbd');
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

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
          <CalendarDays className="h-16 w-16 mx-auto text-[var(--pro-text-muted)] mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-[var(--pro-text-primary)]">
            {t('schedule.noScheduleData')}
          </h3>
          <p className="text-[var(--pro-text-secondary)]">
            {t('schedule.noTasksAssigned')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Filter today's tasks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const todaysTasks = tasks.filter((task) => {
    if (task.status === "approved" || task.status === "rejected") return false;
    if (!task.startDate && !task.endDate) return false;

    const start = task.startDate ? new Date(task.startDate) : null;
    const end = task.endDate ? new Date(task.endDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    // Task is "today" if today falls within its date range, or if end date is today
    if (start && end) {
      return start <= todayEnd && end >= today;
    }
    if (end) {
      return end >= today && end <= todayEnd;
    }
    if (start) {
      return start <= todayEnd && start >= today;
    }
    return false;
  });

  // Group remaining tasks by status
  const groupedByStatus = statusOrder
    .map((status) => ({
      status,
      config: statusConfig[status],
      tasks: tasks.filter((t) => t.status === status),
    }))
    .filter((group) => group.tasks.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--pro-text-primary)]">
          {t('schedule.title')}
        </h2>
        <p className="text-[var(--pro-text-secondary)]">
          {t('schedule.subtitle')}
        </p>
      </div>

      {/* Today's Tasks */}
      {todaysTasks.length > 0 && (
        <Card className="bg-[var(--pro-surface)] border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-400">
              <Sun className="h-5 w-5" />
              {t('schedule.todaysTasks')}
              <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 ml-1">
                {todaysTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todaysTasks.map((task) => {
              const config = statusConfig[task.status] || statusConfig.not_started;
              const isOverdue =
                task.endDate &&
                new Date(task.endDate) < new Date() &&
                task.status !== "approved" &&
                task.status !== "rejected";
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg bg-[var(--pro-surface-highlight)] p-3 border border-[var(--pro-border)]"
                >
                  <div className={`w-1 h-10 rounded-full ${config.barColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--pro-text-primary)] truncate text-sm">
                      {task.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                      <Badge variant="outline" className={`text-xs ${config.className}`}>
                        {config.label}
                      </Badge>
                      {task.endDate && (
                        <span
                          className={
                            isOverdue
                              ? "text-red-400"
                              : "text-[var(--pro-text-muted)]"
                          }
                        >
                          {t('schedule.due', { date: formatDate(task.endDate) })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Tasks grouped by status */}
      {groupedByStatus.map((group) => {
        const StatusIcon = group.config.icon;
        return (
          <div key={group.status} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${group.config.barColor}`} />
              <h3 className="text-sm font-semibold text-[var(--pro-text-secondary)] uppercase tracking-wider">
                {group.config.label}
              </h3>
              <span className="text-xs text-[var(--pro-text-muted)]">
                ({group.tasks.length})
              </span>
            </div>

            <div className="space-y-2 ml-4 border-l-2 border-[var(--pro-border)] pl-4">
              {group.tasks.map((task) => {
                const isOverdue =
                  task.endDate &&
                  new Date(task.endDate) < new Date() &&
                  task.status !== "approved" &&
                  task.status !== "rejected";
                const progress =
                  task.checklistItemsTotal > 0
                    ? Math.round(
                        (task.checklistItemsCompleted /
                          task.checklistItemsTotal) *
                          100
                      )
                    : 0;

                return (
                  <Card
                    key={task.id}
                    className="bg-[var(--pro-surface)] border-[var(--pro-border)]"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--pro-text-primary)] text-sm">
                            {task.name}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--pro-text-secondary)]">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {formatDate(task.startDate)} -{" "}
                                {formatDate(task.endDate)}
                              </span>
                            </div>
                            {task.location && (
                              <span className="text-[var(--pro-text-muted)]">
                                {task.location}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {isOverdue && (
                            <Badge
                              variant="outline"
                              className="bg-red-500/20 text-red-400 border-red-500/30 text-xs"
                            >
                              {t('schedule.overdue')}
                            </Badge>
                          )}
                          {task.checklistItemsTotal > 0 && (
                            <span className="text-xs text-[var(--pro-text-muted)]">
                              {progress}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      {task.checklistItemsTotal > 0 && (
                        <div className="mt-2 w-full h-1 bg-[var(--pro-surface-highlight)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${group.config.barColor}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
