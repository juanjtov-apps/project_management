import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  GripVertical,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface TemplateItem {
  description: string;
  itemType: "standard" | "doc_required" | "inspection";
}

interface ChecklistTemplate {
  id: string;
  name: string;
  tradeCategory?: string;
  items: TemplateItem[];
  createdAt: string;
  updatedAt?: string;
}

interface TemplateFormData {
  name: string;
  tradeCategory: string;
  items: TemplateItem[];
}

const itemTypeLabels: Record<TemplateItem["itemType"], string> = {
  standard: "Standard",
  doc_required: "Doc Required",
  inspection: "Inspection",
};

const itemTypeBadgeClass: Record<TemplateItem["itemType"], string> = {
  standard: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  doc_required: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  inspection: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const emptyForm: TemplateFormData = {
  name: "",
  tradeCategory: "",
  items: [],
};

export function ChecklistTemplateManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<ChecklistTemplate | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(
    null
  );
  const [form, setForm] = useState<TemplateFormData>(emptyForm);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemType, setNewItemType] =
    useState<TemplateItem["itemType"]>("standard");

  const { data: templates = [], isLoading } = useQuery<ChecklistTemplate[]>({
    queryKey: ["/api/v1/sub/templates"],
    queryFn: async () => {
      const res = await fetch("/api/v1/sub/templates", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const res = await fetch("/api/v1/sub/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          tradeCategory: data.tradeCategory || undefined,
          items: data.items,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create template");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/templates"],
      });
      toast({ title: "Template created" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create template",
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
      data: TemplateFormData;
    }) => {
      const res = await fetch(`/api/v1/sub/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          tradeCategory: data.tradeCategory || undefined,
          items: data.items,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update template");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/templates"],
      });
      toast({ title: "Template updated" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/sub/templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to delete template");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/templates"],
      });
      toast({ title: "Template deleted" });
      setDeleteDialogOpen(false);
      setDeletingTemplateId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function openCreateDialog() {
    setEditingTemplate(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(template: ChecklistTemplate) {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      tradeCategory: template.tradeCategory || "",
      items: [...template.items],
    });
    setDialogOpen(true);
  }

  function confirmDelete(id: string) {
    setDeletingTemplateId(id);
    setDeleteDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingTemplate(null);
    setForm(emptyForm);
    setNewItemDesc("");
    setNewItemType("standard");
  }

  function addItem() {
    if (!newItemDesc.trim()) return;
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { description: newItemDesc.trim(), itemType: newItemType },
      ],
    }));
    setNewItemDesc("");
    setNewItemType("standard");
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--pro-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--pro-text-primary)]">
            Checklist Templates
          </h2>
          <p className="text-[var(--pro-text-secondary)]">
            Reusable checklist templates for sub tasks
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Template</span>
        </Button>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
          <CardContent className="text-center py-12">
            <ClipboardList className="h-16 w-16 mx-auto text-[var(--pro-text-muted)] mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-[var(--pro-text-primary)]">
              No Templates Yet
            </h3>
            <p className="text-[var(--pro-text-secondary)] mb-4">
              Create checklist templates to quickly assign standardized tasks.
            </p>
            <Button onClick={openCreateDialog} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="bg-[var(--pro-surface)] border-[var(--pro-border)] hover:border-[var(--pro-mint)]/30 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[var(--pro-text-primary)] truncate">
                      {template.name}
                    </h3>
                    {template.tradeCategory && (
                      <Badge
                        variant="outline"
                        className="mt-1 bg-[var(--pro-mint)]/10 text-[var(--pro-mint)] border-[var(--pro-mint)]/30"
                      >
                        {template.tradeCategory}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(template)}
                      className="h-8 w-8 p-0 text-[var(--pro-text-muted)] hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDelete(template.id)}
                      className="h-8 w-8 p-0 text-[var(--pro-text-muted)] hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {template.items.slice(0, 4).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm text-[var(--pro-text-secondary)]"
                    >
                      <GripVertical className="h-3 w-3 text-[var(--pro-text-muted)] shrink-0" />
                      <span className="truncate flex-1">
                        {item.description}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${itemTypeBadgeClass[item.itemType]}`}
                      >
                        {itemTypeLabels[item.itemType]}
                      </Badge>
                    </div>
                  ))}
                  {template.items.length > 4 && (
                    <p className="text-xs text-[var(--pro-text-muted)] pl-5">
                      +{template.items.length - 4} more items
                    </p>
                  )}
                  {template.items.length === 0 && (
                    <p className="text-xs text-[var(--pro-text-muted)] italic">
                      No items defined
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-[var(--pro-border)]">
                  <p className="text-xs text-[var(--pro-text-muted)]">
                    {template.items.length} item
                    {template.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Template Name *</Label>
              <Input
                id="tpl-name"
                placeholder="e.g. Electrical Rough-In Checklist"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-trade">Trade Category</Label>
              <Input
                id="tpl-trade"
                placeholder="e.g. Electrical, Plumbing, HVAC"
                value={form.tradeCategory}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    tradeCategory: e.target.value,
                  }))
                }
              />
            </div>

            {/* Items */}
            <div className="space-y-2">
              <Label>Checklist Items</Label>

              {/* Existing items */}
              {form.items.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-[var(--pro-border)] rounded-lg p-2">
                  {form.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-1.5 rounded bg-[var(--pro-bg)]"
                    >
                      <span className="text-xs text-[var(--pro-text-muted)] w-5 text-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-[var(--pro-text-primary)] flex-1 truncate">
                        {item.description}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 shrink-0 ${itemTypeBadgeClass[item.itemType]}`}
                      >
                        {itemTypeLabels[item.itemType]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(idx)}
                        className="h-6 w-6 p-0 text-[var(--pro-text-muted)] hover:text-red-400 shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new item */}
              <div className="flex gap-2">
                <Input
                  placeholder="Item description"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                  className="flex-1"
                />
                <Select
                  value={newItemType}
                  onValueChange={(val) =>
                    setNewItemType(val as TemplateItem["itemType"])
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="doc_required">Doc Required</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  disabled={!newItemDesc.trim()}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !form.name.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingTemplate ? (
                "Update Template"
              ) : (
                "Create Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this checklist template. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingTemplateId) {
                  deleteMutation.mutate(deletingTemplateId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
