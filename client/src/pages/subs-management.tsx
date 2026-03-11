import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building,
  HardHat,
  ClipboardList,
  CheckCircle,
  LayoutTemplate,
  FolderOpen,
  Plus,
  Loader2,
  Calendar,
  AlertCircle,
  ChevronRight,
  LinkIcon,
  DollarSign,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

import { SubDirectory } from "@/components/subs/sub-directory";
import { ApprovalQueue } from "@/components/subs/approval-queue";
import { ReviewHistory } from "@/components/subs/review-history";
import { ChecklistTemplateManager } from "@/components/subs/checklist-template-manager";
import { SubTaskForm } from "@/components/subs/sub-task-form";
import { TaskDetailPanel } from "@/components/subs/task-detail-panel";
import { TaskChecklistPreview } from "@/components/subs/task-checklist-preview";
import { MilestoneManager } from "@/components/subs/milestone-manager";

interface Project {
  id: number | string;
  name: string;
  status?: string;
}

interface SubCompany {
  id: string;
  companyName: string;
  trade?: string;
  status?: string;
  performanceScore?: number;
}

interface SubProject {
  id: string;
  name: string;
  status?: string;
  assignmentId?: string;
  specialization?: string;
  assignmentStatus?: string;
  contractValue?: number;
}

interface SubTaskEntry {
  id: string;
  name: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status:
    | "not_started"
    | "in_progress"
    | "pending_review"
    | "revision_requested"
    | "approved"
    | "rejected";
  startDate?: string;
  endDate?: string;
  locationTag?: string;
  subcontractorName?: string;
  assignedUserName?: string;
  checklistItemsTotal: number;
  checklistItemsCompleted: number;
}

const statusConfig: Record<
  SubTaskEntry["status"],
  { labelKey: string; className: string }
