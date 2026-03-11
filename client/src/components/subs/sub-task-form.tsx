import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  X,
  Loader2,
  ClipboardList,
  CalendarDays,
  GripVertical,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const taskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  locationTag: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  assignedTo: z.string().min(1, "Assign to a sub company"),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface ChecklistItemDraft {
  description: string;
  itemType: "standard" | "doc_required" | "inspection";
}

interface ChecklistDraft {
  name: string;
  items: ChecklistItemDraft[];
}

interface SubCompany {
  id: string;
  companyName: string;
  trade?: string;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  tradeCategory?: string;
  items: Array<{ description: string; itemType: string }>;
}

interface Milestone {
  id: string;
  name: string;
  amount?: number;
  status: string;
}

interface SubProject {
  id: string;
  name: string;
  assignmentId?: string;
}

interface ExistingTask {
  id: string;
  name: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  locationTag?: string;
  startDate?: string;
  endDate?: string;
  assignedTo: string;
}

interface SubTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  prefilledAssignedTo?: string;
  editingTask?: ExistingTask | null;
}

const itemTypeKeys: Record<ChecklistItemDraft["itemType"], string> = {
  standard: "subs.standard",
  doc_required: "subs.docRequired",
  inspection: "subs.inspection",
};

const itemTypeBadgeClass: Record<ChecklistItemDraft["itemType"], string> = {
  standard: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  doc_required: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  inspection: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export function SubTaskForm({
  open,
  onOpenChange,
  projectId,
  prefilledAssignedTo,
  editingTask,
}: SubTaskFormProps) {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!editingTask;

  // Milestone state
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("");

  // Checklist state
  const [checklists, setChecklists] = useState<ChecklistDraft[]>([]);
  const [newChecklistName, setNewChecklistName] = useState("");
  const [newItemDescs, setNewItemDescs] = useState<Record<number, string>>({});
  const [newItemTypes, setNewItemTypes] = useState<
    Record<number, ChecklistItemDraft["itemType"]>
  >({});

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: "",
      description: "",
      priority: "medium",
      locationTag: "",
      startDate: "",
      endDate: "",
      assignedTo: "",
    },
  });

  // Reset form when dialog opens or editing task changes
  useEffect(() => {
    if (open) {
      if (editingTask) {
        form.reset({
          name: editingTask.name,
          description: editingTask.description || "",
          priority: editingTask.priority,
          locationTag: editingTask.locationTag || "",
          startDate: editingTask.startDate
            ? editingTask.startDate.split("T")[0]
            : "",
          endDate: editingTask.endDate
            ? editingTask.endDate.split("T")[0]
            : "",
          assignedTo: editingTask.assignedTo || "",
        });
        // Don't reset checklists on edit -- they come from the existing task
        setChecklists([]);
        setSelectedMilestoneId("");
      } else {
        form.reset({
          name: "",
          description: "",
          priority: "medium",
          locationTag: "",
          startDate: "",
          endDate: "",
          assignedTo: prefilledAssignedTo || "",
        });
        setChecklists([]);
        setSelectedMilestoneId("");
      }
    }
  }, [open, editingTask, form, prefilledAssignedTo]);

  // Fetch sub companies
  const { data: subCompanies = [] } = useQuery<SubCompany[]>({
    queryKey: ["/api/v1/sub/companies"],
    queryFn: async () => {
      const res = await fetch("/api/v1/sub/companies", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  // Fetch templates
  const { data: templates = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ["/api/v1/sub/templates"],
    queryFn: async () => {
      const res = await fetch("/api/v1/sub/templates", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  // Fetch sub projects to get assignmentId for milestone query
  const assignedTo = form.watch("assignedTo");
  const { data: subProjects = [] } = useQuery<SubProject[]>({
    queryKey: ["/api/v1/sub/companies", assignedTo, "projects"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sub/companies/${assignedTo}/projects`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!assignedTo && open && !isEditing,
  });

  const assignmentId = subProjects.find((p) => String(p.id) === projectId)?.assignmentId;

  // Fetch milestones for the assignment
  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ["/api/v1/sub/assignments", assignmentId, "milestones"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sub/assignments/${assignmentId}/milestones`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!assignmentId && open && !isEditing,
  });

  const createMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const body = {
        ...data,
        projectId,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        locationTag: data.locationTag || undefined,
        milestoneId: selectedMilestoneId || undefined,
      };

      const res = await fetch("/api/v1/sub/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create task");
      }
      return res.json();
    },
    onSuccess: async (taskData) => {
      // Create checklists if any
      for (const checklist of checklists) {
        if (checklist.items.length === 0) continue;
        try {
          await fetch(`/api/v1/sub/tasks/${taskData.id}/checklists`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: checklist.name,
              items: checklist.items,
            }),
          });
        } catch {
          // Checklist creation failed but task was created
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/v1/sub/tasks"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/reviews/queue"],
      });
      toast({ title: t('subs.taskCreated') });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('subs.failedCreateTask'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const body = {
        ...data,
        projectId,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        locationTag: data.locationTag || undefined,
      };

      const res = await fetch(`/api/v1/sub/tasks/${editingTask!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update task");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/sub/tasks"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/reviews/queue"],
      });
      toast({ title: t('subs.taskUpdated') });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('subs.failedUpdateTask'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function addChecklist() {
    if (!newChecklistName.trim()) return;
    setChecklists((prev) => [
      ...prev,
      { name: newChecklistName.trim(), items: [] },
    ]);
    setNewChecklistName("");
  }

  function removeChecklist(index: number) {
    setChecklists((prev) => prev.filter((_, i) => i !== index));
    setNewItemDescs((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setNewItemTypes((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  function addItemToChecklist(checklistIndex: number) {
    const desc = newItemDescs[checklistIndex]?.trim();
    if (!desc) return;
    const itemType = newItemTypes[checklistIndex] || "standard";

    setChecklists((prev) =>
      prev.map((cl, i) =>
        i === checklistIndex
          ? { ...cl, items: [...cl.items, { description: desc, itemType }] }
          : cl
      )
    );
    setNewItemDescs((prev) => ({ ...prev, [checklistIndex]: "" }));
    setNewItemTypes((prev) => ({ ...prev, [checklistIndex]: "standard" }));
  }

  function removeItemFromChecklist(
    checklistIndex: number,
    itemIndex: number
  ) {
    setChecklists((prev) =>
      prev.map((cl, i) =>
        i === checklistIndex
          ? { ...cl, items: cl.items.filter((_, j) => j !== itemIndex) }
          : cl
      )
    );
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setChecklists((prev) => [
      ...prev,
      {
        name: template.name,
        items: template.items.map((item) => ({
          description: item.description,
          itemType: item.itemType as ChecklistItemDraft["itemType"],
        })),
      },
    ]);
    toast({ title: t('subs.templateApplied', { name: template.name }) });
  }

  function onSubmit(data: TaskFormData) {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('subs.editSubTask') : t('subs.createSubTask')}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* Task Name */}
          <div className="space-y-1.5">
            <Label htmlFor="task-name">{t('subs.taskName')}</Label>
            <Input
              id="task-name"
              placeholder={t('subs.egInstallPanels')}
              {...form.register("name")}
              className={
                form.formState.errors.name ? "border-red-500" : ""
              }
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">{t('subs.description')}</Label>
            <Textarea
              id="task-desc"
              placeholder={t('subs.briefDescription')}
              rows={3}
              {...form.register("description")}
            />
          </div>

          {/* Priority & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('table.priority')}</Label>
              <Controller
                name="priority"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('priority.low')}</SelectItem>
                      <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                      <SelectItem value="high">{t('priority.high')}</SelectItem>
                      <SelectItem value="urgent">{t('subs.urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-location">{t('subs.locationTag')}</Label>
              <Input
                id="task-location"
                placeholder={t('subs.egBuildingAFloor2')}
                {...form.register("locationTag")}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-start">
                <CalendarDays className="h-3.5 w-3.5 inline mr-1" />
                {t('subs.startDate')}
              </Label>
              <Input
                id="task-start"
                type="date"
                {...form.register("startDate")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-end">
                <CalendarDays className="h-3.5 w-3.5 inline mr-1" />
                {t('subs.endDate')}
              </Label>
              <Input
                id="task-end"
                type="date"
                {...form.register("endDate")}
              />
            </div>
          </div>

          {/* Assignment */}
          <div className="space-y-1.5">
            <Label>{t('subs.assignToSubCompany')}</Label>
            <Controller
              name="assignedTo"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!!prefilledAssignedTo}
                >
                  <SelectTrigger
                    className={
                      form.formState.errors.assignedTo
                        ? "border-red-500"
                        : ""
                    }
                  >
                    <SelectValue placeholder={t('subs.selectSubCompany')} />
                  </SelectTrigger>
                  <SelectContent>
                    {subCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        <span>{company.companyName}</span>
                        {company.trade && (
                          <span className="text-[var(--pro-text-muted)] ml-1">
                            ({company.trade})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.assignedTo && (
              <p className="text-xs text-red-500">
                {form.formState.errors.assignedTo.message}
              </p>
            )}
          </div>

          {/* Payment Milestone (optional, only for creation) */}
          {!isEditing && milestones.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t('subs.linkToMilestone')}</Label>
              <Select
                value={selectedMilestoneId || "none"}
                onValueChange={(val) => setSelectedMilestoneId(val === "none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('subs.noMilestone')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('subs.noMilestone')}</SelectItem>
                  {milestones
                    .filter((m) => m.status === "pending")
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                        {m.amount ? ` ($${Number(m.amount).toLocaleString()})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Checklists Section (only for creation) */}
          {!isEditing && (
            <div className="space-y-3 pt-2 border-t border-[var(--pro-border)]">
              <div className="flex items-center justify-between">
                <Label className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[var(--pro-mint)]" />
                  {t('subs.checklists')}
                </Label>

                {/* Apply Template */}
                {templates.length > 0 && (
                  <Select onValueChange={applyTemplate}>
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <SelectValue placeholder={t('subs.applyTemplate')} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name} ({tpl.items.length} {t('subs.items')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Add Checklist */}
              <div className="flex gap-2">
                <Input
                  placeholder={t('subs.checklistName')}
                  value={newChecklistName}
                  onChange={(e) => setNewChecklistName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChecklist();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addChecklist}
                  disabled={!newChecklistName.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Checklist List */}
              {checklists.map((checklist, clIdx) => (
                <div
                  key={clIdx}
                  className="border border-[var(--pro-border)] rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-[var(--pro-text-primary)]">
                      {checklist.name}
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChecklist(clIdx)}
                      className="h-6 w-6 p-0 text-[var(--pro-text-muted)] hover:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Items */}
                  {checklist.items.length > 0 && (
                    <div className="space-y-1">
                      {checklist.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="flex items-center gap-2 p-1.5 rounded bg-[var(--pro-bg)]"
                        >
                          <GripVertical className="h-3 w-3 text-[var(--pro-text-muted)] shrink-0" />
                          <span className="text-sm text-[var(--pro-text-primary)] flex-1 truncate">
                            {item.description}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 shrink-0 ${itemTypeBadgeClass[item.itemType]}`}
                          >
                            {t(itemTypeKeys[item.itemType])}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              removeItemFromChecklist(clIdx, itemIdx)
                            }
                            className="h-5 w-5 p-0 text-[var(--pro-text-muted)] hover:text-red-400 shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Item */}
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('subs.itemDescription')}
                      value={newItemDescs[clIdx] || ""}
                      onChange={(e) =>
                        setNewItemDescs((prev) => ({
                          ...prev,
                          [clIdx]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addItemToChecklist(clIdx);
                        }
                      }}
                      className="flex-1 h-8 text-sm"
                    />
                    <Select
                      value={newItemTypes[clIdx] || "standard"}
                      onValueChange={(val) =>
                        setNewItemTypes((prev) => ({
                          ...prev,
                          [clIdx]: val as ChecklistItemDraft["itemType"],
                        }))
                      }
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">{t('subs.standard')}</SelectItem>
                        <SelectItem value="doc_required">
                          {t('subs.docRequired')}
                        </SelectItem>
                        <SelectItem value="inspection">{t('subs.inspection')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => addItemToChecklist(clIdx)}
                      disabled={!newItemDescs[clIdx]?.trim()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('button.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? t('subs.updating') : t('subs.creating')}
                </>
              ) : isEditing ? (
                t('subs.updateTask')
              ) : (
                t('subs.createTask')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
