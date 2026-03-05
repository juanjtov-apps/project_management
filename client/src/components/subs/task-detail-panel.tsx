import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  X,
  Loader2,
  MapPin,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  description: string;
  itemType: "standard" | "doc_required" | "inspection";
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: string;
  sortOrder: number;
}

interface Checklist {
  id: string;
  name: string;
  templateId?: string;
  sortOrder: number;
  items: ChecklistItem[];
}

interface TaskDetail {
  id: string;
  name: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
  locationTag?: string;
  startDate?: string;
  endDate?: string;
  assignedTo: string;
  subcontractorName?: string;
  checklists?: Checklist[];
}

interface TaskDetailPanelProps {
  taskId: string;
  projectId: string;
  onBack: () => void;
  onEdit: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  not_started: {
    label: "Not Started",
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  pending_review: {
    label: "Pending Review",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  revision_requested: {
    label: "Revision Requested",
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  medium: { label: "Medium", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  high: { label: "High", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  urgent: { label: "Urgent", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const itemTypeLabels: Record<string, string> = {
  standard: "Standard",
  doc_required: "Doc Required",
  inspection: "Inspection",
};

const itemTypeBadgeClass: Record<string, string> = {
  standard: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  doc_required: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  inspection: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export function TaskDetailPanel({
  taskId,
  projectId,
  onBack,
  onEdit,
}: TaskDetailPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteChecklistId, setDeleteChecklistId] = useState<string | null>(null);

  // Add checklist inline state
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");

  // Add item inline state (per checklist)
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemType, setNewItemType] = useState<string>("standard");

  // Fetch task detail with checklists
  const { data: task, isLoading } = useQuery<TaskDetail>({
    queryKey: ["/api/v1/sub/tasks", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sub/tasks/${taskId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch task");
      return res.json();
    },
  });

  // Delete task
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/sub/tasks/${taskId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/sub/tasks"] });
      toast({ title: "Task deleted" });
      onBack();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete task", description: error.message, variant: "destructive" });
    },
  });

  // Delete checklist
  const deleteChecklistMutation = useMutation({
    mutationFn: async (checklistId: string) => {
      const res = await fetch(`/api/v1/sub/checklists/${checklistId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete checklist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/sub/tasks", taskId] });
      toast({ title: "Checklist deleted" });
      setDeleteChecklistId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete checklist", description: error.message, variant: "destructive" });
      setDeleteChecklistId(null);
    },
  });

  // Add checklist
  const addChecklistMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/v1/sub/tasks/${taskId}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, items: [] }),
      });
      if (!res.ok) throw new Error("Failed to create checklist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/sub/tasks", taskId] });
      toast({ title: "Checklist added" });
      setNewChecklistName("");
      setShowAddChecklist(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add checklist", description: error.message, variant: "destructive" });
    },
  });

  // Add item to checklist
  const addItemMutation = useMutation({
    mutationFn: async ({ checklistId, description, itemType }: { checklistId: string; description: string; itemType: string }) => {
      const res = await fetch(`/api/v1/sub/checklists/${checklistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ description, itemType }),
      });
      if (!res.ok) throw new Error("Failed to add item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/sub/tasks", taskId] });
      setNewItemDesc("");
      setNewItemType("standard");
      setAddingItemTo(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add item", description: error.message, variant: "destructive" });
    },
  });

  // Delete checklist item
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/v1/sub/checklist-items/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/sub/tasks", taskId] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete item", description: error.message, variant: "destructive" });
    },
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--pro-text-muted)]" />
      </div>
    );
  }

  if (!task) {
    return (
      <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
        <CardContent className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-3" />
          <h3 className="text-lg font-semibold text-[var(--pro-text-primary)]">Task not found</h3>
          <Button variant="outline" onClick={onBack} className="mt-4">Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  const status = statusConfig[task.status] || statusConfig.not_started;
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const checklists = task.checklists || [];
  const isOverdue =
    task.endDate &&
    new Date(task.endDate) < new Date() &&
    task.status !== "approved" &&
    task.status !== "rejected";

  return (
    <div className="space-y-4">
      {/* Header with Back + Actions */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-[var(--pro-text-secondary)] hover:text-[var(--pro-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            className="gap-1.5 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Task Info Card */}
      <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
        <CardContent className="p-5 space-y-4">
          {/* Title + Badges */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h2 className="text-xl font-bold text-[var(--pro-text-primary)]">{task.name}</h2>
              <Badge variant="outline" className={priority.className}>{priority.label}</Badge>
              <Badge variant="outline" className={status.className}>{status.label}</Badge>
            </div>
            {task.description && (
              <p className="text-sm text-[var(--pro-text-secondary)]">{task.description}</p>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 flex-wrap text-sm">
            {task.locationTag && (
              <div className="flex items-center gap-1.5 text-[var(--pro-text-secondary)]">
                <MapPin className="h-3.5 w-3.5" />
                <span>{task.locationTag}</span>
              </div>
            )}
            {task.startDate && (
              <div className="flex items-center gap-1.5 text-[var(--pro-text-secondary)]">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Start: {formatDate(task.startDate)}</span>
              </div>
            )}
            {task.endDate && (
              <div className={`flex items-center gap-1.5 ${isOverdue ? "text-red-400" : "text-[var(--pro-text-secondary)]"}`}>
                {isOverdue ? <AlertCircle className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
                <span>{isOverdue ? "Overdue: " : "Due: "}{formatDate(task.endDate)}</span>
              </div>
            )}
            {task.subcontractorName && (
              <div className="flex items-center gap-1.5 text-[var(--pro-text-secondary)]">
                <span>Sub: <span className="text-[var(--pro-text-primary)] font-medium">{task.subcontractorName}</span></span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checklists Section */}
      <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--pro-text-primary)] flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[var(--pro-mint)]" />
              Checklists
              {checklists.length > 0 && (
                <span className="text-sm font-normal text-[var(--pro-text-muted)]">
                  ({checklists.length})
                </span>
              )}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddChecklist(!showAddChecklist)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Checklist
            </Button>
          </div>

          {/* Add Checklist Inline */}
          {showAddChecklist && (
            <div className="flex gap-2 p-3 bg-[var(--pro-bg)] rounded-lg border border-[var(--pro-border)]">
              <Input
                placeholder="Checklist name"
                value={newChecklistName}
                onChange={(e) => setNewChecklistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newChecklistName.trim()) addChecklistMutation.mutate(newChecklistName.trim());
                  }
                }}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (newChecklistName.trim()) addChecklistMutation.mutate(newChecklistName.trim());
                }}
                disabled={!newChecklistName.trim() || addChecklistMutation.isPending}
              >
                {addChecklistMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowAddChecklist(false); setNewChecklistName(""); }}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Checklist List */}
          {checklists.length === 0 && !showAddChecklist ? (
            <div className="text-center py-6">
              <ClipboardList className="h-8 w-8 mx-auto text-[var(--pro-text-muted)] mb-2" />
              <p className="text-sm text-[var(--pro-text-secondary)]">No checklists yet</p>
            </div>
          ) : (
            checklists.map((checklist) => {
              const totalItems = checklist.items.length;
              const completedItems = checklist.items.filter((i) => i.isCompleted).length;

              return (
                <div
                  key={checklist.id}
                  className="border border-[var(--pro-border)] rounded-lg overflow-hidden"
                >
                  {/* Checklist Header */}
                  <div className="flex items-center justify-between p-3 bg-[var(--pro-bg)]">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-[var(--pro-text-primary)]">
                        {checklist.name}
                      </h4>
                      {totalItems > 0 && (
                        <span className="text-xs text-[var(--pro-text-muted)]">
                          {completedItems}/{totalItems} done
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteChecklistId(checklist.id)}
                      className="h-7 w-7 p-0 text-[var(--pro-text-muted)] hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-[var(--pro-border)]">
                    {checklist.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        {item.isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-[var(--pro-text-muted)] shrink-0" />
                        )}
                        <span
                          className={`text-sm flex-1 ${
                            item.isCompleted
                              ? "line-through text-[var(--pro-text-muted)]"
                              : "text-[var(--pro-text-primary)]"
                          }`}
                        >
                          {item.description}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 shrink-0 ${
                            itemTypeBadgeClass[item.itemType] || itemTypeBadgeClass.standard
                          }`}
                        >
                          {itemTypeLabels[item.itemType] || "Standard"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          className="h-6 w-6 p-0 text-[var(--pro-text-muted)] hover:text-red-400 shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {/* Add item row */}
                    {addingItemTo === checklist.id ? (
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Input
                          placeholder="Item description"
                          value={newItemDesc}
                          onChange={(e) => setNewItemDesc(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (newItemDesc.trim()) {
                                addItemMutation.mutate({
                                  checklistId: checklist.id,
                                  description: newItemDesc.trim(),
                                  itemType: newItemType,
                                });
                              }
                            }
                          }}
                          className="flex-1 h-8 text-sm"
                          autoFocus
                        />
                        <Select value={newItemType} onValueChange={setNewItemType}>
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="doc_required">Doc Required</SelectItem>
                            <SelectItem value="inspection">Inspection</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            if (newItemDesc.trim()) {
                              addItemMutation.mutate({
                                checklistId: checklist.id,
                                description: newItemDesc.trim(),
                                itemType: newItemType,
                              });
                            }
                          }}
                          disabled={!newItemDesc.trim() || addItemMutation.isPending}
                        >
                          {addItemMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => { setAddingItemTo(null); setNewItemDesc(""); setNewItemType("standard"); }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingItemTo(checklist.id); setNewItemDesc(""); setNewItemType("standard"); }}
                        className="flex items-center gap-2 px-3 py-2 w-full text-sm text-[var(--pro-text-muted)] hover:text-[var(--pro-mint)] hover:bg-[var(--pro-bg)] transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add item
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Delete Task Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.name}"? This will also remove all associated checklists and documents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Checklist Confirmation */}
      <AlertDialog open={!!deleteChecklistId} onOpenChange={(open) => { if (!open) setDeleteChecklistId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checklist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this checklist and all its items? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteChecklistId) deleteChecklistMutation.mutate(deleteChecklistId); }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteChecklistMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
