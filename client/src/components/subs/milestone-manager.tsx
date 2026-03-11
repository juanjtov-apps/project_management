import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Plus,
  Pencil,
  CheckCircle,
  Clock,
  TrendingUp,
  ShieldCheck,
  LinkIcon,
  Loader2,
  CalendarCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Milestone {
  id: string;
  assignmentId: string;
  name: string;
  description?: string;
  amount: number;
  retentionPct: number;
  milestoneType: "fixed" | "percentage" | "task_completion";
  status: "pending" | "payable" | "approved" | "paid";
  linkedTaskIds: string[];
  linkedTaskNames?: string[];
  paidDate?: string;
  approvedDate?: string;
  createdAt: string;
}

interface SubTask {
  id: string;
  name: string;
}

interface MilestoneFormData {
  name: string;
  description: string;
  amount: string;
  retentionPct: string;
  milestoneType: string;
  linkedTaskIds: string[];
}

interface MilestoneManagerProps {
  assignmentId: string;
  projectId?: string;
}

const milestoneStatusConfig: Record<
  Milestone["status"],
  { labelKey: string; className: string; icon: typeof Clock }
> = {
  pending: {
    labelKey: "status.pending",
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    icon: Clock,
  },
  payable: {
    labelKey: "subs.payable",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: TrendingUp,
  },
  approved: {
    labelKey: "status.approved",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: ShieldCheck,
  },
  paid: {
    labelKey: "subs.paid",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle,
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const emptyForm: MilestoneFormData = {
  name: "",
  description: "",
  amount: "",
  retentionPct: "10",
  milestoneType: "fixed",
  linkedTaskIds: [],
};

export function MilestoneManager({
  assignmentId,
  projectId,
}: MilestoneManagerProps) {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(
    null
  );
  const [form, setForm] = useState<MilestoneFormData>(emptyForm);

  const { data: milestones = [], isLoading } = useQuery<Milestone[]>({
    queryKey: ["/api/v1/sub/assignments", assignmentId, "milestones"],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/sub/assignments/${assignmentId}/milestones`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch milestones");
      return res.json();
    },
    enabled: !!assignmentId,
  });

  // Fetch tasks for linking
  const { data: tasks = [] } = useQuery<SubTask[]>({
    queryKey: ["/api/v1/sub/tasks", "for-milestones", assignmentId],
    queryFn: async () => {
      const url = projectId
        ? `/api/v1/sub/tasks?projectId=${projectId}`
        : `/api/v1/sub/tasks`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!assignmentId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: MilestoneFormData) => {
      const res = await fetch(
        `/api/v1/sub/assignments/${assignmentId}/milestones`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: data.name,
            description: data.description || undefined,
            amount: parseFloat(data.amount),
            retentionPct: parseFloat(data.retentionPct),
            milestoneType: data.milestoneType,
            linkedTaskIds:
              data.linkedTaskIds.length > 0 ? data.linkedTaskIds : undefined,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create milestone");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/assignments", assignmentId, "milestones"],
      });
      toast({ title: t('subs.milestoneCreated') });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: t('subs.failedCreateMilestone'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: MilestoneFormData;
    }) => {
      const res = await fetch(`/api/v1/sub/milestones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          amount: parseFloat(data.amount),
          retentionPct: parseFloat(data.retentionPct),
          milestoneType: data.milestoneType,
          linkedTaskIds:
            data.linkedTaskIds.length > 0 ? data.linkedTaskIds : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update milestone");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/assignments", assignmentId, "milestones"],
      });
      toast({ title: t('subs.milestoneUpdated') });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: t('subs.failedUpdateMilestone'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      const res = await fetch(
        `/api/v1/sub/milestones/${milestoneId}/mark-paid`,
        {
          method: "PUT",
          credentials: "include",
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to mark as paid");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/assignments", assignmentId, "milestones"],
      });
      toast({ title: t('subs.milestoneMarkedPaid') });
    },
    onError: (error: Error) => {
      toast({
        title: t('subs.failedMarkPaid'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function openCreateDialog() {
    setEditingMilestone(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(milestone: Milestone) {
    setEditingMilestone(milestone);
    setForm({
      name: milestone.name,
      description: milestone.description || "",
      amount: milestone.amount.toString(),
      retentionPct: milestone.retentionPct.toString(),
      milestoneType: milestone.milestoneType,
      linkedTaskIds: milestone.linkedTaskIds || [],
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingMilestone(null);
    setForm(emptyForm);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.amount) return;
    if (editingMilestone) {
      updateMutation.mutate({ id: editingMilestone.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function toggleLinkedTask(taskId: string) {
    setForm((prev) => ({
      ...prev,
      linkedTaskIds: prev.linkedTaskIds.includes(taskId)
        ? prev.linkedTaskIds.filter((id) => id !== taskId)
        : [...prev.linkedTaskIds, taskId],
    }));
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
  const paidAmount = milestones
    .filter((m) => m.status === "paid")
    .reduce((sum, m) => sum + m.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--pro-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--pro-text-primary)] flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[var(--pro-mint)]" />
            {t('subs.milestones')}
          </h3>
          {milestones.length > 0 && (
            <p className="text-sm text-[var(--pro-text-secondary)]">
              {t('subs.paidOfTotal', { paid: formatCurrency(paidAmount), total: formatCurrency(totalAmount) })}
            </p>
          )}
        </div>
        <Button size="sm" onClick={openCreateDialog} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t('subs.addMilestone')}</span>
        </Button>
      </div>

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
          <CardContent className="text-center py-8">
            <DollarSign className="h-10 w-10 mx-auto text-[var(--pro-text-muted)] mb-2" />
            <p className="text-sm text-[var(--pro-text-secondary)]">
              {t('subs.noMilestonesYet')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {milestones.map((milestone) => {
            const config =
              milestoneStatusConfig[milestone.status] ||
              milestoneStatusConfig.pending;
            const StatusIcon = config.icon;
            const canMarkPaid =
              milestone.status === "approved" ||
              milestone.status === "payable";

            return (
              <Card
                key={milestone.id}
                className="bg-[var(--pro-surface)] border-[var(--pro-border)]"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-medium text-[var(--pro-text-primary)]">
                          {milestone.name}
                        </h4>
                        <Badge variant="outline" className={config.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {t(config.labelKey)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        >
                          {milestone.milestoneType}
                        </Badge>
                      </div>

                      {milestone.description && (
                        <p className="text-sm text-[var(--pro-text-secondary)] mb-2">
                          {milestone.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-[var(--pro-text-muted)] flex-wrap">
                        {milestone.retentionPct > 0 && (
                          <span>{t('subs.retention', { pct: milestone.retentionPct })}</span>
                        )}
                        {milestone.linkedTaskNames &&
                          milestone.linkedTaskNames.length > 0 && (
                            <div className="flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" />
                              <span>
                                {t('subs.linkedTaskCount', { count: milestone.linkedTaskNames.length })}
                              </span>
                            </div>
                          )}
                        {milestone.paidDate && (
                          <div className="flex items-center gap-1 text-emerald-400">
                            <CalendarCheck className="h-3 w-3" />
                            <span>
                              {t('subs.paidOn', {
                                date: new Date(
                                  milestone.paidDate
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                }),
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-lg font-bold text-[var(--pro-text-primary)]">
                        {formatCurrency(milestone.amount)}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(milestone)}
                          className="h-8 w-8 p-0 text-[var(--pro-text-muted)] hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {canMarkPaid && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              markPaidMutation.mutate(milestone.id)
                            }
                            disabled={markPaidMutation.isPending}
                            className="h-8 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          >
                            {markPaidMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              t('subs.markPaid')
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingMilestone ? t('subs.editMilestone') : t('subs.createMilestone')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ms-name">{t('subs.milestoneNameLabel')}</Label>
              <Input
                id="ms-name"
                placeholder={t('subs.egFoundationComplete')}
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ms-desc">{t('subs.milestoneDescLabel')}</Label>
              <Textarea
                id="ms-desc"
                placeholder={t('subs.describeMilestone')}
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ms-amount">{t('subs.milestoneAmount')}</Label>
                <Input
                  id="ms-amount"
                  type="number"
                  placeholder="5000"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ms-retention">{t('subs.milestoneRetention')}</Label>
                <Input
                  id="ms-retention"
                  type="number"
                  placeholder="10"
                  min="0"
                  max="100"
                  value={form.retentionPct}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      retentionPct: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('subs.milestoneType')}</Label>
              <Select
                value={form.milestoneType}
                onValueChange={(val) =>
                  setForm((prev) => ({ ...prev, milestoneType: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{t('subs.fixedAmount')}</SelectItem>
                  <SelectItem value="percentage">
                    {t('subs.percentageOfContract')}
                  </SelectItem>
                  <SelectItem value="task_completion">
                    {t('subs.taskCompletion')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Linked Tasks Multi-Select */}
            {tasks.length > 0 && (
              <div className="space-y-1.5">
                <Label>{t('subs.linkedTasks')}</Label>
                <div className="max-h-32 overflow-y-auto border border-[var(--pro-border)] rounded-lg p-2 space-y-1">
                  {tasks.map((task) => (
                    <label
                      key={task.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-[var(--pro-surface-highlight)] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.linkedTaskIds.includes(task.id)}
                        onChange={() => toggleLinkedTask(task.id)}
                        className="rounded border-[var(--pro-border)]"
                      />
                      <span className="text-sm text-[var(--pro-text-primary)] truncate">
                        {task.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t('button.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !form.name.trim() || !form.amount}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('subs.saving')}
                </>
              ) : editingMilestone ? (
                t('subs.updateMilestone')
              ) : (
                t('subs.createMilestone')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