> = {
  not_started: {
    labelKey: "status.notStarted",
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  },
  in_progress: {
    labelKey: "status.inProgress",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  pending_review: {
    labelKey: "status.pendingReview",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  revision_requested: {
    labelKey: "subs.revisionRequested",
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  approved: {
    labelKey: "status.approved",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  rejected: {
    labelKey: "status.rejected",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

const priorityConfig: Record<
  SubTaskEntry["priority"],
  { labelKey: string; className: string }
> = {
  low: {
    labelKey: "priority.low",
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  },
  medium: {
    labelKey: "priority.medium",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  high: {
    labelKey: "priority.high",
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  urgent: {
    labelKey: "subs.urgent",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

export default function SubsManagement() {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState<string>("directory");
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<SubTaskEntry | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Tasks tab cascading selection
  const [selectedSubCompany, setSelectedSubCompany] = useState<string>("");
  const [selectedSubProject, setSelectedSubProject] = useState<string>("");
  // Approvals tab project filter
  const [approvalProjectFilter, setApprovalProjectFilter] = useState<string>("all");
  // Assign project inline
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [assignProjectId, setAssignProjectId] = useState<string>("");
  // Contracts tab
  const [editingContractValue, setEditingContractValue] = useState(false);
  const [contractValueInput, setContractValueInput] = useState<string>("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (
      tabParam &&
      ["directory", "tasks", "approvals", "contracts", "templates"].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, []);

  // Fetch all projects (for approvals filter and assign-project)
  const { data: allProjects = [] } = useQuery<Project[]>({
    queryKey: ["/api/v1/projects"],
    queryFn: async () => {
      const res = await fetch("/api/v1/projects", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  // Fetch sub companies (for Tasks tab selector)
  const { data: subCompanies = [], isLoading: subsLoading } = useQuery<
    SubCompany[]
  >({
    queryKey: ["/api/v1/sub/companies"],
    queryFn: async () => {
      const res = await fetch("/api/v1/sub/companies", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch sub companies");
      return res.json();
    },
  });

  // Fetch projects assigned to the selected sub company
  const { data: subProjects = [], isLoading: subProjectsLoading } = useQuery<
    SubProject[]
  >({
    queryKey: ["/api/v1/sub/companies", selectedSubCompany, "projects"],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/sub/companies/${selectedSubCompany}/projects`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch sub projects");
      return res.json();
    },
    enabled: !!selectedSubCompany,
  });

  // Fetch tasks filtered by sub company + project
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<
    SubTaskEntry[]
  >({
    queryKey: [
      "/api/v1/sub/tasks",
      selectedSubProject,
      selectedSubCompany,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSubProject) params.set("projectId", selectedSubProject);
      const res = await fetch(`/api/v1/sub/tasks?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const allTasks = await res.json();
      // Client-side filter by selected sub company
      if (selectedSubCompany) {
        return allTasks.filter(
          (t: Record<string, string>) => t.assignedTo === selectedSubCompany
        );
      }
      return allTasks;
    },
    enabled: !!selectedSubProject,
  });

  // Assign project to sub mutation
  const assignProjectMutation = useMutation({
    mutationFn: async ({
      subId,
      projectId,
    }: {
      subId: string;
      projectId: string;
    }) => {
      const res = await fetch(
        `/api/v1/sub/companies/${subId}/assign-project`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ projectId }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to assign project");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "/api/v1/sub/companies",
          selectedSubCompany,
          "projects",
        ],
      });
      toast({ title: t('subs.projectAssigned') });
      // Auto-select the newly assigned project so task creation is immediately available
      setSelectedSubProject(variables.projectId);
      setShowAssignProject(false);
      setAssignProjectId("");
    },
    onError: (error: Error) => {
      toast({
        title: t('subs.assignmentFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateContractValueMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      contractValue,
    }: {
      assignmentId: string;
      contractValue: number;
    }) => {
      const res = await fetch(
        `/api/v1/sub/assignments/${assignmentId}/contract-value`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ contractValue }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update contract value");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/companies", selectedSubCompany, "projects"],
      });
      toast({ title: t('subs.contractValueUpdated') });
      setEditingContractValue(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('subs.updateFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset project and task selection when sub changes
  useEffect(() => {
    setSelectedSubProject("");
    setSelectedTaskId(null);
    setShowAssignProject(false);
  }, [selectedSubCompany]);

  // Reset task selection when project changes
  useEffect(() => {
    setSelectedTaskId(null);
  }, [selectedSubProject]);

  const selectedSubName =
    subCompanies.find((s) => s.id === selectedSubCompany)?.companyName || "";
  const selectedAssignment = subProjects.find(
    (p) => String(p.id) === selectedSubProject
  );
  const assignmentId = selectedAssignment?.assignmentId;
  const currentContractValue = selectedAssignment?.contractValue;

  const tabItems = [
    {
      value: "directory",
      label: t('subs.directory'),
      icon: FolderOpen,
      color: "text-[var(--pro-mint)]",
    },
    {
      value: "tasks",
      label: t('subs.taskBoard'),
      icon: ClipboardList,
      color: "text-blue-400",
    },
    {
      value: "approvals",
      label: t('subs.approvals'),
      icon: CheckCircle,
      color: "text-amber-400",
    },
    {
      value: "contracts",
      label: t('subs.contracts'),
      icon: DollarSign,
      color: "text-emerald-400",
    },
    {
      value: "templates",
      label: t('subs.templates'),
      icon: LayoutTemplate,
      color: "text-purple-400",
    },
  ];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Projects not yet assigned to the selected sub (for assign inline)
  const assignedProjectIds = new Set(subProjects.map((p) => String(p.id)));
  const unassignedProjects = allProjects.filter(
    (p) => !assignedProjectIds.has(String(p.id))
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-[var(--pro-bg)] min-h-screen">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <HardHat className="h-6 w-6 sm:h-7 sm:w-7 text-[var(--pro-mint)]" />
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--pro-text-primary)]">
            {t('subs.subsManagement')}
          </h1>
        </div>
        <p className="text-[var(--pro-text-secondary)] mt-1">
          {t('subs.manageSubcontractors')}
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-2 min-h-[44px]"
              >
                <Icon className={`h-4 w-4 ${tab.color}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Directory Tab */}
        <TabsContent value="directory">
          <SubDirectory
            onViewTasks={(subId) => {
              setSelectedSubCompany(subId);
              setActiveTab("tasks");
            }}
          />
        </TabsContent>

        {/* ============================================================ */}
        {/* Tasks Tab — Sub-first guided flow                            */}
        {/* ============================================================ */}
        <TabsContent value="tasks">
          {selectedTaskId ? (
            /* Task Detail View */
            <>
              <TaskDetailPanel
                taskId={selectedTaskId}
                projectId={selectedSubProject}
                onBack={() => setSelectedTaskId(null)}
                onEdit={() => {
                  const task = tasks.find((t) => t.id === selectedTaskId);
                  if (task) {
                    setEditingTask(task);
                    setTaskFormOpen(true);
                  }
                }}
              />
              <SubTaskForm
                open={taskFormOpen}
                onOpenChange={(open) => {
                  setTaskFormOpen(open);
                  if (!open) setEditingTask(null);
                }}
                projectId={selectedSubProject}
                prefilledAssignedTo={selectedSubCompany}
                editingTask={
                  editingTask
                    ? {
                        id: editingTask.id,
                        name: editingTask.name,
                        description: editingTask.description,
                        priority: editingTask.priority,
                        locationTag: editingTask.locationTag,
                        startDate: editingTask.startDate,
                        endDate: editingTask.endDate,
                        assignedTo: selectedSubCompany,
                      }
                    : null
                }
              />
            </>
          ) : (
            /* Task List View */
            <>
              <div className="space-y-4">
                {/* Step 1: Select Sub Company */}
                <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--pro-mint)]/20 text-[var(--pro-mint)] text-sm font-bold shrink-0">
                        1
                      </div>
                      <span className="font-medium text-[var(--pro-text-primary)]">
                        {t('subs.selectSubcontractor')}
                      </span>
                    </div>

                    {subsLoading ? (
                      <div className="flex items-center gap-2 text-[var(--pro-text-secondary)]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('subs.loading')}
                      </div>
                    ) : (
                      <Select
                        value={selectedSubCompany}
                        onValueChange={setSelectedSubCompany}
                      >
                        <SelectTrigger className="w-full">
                          <div className="flex items-center gap-2">
                            <HardHat className="h-4 w-4 shrink-0 text-[var(--pro-text-muted)]" />
                            <SelectValue placeholder={t('subs.chooseSubcontractor')} />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {subCompanies
                            .filter((s) => s.status === "active")
                            .map((sub) => (
                              <SelectItem key={sub.id} value={sub.id}>
                                <div className="flex items-center gap-2">
                                  <span>{sub.companyName}</span>
                                  {sub.trade && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-[var(--pro-mint)]/10 text-[var(--pro-mint)] border-[var(--pro-mint)]/30"
                                    >
                                      {sub.trade}
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Step 2: Select Project (only when sub is selected) */}
                    {selectedSubCompany && (
                      <>
                        <div className="flex items-center gap-3 pt-2">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold shrink-0">
                            2
                          </div>
                          <span className="font-medium text-[var(--pro-text-primary)]">
                            {t('subs.selectProject')}
                          </span>
                        </div>

                        {subProjectsLoading ? (
                          <div className="flex items-center gap-2 text-[var(--pro-text-secondary)]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('subs.loadingProjects')}
                          </div>
                        ) : subProjects.length > 0 ? (
                          <div className="space-y-2">
                            <Select
                              value={selectedSubProject}
                              onValueChange={setSelectedSubProject}
                            >
                              <SelectTrigger className="w-full">
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4 shrink-0 text-[var(--pro-text-muted)]" />
                                  <SelectValue placeholder={t('subs.chooseProject')} />
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {subProjects.map((p) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    <div className="flex items-center gap-2">
                                      <span>{p.name}</span>
                                      {p.status && (
                                        <Badge variant="outline" className="text-xs">
                                          {p.status}
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Option to assign to another project */}
                            {unassignedProjects.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setShowAssignProject(!showAssignProject)
                                }
                                className="text-[var(--pro-text-secondary)] hover:text-[var(--pro-mint)] gap-1.5"
                              >
                                <LinkIcon className="h-3.5 w-3.5" />
                                {t('subs.assignToAnotherProject')}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-[var(--pro-text-secondary)]">
                              {t('subs.notAssignedToProjects', { name: selectedSubName })}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAssignProject(true)}
                              className="gap-1.5"
                            >
                              <LinkIcon className="h-3.5 w-3.5" />
                              {t('subs.assignToProject')}
                            </Button>
                          </div>
                        )}

                        {/* Inline assign project */}
                        {showAssignProject && unassignedProjects.length > 0 && (
                          <div className="flex items-center gap-2 p-3 bg-[var(--pro-surface-highlight)] rounded-lg border border-[var(--pro-border)]">
                            <Select
                              value={assignProjectId}
                              onValueChange={setAssignProjectId}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder={t('subs.selectProjectToAssign')} />
                              </SelectTrigger>
                              <SelectContent>
                                {unassignedProjects.map((p) => (
                                  <SelectItem
                                    key={p.id}
                                    value={String(p.id)}
                                  >
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              disabled={
                                !assignProjectId ||
                                assignProjectMutation.isPending
                              }
                              onClick={() =>
                                assignProjectMutation.mutate({
                                  subId: selectedSubCompany,
                                  projectId: assignProjectId,
                                })
                              }
                            >
                              {assignProjectMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                t('subs.assign')
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowAssignProject(false);
                                setAssignProjectId("");
                              }}
                            >
                              {t('button.cancel')}
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Step 3: Create Task button */}
                    {selectedSubCompany && selectedSubProject && (
                      <div className="flex items-center gap-3 pt-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 text-sm font-bold shrink-0">
                          3
                        </div>
                        <Button
                          onClick={() => {
                            setEditingTask(null);
                            setTaskFormOpen(true);
                          }}
                          className="gap-1.5"
                        >
                          <Plus className="h-4 w-4" />
                          {t('subs.createTask')}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tasks List */}
                {selectedSubCompany && selectedSubProject ? (
                  tasksLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-[var(--pro-text-muted)]" />
                    </div>
                  ) : tasks.length === 0 ? (
                    <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
                      <CardContent className="text-center py-12">
                        <ClipboardList className="h-12 w-12 mx-auto text-[var(--pro-text-muted)] mb-3" />
                        <h3 className="text-lg font-semibold mb-1 text-[var(--pro-text-primary)]">
                          {t('subs.noTasksYet')}
                        </h3>
                        <p className="text-sm text-[var(--pro-text-secondary)] mb-4">
                          {t('subs.createTaskForSub', { name: selectedSubName })}
                        </p>
                        <Button
                          onClick={() => {
                            setEditingTask(null);
                            setTaskFormOpen(true);
                          }}
                          className="gap-1.5"
                        >
                          <Plus className="h-4 w-4" />
                          {t('subs.createFirstTask')}
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-[var(--pro-text-secondary)]">
                        {t('subs.taskCountForSub', { count: tasks.length })}{" "}
                        <span className="text-[var(--pro-text-primary)] font-medium">
                          {selectedSubName}
                        </span>
                      </p>
                      <div className="grid gap-3">
                        {tasks.map((task) => {
                          const status =
                            statusConfig[task.status] || statusConfig.not_started;
                          const priority =
                            priorityConfig[task.priority] || priorityConfig.medium;
                          const total = task.checklistItemsTotal || 0;
                          const completed = task.checklistItemsCompleted || 0;
                          const progress =
                            total > 0 ? Math.round((completed / total) * 100) : 0;
                          const isOverdue =
                            task.endDate &&
                            new Date(task.endDate) < new Date() &&
                            task.status !== "approved" &&
                            task.status !== "rejected";

                          return (
                            <Card
                              key={task.id}
                              className="bg-[var(--pro-surface)] border-[var(--pro-border)] hover:border-[var(--pro-mint)]/30 transition-colors cursor-pointer active:scale-[0.99]"
                              onClick={() => setSelectedTaskId(task.id)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                      <h3 className="font-semibold text-[var(--pro-text-primary)]">
                                        {task.name}
                                      </h3>
                                      <Badge
                                        variant="outline"
                                        className={priority.className}
                                      >
                                        {t(priority.labelKey)}
                                      </Badge>
                                      <Badge
                                        variant="outline"
                                        className={status.className}
                                      >
                                        {t(status.labelKey)}
                                      </Badge>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm flex-wrap">
                                      {task.locationTag && (
                                        <span className="text-[var(--pro-text-muted)]">
                                          {task.locationTag}
                                        </span>
                                      )}
                                      {task.endDate && (
                                        <div
                                          className={`flex items-center gap-1 ${
                                            isOverdue
                                              ? "text-red-400"
                                              : "text-[var(--pro-text-secondary)]"
                                          }`}
                                        >
                                          {isOverdue ? (
                                            <AlertCircle className="h-3.5 w-3.5" />
                                          ) : (
                                            <Calendar className="h-3.5 w-3.5" />
                                          )}
                                          <span>
                                            {isOverdue ? t('subs.overdue') + " " : t('subs.due') + " "}
                                            {formatDate(task.endDate)}
                                          </span>
                                        </div>
                                      )}
                                      {total > 0 && (
                                        <div className="flex items-center gap-2 text-[var(--pro-text-secondary)]">
                                          <div className="w-16 h-1.5 bg-[var(--pro-surface-highlight)] rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-[var(--pro-mint)] rounded-full transition-all"
                                              style={{ width: `${progress}%` }}
                                            />
                                          </div>
                                          <span className="text-xs">
                                            {completed}/{total}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <ChevronRight className="h-5 w-5 text-[var(--pro-text-muted)] shrink-0 mt-1" />
                                </div>
                                <TaskChecklistPreview taskId={task.id} />
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )
                ) : (
                  !selectedSubCompany && (
                    <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
                      <CardContent className="text-center py-12">
                        <HardHat className="h-12 w-12 mx-auto text-[var(--pro-text-muted)] mb-3" />
                        <h3 className="text-lg font-semibold mb-1 text-[var(--pro-text-primary)]">
                          {t('subs.selectSubToStart')}
                        </h3>
                        <p className="text-sm text-[var(--pro-text-secondary)]">
                          {t('subs.chooseSubAbove')}
                        </p>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>

              {/* Task Form Dialog */}
              <SubTaskForm
                open={taskFormOpen}
                onOpenChange={setTaskFormOpen}
                projectId={selectedSubProject}
                prefilledAssignedTo={selectedSubCompany}
                editingTask={null}
              />
            </>
          )}
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals">
          <div className="space-y-4">
            {/* Approvals project filter */}
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-[var(--pro-text-muted)]" />
              <Select
                value={approvalProjectFilter}
                onValueChange={setApprovalProjectFilter}
              >
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder={t('subs.filterByProject')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('subs.allProjects')}</SelectItem>
                  {allProjects.map((project) => (
                    <SelectItem
                      key={project.id}
                      value={String(project.id)}
                    >
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ApprovalQueue
              projectId={
                approvalProjectFilter !== "all"
                  ? approvalProjectFilter
                  : undefined
              }
            />
            <ReviewHistory
              projectId={
                approvalProjectFilter !== "all"
                  ? approvalProjectFilter
                  : undefined
              }
            />
          </div>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <div className="space-y-4">
            {/* Sub → Project selector */}
            <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--pro-mint)]/20 text-[var(--pro-mint)] text-sm font-bold shrink-0">
                    1
                  </div>
                  <span className="font-medium text-[var(--pro-text-primary)]">
                    {t('subs.selectSubcontractor')}
                  </span>
                </div>

                {subsLoading ? (
                  <div className="flex items-center gap-2 text-[var(--pro-text-secondary)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('subs.loading')}
                  </div>
                ) : (
                  <Select
                    value={selectedSubCompany}
                    onValueChange={setSelectedSubCompany}
                  >
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2">
                        <HardHat className="h-4 w-4 shrink-0 text-[var(--pro-text-muted)]" />
                        <SelectValue placeholder={t('subs.chooseSubcontractor')} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {subCompanies
                        .filter((s) => s.status === "active")
                        .map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            <div className="flex items-center gap-2">
                              <span>{sub.companyName}</span>
                              {sub.trade && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-[var(--pro-mint)]/10 text-[var(--pro-mint)] border-[var(--pro-mint)]/30"
                                >
                                  {sub.trade}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedSubCompany && (
                  <>
                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold shrink-0">
                        2
                      </div>
                      <span className="font-medium text-[var(--pro-text-primary)]">
                        {t('subs.selectProject')}
                      </span>
                    </div>

                    {subProjectsLoading ? (
                      <div className="flex items-center gap-2 text-[var(--pro-text-secondary)]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('subs.loadingProjects')}
                      </div>
                    ) : subProjects.length > 0 ? (
                      <Select
                        value={selectedSubProject}
                        onValueChange={setSelectedSubProject}
                      >
                        <SelectTrigger className="w-full">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 shrink-0 text-[var(--pro-text-muted)]" />
                            <SelectValue placeholder={t('subs.chooseProject')} />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {subProjects.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-[var(--pro-text-secondary)]">
                        {t('subs.notAssignedToProjects', { name: selectedSubName })}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Contract details (when sub + project selected) */}
            {selectedSubCompany && selectedSubProject && assignmentId && (
              <>
                {/* Contract Value Card */}
                <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-[var(--pro-text-secondary)] mb-1">
                          {t('subs.contractValue')}
                        </h3>
                        {editingContractValue ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--pro-text-muted)]" />
                              <Input
                                type="number"
                                value={contractValueInput}
                                onChange={(e) =>
                                  setContractValueInput(e.target.value)
                                }
                                className="w-44 pl-8"
                                placeholder="0"
                                min="0"
                                step="0.01"
                                autoFocus
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (assignmentId && contractValueInput) {
                                  updateContractValueMutation.mutate({
                                    assignmentId,
                                    contractValue: parseFloat(
                                      contractValueInput
                                    ),
                                  });
                                }
                              }}
                              disabled={
                                updateContractValueMutation.isPending ||
                                !contractValueInput
                              }
                            >
                              {updateContractValueMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                t('button.save')
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingContractValue(false)}
                            >
                              {t('button.cancel')}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold text-[var(--pro-text-primary)]">
                              {currentContractValue
                                ? new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(currentContractValue)
                                : t('subs.notSet')}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setContractValueInput(
                                  currentContractValue?.toString() || ""
                                );
                                setEditingContractValue(true);
                              }}
                              className="h-8 w-8 p-0 text-[var(--pro-text-muted)] hover:text-white"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Milestones */}
                <MilestoneManager
                  assignmentId={assignmentId}
                  projectId={selectedSubProject}
                />
              </>
            )}

            {/* Empty state */}
            {!selectedSubCompany && (
              <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
                <CardContent className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto text-[var(--pro-text-muted)] mb-3" />
                  <h3 className="text-lg font-semibold mb-1 text-[var(--pro-text-primary)]">
                    {t('subs.selectSubForContracts')}
                  </h3>
                  <p className="text-sm text-[var(--pro-text-secondary)]">
                    {t('subs.chooseSubForContracts')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <ChecklistTemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
