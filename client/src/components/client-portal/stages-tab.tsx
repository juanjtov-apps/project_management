import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Package,
  Clock,
  Check,
  Sparkles,
  Layers,
  ChevronRight,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProjectStage {
  id: string;
  projectId: string;
  orderIndex: number;
  name: string;
  status: "NOT_STARTED" | "ACTIVE" | "COMPLETE";
  plannedStartDate?: string;
  plannedEndDate?: string;
  finishMaterialsDueDate?: string;
  finishMaterialsNote?: string;
  materialAreaId?: string;
  materialAreaName?: string;
  materialCount: number;
  clientVisible: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface StagesTabProps {
  projectId: string;
}

const statusConfig = {
  NOT_STARTED: {
    label: "Upcoming",
    color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    dotColor: "bg-zinc-600",
    ringColor: "ring-zinc-500/20",
    icon: Clock,
  },
  ACTIVE: {
    label: "In Progress",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    dotColor: "bg-amber-500",
    ringColor: "ring-amber-500/30",
    icon: Sparkles,
  },
  COMPLETE: {
    label: "Completed",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    dotColor: "bg-emerald-500",
    ringColor: "ring-emerald-500/20",
    icon: Check,
  },
};

export function StagesTab({ projectId }: StagesTabProps) {
  // Fetch stages (API automatically filters to visible-only for clients)
  const { data: stages = [], isLoading } = useQuery<ProjectStage[]>({
    queryKey: [`/api/v1/stages?projectId=${projectId}`],
    enabled: !!projectId,
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateShort = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntil = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff;
  };

  // Calculate progress
  const completedStages = stages.filter((s) => s.status === "COMPLETE").length;
  const progressPercent =
    stages.length > 0 ? (completedStages / stages.length) * 100 : 0;
  const activeStage = stages.find((s) => s.status === "ACTIVE");
  const nextStage = stages.find((s) => s.status === "NOT_STARTED");

  // Find next material due date
  const upcomingMaterialsDue = stages
    .filter(
      (s) =>
        s.finishMaterialsDueDate &&
        s.status !== "COMPLETE" &&
        getDaysUntil(s.finishMaterialsDueDate)! >= 0
    )
    .sort(
      (a, b) =>
        new Date(a.finishMaterialsDueDate!).getTime() -
        new Date(b.finishMaterialsDueDate!).getTime()
    )[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--pro-orange)]" />
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <Layers className="h-8 w-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-[var(--pro-text-primary)] mb-2">
            No Stages Available
          </h3>
          <p className="text-[var(--pro-text-secondary)] max-w-md mx-auto">
            Your project manager hasn't set up stages for this project yet.
            Check back soon for your project timeline!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/50">
        {/* Decorative Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20">
                <Layers className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Project Timeline
                </h2>
                <p className="text-sm text-zinc-400">
                  {completedStages} of {stages.length} stages complete
                </p>
              </div>
            </div>

            {/* Progress Circle */}
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-zinc-800"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  className="text-amber-500"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercent / 100)}`}
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {Math.round(progressPercent)}%
                </span>
              </div>
            </div>
          </div>

          {/* Current/Next Stage Highlight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeStage && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">
                    Currently Active
                  </span>
                </div>
                <p className="text-white font-semibold">{activeStage.name}</p>
                {activeStage.plannedEndDate && (
                  <p className="text-sm text-zinc-400 mt-1">
                    Expected completion:{" "}
                    {formatDateShort(activeStage.plannedEndDate)}
                  </p>
                )}
              </div>
            )}

            {upcomingMaterialsDue && (
              <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-rose-400" />
                  <span className="text-sm font-medium text-rose-400">
                    Materials Due Soon
                  </span>
                </div>
                <p className="text-white font-semibold">
                  {upcomingMaterialsDue.name}
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  Materials due{" "}
                  {formatDateShort(upcomingMaterialsDue.finishMaterialsDueDate)}
                  {(() => {
                    const days = getDaysUntil(
                      upcomingMaterialsDue.finishMaterialsDueDate
                    );
                    if (days === 0) return " (today!)";
                    if (days === 1) return " (tomorrow)";
                    if (days && days <= 7) return ` (${days} days left)`;
                    return "";
                  })()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Main Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 via-amber-500 to-zinc-700" />

        <div className="space-y-0">
          {stages
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((stage, index) => {
              const config = statusConfig[stage.status];
              const StatusIcon = config.icon;
              const isActive = stage.status === "ACTIVE";
              const isComplete = stage.status === "COMPLETE";
              const daysUntilMaterials = getDaysUntil(
                stage.finishMaterialsDueDate
              );
              const isMaterialsOverdue =
                daysUntilMaterials !== null &&
                daysUntilMaterials < 0 &&
                !isComplete;
              const isMaterialsSoon =
                daysUntilMaterials !== null &&
                daysUntilMaterials >= 0 &&
                daysUntilMaterials <= 7 &&
                !isComplete;

              return (
                <div
                  key={stage.id}
                  className={`relative pl-20 pb-8 ${index === stages.length - 1 ? "pb-0" : ""}`}
                >
                  {/* Timeline Node */}
                  <div
                    className={`absolute left-5 top-1 w-7 h-7 rounded-full border-4 border-zinc-900 ${config.dotColor} flex items-center justify-center transition-all duration-300 ${
                      isActive ? "ring-4 " + config.ringColor + " scale-110" : ""
                    }`}
                  >
                    {isComplete && <Check className="h-3 w-3 text-white" />}
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    )}
                  </div>

                  {/* Stage Card */}
                  <Card
                    className={`bg-zinc-900/60 border-zinc-700/50 overflow-hidden transition-all duration-200 ${
                      isActive
                        ? "border-amber-500/30 shadow-lg shadow-amber-500/5"
                        : ""
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge
                              variant="outline"
                              className={`${config.color} border`}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                            {isActive && (
                              <span className="text-xs text-amber-400 font-medium">
                                You are here
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-semibold text-white mb-2">
                            {stage.name}
                          </h3>

                          {/* Date Range */}
                          {(stage.plannedStartDate || stage.plannedEndDate) && (
                            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
                              <Calendar className="h-4 w-4" />
                              {stage.plannedStartDate &&
                                formatDateShort(stage.plannedStartDate)}
                              {stage.plannedStartDate &&
                                stage.plannedEndDate &&
                                " → "}
                              {stage.plannedEndDate &&
                                formatDateShort(stage.plannedEndDate)}
                            </div>
                          )}

                          {/* Materials Due Alert */}
                          {stage.finishMaterialsDueDate && !isComplete && (
                            <div
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                isMaterialsOverdue
                                  ? "bg-red-500/10 border border-red-500/20 text-red-400"
                                  : isMaterialsSoon
                                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                                    : "bg-zinc-800/50 border border-zinc-700 text-zinc-400"
                              }`}
                            >
                              {isMaterialsOverdue ? (
                                <AlertTriangle className="h-4 w-4" />
                              ) : (
                                <CalendarClock className="h-4 w-4" />
                              )}
                              <span>
                                <span className="font-medium">
                                  Finish materials due:
                                </span>{" "}
                                {formatDate(stage.finishMaterialsDueDate)}
                                {isMaterialsOverdue && (
                                  <span className="ml-1 font-semibold">
                                    (overdue!)
                                  </span>
                                )}
                                {isMaterialsSoon &&
                                  daysUntilMaterials === 0 && (
                                    <span className="ml-1 font-semibold">
                                      (today!)
                                    </span>
                                  )}
                                {isMaterialsSoon &&
                                  daysUntilMaterials === 1 && (
                                    <span className="ml-1">(tomorrow)</span>
                                  )}
                                {isMaterialsSoon &&
                                  daysUntilMaterials &&
                                  daysUntilMaterials > 1 && (
                                    <span className="ml-1">
                                      ({daysUntilMaterials} days)
                                    </span>
                                  )}
                              </span>
                            </div>
                          )}

                          {/* Materials Note */}
                          {stage.finishMaterialsNote && (
                            <div className="mt-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                              <div className="flex items-start gap-2">
                                <Package className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-zinc-400">
                                  {stage.finishMaterialsNote}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Stage Number */}
                        <div className="text-right">
                          <span
                            className={`text-4xl font-bold ${isComplete ? "text-emerald-500/30" : isActive ? "text-amber-500/30" : "text-zinc-700"}`}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
