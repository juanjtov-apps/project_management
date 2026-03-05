import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Trash2, Link2, Plus, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { MaterialArea, MaterialItem, ProjectStage } from "./materials-tab";

const CLIENT_EDITABLE_FIELDS = ["spec", "product_link", "vendor", "quantity", "unit_cost", "order_status"];
const READ_ONLY_FIELDS = ["area_name", "total"];

function isFieldEditable(field: string, isClient: boolean): boolean {
  if (READ_ONLY_FIELDS.includes(field)) return false;
  if (isClient) return CLIENT_EDITABLE_FIELDS.includes(field);
  return true;
}

interface MaterialsTableViewProps {
  items: MaterialItem[];
  areas: MaterialArea[];
  stages: ProjectStage[];
  projectId: string;
  isClient?: boolean;
  docCounts?: Record<string, number>;
}

export function MaterialsTableView({
  items,
  areas,
  stages,
  projectId,
  isClient = false,
}: MaterialsTableViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const updateFieldMutation = useMutation({
    mutationFn: async ({
      itemId,
      field,
      value,
    }: {
      itemId: string;
      field: string;
      value: string | number | null;
    }) => {
      const response = await apiRequest(`/api/material-items/${itemId}`, {
        method: "PATCH",
        body: { [field]: value },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/material-items?project_id=${projectId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/material-areas?project_id=${projectId}`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to save change. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiRequest(`/api/material-items/${itemId}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/material-items?project_id=${projectId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/material-areas?project_id=${projectId}`],
      });
      toast({ title: "Item Deleted", description: "Material item has been removed." });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = useCallback(
    (itemId: string, field: string, value: string | number | null) => {
      updateFieldMutation.mutate({ itemId, field, value });
    },
    [updateFieldMutation]
  );

  // Compute overdue stage IDs and the next-due (soonest future) stage ID
  const { overdueStageIds, nextDueStageId } = (() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const candidates = stages
      .filter(s => s.finishMaterialsDueDate && s.status !== "COMPLETE")
      .map(s => ({ ...s, due: new Date(s.finishMaterialsDueDate!) }));
    const overdue = new Set(candidates.filter(s => s.due.getTime() < now.getTime()).map(s => s.id));
    const upcoming = candidates
      .filter(s => s.due.getTime() >= now.getTime())
      .sort((a, b) => a.due.getTime() - b.due.getTime());
    return { overdueStageIds: overdue, nextDueStageId: upcoming[0]?.id ?? null };
  })();

  // Group items by area, preserving area sort order
  const sortedAreas = [...areas].sort((a, b) => a.sort_order - b.sort_order);

  // Grand total
  const grandTotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity || "0") || 1;
    const cost = item.unit_cost || 0;
    return sum + qty * cost;
  }, 0);

  return (
    <TooltipProvider delayDuration={300}>
      <Table style={{ minWidth: 1100 }}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[130px] sticky left-0 z-10 bg-[var(--pro-surface-highlight)]/80 backdrop-blur-sm">Area</TableHead>
            <TableHead className="w-[170px]">Name</TableHead>
            <TableHead className="w-[150px]">Spec</TableHead>
            <TableHead className="w-[130px]">Vendor</TableHead>
            <TableHead className="w-[80px]">Link</TableHead>
            <TableHead className="w-[80px]">Qty</TableHead>
            <TableHead className="w-[100px]">Unit Cost</TableHead>
            <TableHead className="w-[100px]">Total</TableHead>
            <TableHead className="w-[140px]">Stage</TableHead>
            <TableHead className="w-[130px]">Order Status</TableHead>
            {!isClient && <TableHead className="w-[60px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAreas.map((area) => {
            const areaItems = items.filter((i) => i.area_id === area.id);
            if (areaItems.length === 0) return null;

            const areaCost = areaItems.reduce((sum, item) => {
              const qty = parseFloat(item.quantity || "0") || 1;
              const cost = item.unit_cost || 0;
              return sum + qty * cost;
            }, 0);

            return (
              <AreaGroup
                key={area.id}
                area={area}
                areaItems={areaItems}
                areaCost={areaCost}
                stages={stages}
                projectId={projectId}
                isClient={isClient}
                overdueStageIds={overdueStageIds}
                nextDueStageId={nextDueStageId}
                onSave={handleSave}
                onDelete={(id) => setItemToDelete(id)}
              />
            );
          })}
          {items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={isClient ? 10 : 11}
                className="text-center py-8 text-muted-foreground"
              >
                No materials match your search or filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={7} className="text-right font-medium">
              Grand Total:
            </TableCell>
            <TableCell className="font-bold text-emerald-400">
              ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </TableCell>
            <TableCell colSpan={isClient ? 2 : 3} />
          </TableRow>
        </TableFooter>
      </Table>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this material? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete) {
                  deleteItemMutation.mutate(itemToDelete);
                  setItemToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

// ── Area Group ───────────────────────────────────────────────────────────────

interface AreaGroupProps {
  area: MaterialArea;
  areaItems: MaterialItem[];
  areaCost: number;
  stages: ProjectStage[];
  projectId: string;
  isClient: boolean;
  overdueStageIds: Set<string>;
  nextDueStageId: string | null;
  onSave: (itemId: string, field: string, value: string | number | null) => void;
  onDelete: (itemId: string) => void;
}

function AreaGroup({ area, areaItems, areaCost, stages, projectId, isClient, overdueStageIds, nextDueStageId, onSave, onDelete }: AreaGroupProps) {
  return (
    <>
      {/* Area header row */}
      <TableRow className="bg-[var(--pro-surface-highlight)]/40 hover:bg-[var(--pro-surface-highlight)]/40 border-b-0">
        <TableCell
          colSpan={isClient ? 10 : 11}
          className="py-2.5 px-4 font-semibold text-sm"
        >
          <span className="text-[var(--pro-text-primary)]">{area.name}</span>
          <span className="ml-3 text-xs font-normal text-[var(--pro-text-secondary)]">
            {areaItems.length} item{areaItems.length !== 1 ? "s" : ""}
          </span>
          <span className="ml-2 text-xs font-normal text-emerald-400">
            ${areaCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </TableCell>
      </TableRow>

      {/* Item rows */}
      {areaItems.map((item) => (
        <EditableRow
          key={item.id}
          item={item}
          areaName={area.name}
          stages={stages}
          isClient={isClient}
          overdueStageIds={overdueStageIds}
          nextDueStageId={nextDueStageId}
          onSave={onSave}
          onDelete={onDelete}
        />
      ))}

      {/* Add new item row */}
      <NewItemRow
        areaId={area.id}
        projectId={projectId}
        stages={stages}
        isClient={isClient}
      />
    </>
  );
}

// ── New Item Row ─────────────────────────────────────────────────────────────

interface NewItemRowProps {
  areaId: string;
  projectId: string;
  stages: ProjectStage[];
  isClient: boolean;
}

function NewItemRow({ areaId, projectId, stages, isClient }: NewItemRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [spec, setSpec] = useState("");
  const [vendor, setVendor] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [stageId, setStageId] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isAdding) {
      nameRef.current?.focus();
    }
  }, [isAdding]);

  const resetForm = () => {
    setName("");
    setSpec("");
    setVendor("");
    setQuantity("");
    setUnitCost("");
    setStageId("");
    setIsAdding(false);
  };

  const createItemMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/material-items", {
        method: "POST",
        body: {
          area_id: areaId,
          project_id: projectId,
          name: name.trim(),
          spec: spec.trim() || null,
          vendor: vendor.trim() || null,
          quantity: quantity.trim() || null,
          unit_cost: unitCost ? parseFloat(unitCost) || null : null,
          stage_id: stageId || null,
          status: "pending",
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-items?project_id=${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      toast({ title: "Item Added", description: "Material item has been added successfully." });
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) return;
    createItemMutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      resetForm();
    }
  };

  if (!isAdding) {
    return (
      <TableRow className="hover:bg-[var(--pro-surface-highlight)]/20">
        <TableCell
          colSpan={isClient ? 10 : 11}
          className="py-1.5 px-4"
        >
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 text-xs text-[var(--pro-text-secondary)] hover:text-emerald-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="bg-emerald-500/5">
      {/* Area — empty */}
      <TableCell className="px-3 py-1.5 text-xs text-[var(--pro-text-secondary)]">—</TableCell>

      {/* Name (required) */}
      <TableCell className="px-1 py-1">
        <input
          ref={nameRef}
          type="text"
          placeholder="Material name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-full rounded-sm border-0 bg-transparent px-2 text-xs text-[var(--pro-text-primary)] outline-none ring-1 ring-emerald-500/60 focus:ring-emerald-400 placeholder:text-[var(--pro-text-secondary)]/50"
        />
      </TableCell>

      {/* Spec */}
      <TableCell className="px-1 py-1">
        <input
          type="text"
          placeholder="Spec"
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-full rounded-sm border-0 bg-transparent px-2 text-xs text-[var(--pro-text-primary)] outline-none ring-1 ring-zinc-600/40 focus:ring-emerald-400 placeholder:text-[var(--pro-text-secondary)]/50"
        />
      </TableCell>

      {/* Vendor */}
      <TableCell className="px-1 py-1">
        <input
          type="text"
          placeholder="Vendor"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-full rounded-sm border-0 bg-transparent px-2 text-xs text-[var(--pro-text-primary)] outline-none ring-1 ring-zinc-600/40 focus:ring-emerald-400 placeholder:text-[var(--pro-text-secondary)]/50"
        />
      </TableCell>

      {/* Link — skip for new row */}
      <TableCell className="px-3 py-1.5 text-xs text-[var(--pro-text-secondary)]">—</TableCell>

      {/* Quantity */}
      <TableCell className="px-1 py-1">
        <input
          type="text"
          placeholder="Qty"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-full rounded-sm border-0 bg-transparent px-2 text-xs text-[var(--pro-text-primary)] outline-none ring-1 ring-zinc-600/40 focus:ring-emerald-400 placeholder:text-[var(--pro-text-secondary)]/50"
        />
      </TableCell>

      {/* Unit Cost */}
      <TableCell className="px-1 py-1">
        <input
          type="number"
          step="0.01"
          placeholder="$0.00"
          value={unitCost}
          onChange={(e) => setUnitCost(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-full rounded-sm border-0 bg-transparent px-2 text-xs text-[var(--pro-text-primary)] outline-none ring-1 ring-zinc-600/40 focus:ring-emerald-400 placeholder:text-[var(--pro-text-secondary)]/50"
        />
      </TableCell>

      {/* Total — empty */}
      <TableCell className="px-3 py-1.5 text-xs text-[var(--pro-text-secondary)]">—</TableCell>

      {/* Stage */}
      {!isClient ? (
        <TableCell className="px-1 py-1">
          <Select value={stageId || "none"} onValueChange={(val) => setStageId(val === "none" ? "" : val)}>
            <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-[var(--pro-surface-highlight)]/30 focus:ring-1 focus:ring-emerald-500/60">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No stage</SelectItem>
              {[...stages].sort((a, b) => a.orderIndex - b.orderIndex).map((stage) => {
                const dueLabel = stage.finishMaterialsDueDate
                  ? new Date(stage.finishMaterialsDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : null;
                return (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}{dueLabel ? ` · Due ${dueLabel}` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </TableCell>
      ) : (
        <TableCell className="px-3 py-1.5 text-xs text-[var(--pro-text-secondary)]">—</TableCell>
      )}

      {/* Order Status / Actions — save & cancel */}
      <TableCell className="px-2 py-1.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
            onClick={handleSubmit}
            disabled={!name.trim() || createItemMutation.isPending}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-400/10"
            onClick={resetForm}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
      {!isClient && <TableCell />}
    </TableRow>
  );
}

// ── Editable Row ─────────────────────────────────────────────────────────────

interface EditableRowProps {
  item: MaterialItem;
  areaName: string;
  stages: ProjectStage[];
  isClient: boolean;
  overdueStageIds: Set<string>;
  nextDueStageId: string | null;
  onSave: (itemId: string, field: string, value: string | number | null) => void;
  onDelete: (itemId: string) => void;
}

function EditableRow({ item, areaName, stages, isClient, overdueStageIds, nextDueStageId, onSave, onDelete }: EditableRowProps) {
  const qty = parseFloat(item.quantity || "0") || 1;
  const cost = item.unit_cost || 0;
  const total = qty * cost;
  const isOverdue = !!item.stage_id && overdueStageIds.has(item.stage_id);
  const isNextDue = !isOverdue && nextDueStageId !== null && item.stage_id === nextDueStageId;

  return (
    <TableRow className={cn(
      "group",
      isOverdue && "border-l-2 border-l-red-500 bg-red-500/[0.04]",
      isNextDue && "border-l-2 border-l-blue-500 bg-blue-500/[0.04]",
    )}>
      {/* Area (read-only) */}
      <TableCell className="sticky left-0 z-10 bg-[var(--pro-surface)] group-hover:bg-[var(--pro-surface-highlight)]/50 backdrop-blur-sm text-xs text-[var(--pro-text-secondary)]">
        {areaName}
      </TableCell>

      {/* Name */}
      <EditableCell
        value={item.name}
        field="name"
        itemId={item.id}
        type="text"
        editable={isFieldEditable("name", isClient)}
        isClient={isClient}
        onSave={onSave}
      />

      {/* Spec */}
      <EditableCell
        value={item.spec || ""}
        field="spec"
        itemId={item.id}
        type="text"
        editable={isFieldEditable("spec", isClient)}
        isClient={isClient}
        onSave={onSave}
        placeholder="—"
      />

      {/* Vendor */}
      <EditableCell
        value={item.vendor || ""}
        field="vendor"
        itemId={item.id}
        type="text"
        editable={isFieldEditable("vendor", isClient)}
        isClient={isClient}
        onSave={onSave}
        placeholder="—"
      />

      {/* Product Link */}
      <LinkCell
        value={item.product_link || ""}
        itemId={item.id}
        editable={isFieldEditable("product_link", isClient)}
        isClient={isClient}
        onSave={onSave}
      />

      {/* Quantity */}
      <EditableCell
        value={item.quantity || ""}
        field="quantity"
        itemId={item.id}
        type="text"
        editable={isFieldEditable("quantity", isClient)}
        isClient={isClient}
        onSave={onSave}
        placeholder="—"
      />

      {/* Unit Cost */}
      <EditableCell
        value={item.unit_cost != null ? String(item.unit_cost) : ""}
        field="unit_cost"
        itemId={item.id}
        type="number"
        editable={isFieldEditable("unit_cost", isClient)}
        isClient={isClient}
        onSave={onSave}
        prefix="$"
        placeholder="—"
      />

      {/* Total (computed, read-only) */}
      <TableCell className="px-3 py-2 text-xs font-medium text-emerald-400">
        ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>

      {/* Stage (select) */}
      <StageCell
        item={item}
        stages={stages}
        editable={isFieldEditable("stage_id", isClient)}
        isClient={isClient}
        onSave={onSave}
      />

      {/* Order Status (toggle) */}
      <OrderStatusCell
        item={item}
        onSave={onSave}
      />

      {/* Actions */}
      {!isClient && (
        <TableCell className="px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

// ── Editable Cell ────────────────────────────────────────────────────────────

interface EditableCellProps {
  value: string;
  field: string;
  itemId: string;
  type: "text" | "number";
  editable: boolean;
  isClient: boolean;
  onSave: (itemId: string, field: string, value: string | number | null) => void;
  prefix?: string;
  placeholder?: string;
}

function EditableCell({
  value,
  field,
  itemId,
  type,
  editable,
  isClient,
  onSave,
  prefix,
  placeholder = "",
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with incoming prop when not editing
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed === value) return; // No change

    if (type === "number") {
      const num = trimmed === "" ? 0 : parseFloat(trimmed);
      if (isNaN(num)) return; // Invalid number, revert
      onSave(itemId, field, num);
    } else {
      // Send empty string (not null) so backend sees the field as provided
      onSave(itemId, field, trimmed);
    }
  }, [editValue, value, type, onSave, itemId, field]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (!editable) {
    return (
      <TableCell
        className={cn(
          "px-3 py-2 text-xs cursor-default",
          !value && "text-[var(--pro-text-secondary)]"
        )}
      >
        {isClient ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{prefix && value ? `${prefix}${value}` : value || placeholder}</span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Contact PM to change this field</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          prefix && value ? `${prefix}${value}` : value || placeholder
        )}
      </TableCell>
    );
  }

  if (isEditing) {
    return (
      <TableCell className="px-1 py-1">
        <input
          ref={inputRef}
          type={type === "number" ? "number" : "text"}
          step={type === "number" ? "0.01" : undefined}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 w-full rounded-sm border-0 bg-transparent px-2 text-xs text-[var(--pro-text-primary)] outline-none ring-1 ring-emerald-500/60 focus:ring-emerald-400"
        />
      </TableCell>
    );
  }

  return (
    <TableCell
      className={cn(
        "px-3 py-2 text-xs cursor-text hover:bg-[var(--pro-surface-highlight)]/30 rounded-sm transition-colors",
        !value && "text-[var(--pro-text-secondary)]"
      )}
      onClick={() => setIsEditing(true)}
    >
      {prefix && value ? `${prefix}${value}` : value || placeholder}
    </TableCell>
  );
}

// ── Stage Cell (Select) ──────────────────────────────────────────────────────

interface StageCellProps {
  item: MaterialItem;
  stages: ProjectStage[];
  editable: boolean;
  isClient: boolean;
  onSave: (itemId: string, field: string, value: string | number | null) => void;
}

function StageCell({ item, stages, editable, isClient, onSave }: StageCellProps) {
  const sortedStages = [...stages].sort((a, b) => a.orderIndex - b.orderIndex);
  const matchedStage = sortedStages.find((s) => s.id === item.stage_id);
  const stageName = item.stage_name || matchedStage?.name;

  // Compute due date label
  const dueDate = matchedStage?.finishMaterialsDueDate;
  const dueDateLabel = (() => {
    if (!dueDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dueDate);
    target.setHours(0, 0, 0, 0);
    const formatted = target.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const days = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { text: `Overdue (${formatted})`, className: "text-red-400" };
    if (days === 0) return { text: "Due today", className: "text-amber-400" };
    if (days <= 7) return { text: `Due ${formatted}`, className: "text-amber-400" };
    return { text: `Due ${formatted}`, className: "text-zinc-500" };
  })();

  if (!editable) {
    const stageContent = (
      <div>
        {stageName || <span className="text-[var(--pro-text-secondary)]">—</span>}
        {stageName && dueDateLabel && (
          <div className={cn("text-[10px] leading-tight mt-0.5", dueDateLabel.className)}>
            {dueDateLabel.text}
          </div>
        )}
      </div>
    );

    return (
      <TableCell className="px-3 py-1.5 text-xs cursor-default">
        {isClient ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{stageContent}</span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Contact PM to change stage</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          stageContent
        )}
      </TableCell>
    );
  }

  return (
    <TableCell className="px-1 py-1">
      <Select
        value={item.stage_id || "none"}
        onValueChange={(val) => onSave(item.id, "stage_id", val === "none" ? "" : val)}
      >
        <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-[var(--pro-surface-highlight)]/30 focus:ring-1 focus:ring-emerald-500/60">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Unassigned</SelectItem>
          {sortedStages.map((stage) => {
            const dueLabel = stage.finishMaterialsDueDate
              ? new Date(stage.finishMaterialsDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : null;
            return (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}{dueLabel ? ` · Due ${dueLabel}` : ""}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </TableCell>
  );
}

// ── Link Cell ────────────────────────────────────────────────────────────────

interface LinkCellProps {
  value: string;
  itemId: string;
  editable: boolean;
  isClient: boolean;
  onSave: (itemId: string, field: string, value: string | number | null) => void;
}

function LinkCell({ value, itemId, editable, isClient, onSave }: LinkCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setEditValue(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed === value) return;
    // Send empty string (not null) so backend sees the field as provided
    onSave(itemId, "product_link", trimmed);
  }, [editValue, value, onSave, itemId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (!editable) {
    const linkContent = value ? (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        View
      </a>
    ) : (
      <span className="text-[var(--pro-text-secondary)]">—</span>
    );

    return (
      <TableCell className="px-3 py-2 text-xs cursor-default">
        {isClient ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{linkContent}</span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Contact PM to change this field</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          linkContent
        )}
      </TableCell>
    );
  }

  if (isEditing) {
    return (
      <TableCell className="px-1 py-1">
        <input
          ref={inputRef}
          type="text"
          placeholder="https://..."
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 w-full rounded-sm border-0 bg-transparent px-2 text-xs text-[var(--pro-text-primary)] outline-none ring-1 ring-emerald-500/60 focus:ring-emerald-400"
        />
      </TableCell>
    );
  }

  return (
    <TableCell className="px-3 py-2">
      <div className="flex items-center gap-1.5">
        {value ? (
          <>
            <span
              className="text-xs text-blue-400 hover:text-blue-300 cursor-text truncate max-w-[80px]"
              onClick={() => setIsEditing(true)}
              title={value}
            >
              {(() => {
                try {
                  return new URL(value).hostname.replace("www.", "");
                } catch {
                  return "Link";
                }
              })()}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(value, "_blank", "noopener,noreferrer");
              }}
              className="shrink-0 text-blue-400/60 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </button>
          </>
        ) : (
          <span
            className="text-xs text-[var(--pro-text-secondary)] hover:text-blue-400 cursor-text transition-colors"
            onClick={() => setIsEditing(true)}
          >
            <Link2 className="h-3.5 w-3.5 inline mr-1" />
            Add link
          </span>
        )}
      </div>
    </TableCell>
  );
}

// ── Order Status Cell (Toggle) ───────────────────────────────────────────────

interface OrderStatusCellProps {
  item: MaterialItem;
  onSave: (itemId: string, field: string, value: string | number | null) => void;
}

function OrderStatusCell({ item, onSave }: OrderStatusCellProps) {
  const isOrdered = item.order_status === "ordered";

  return (
    <TableCell className="px-2 py-2">
      <div className="flex rounded-md border border-[var(--pro-border)] overflow-hidden">
        <button
          onClick={() => {
            if (isOrdered) onSave(item.id, "order_status", "pending_to_order");
          }}
          className={cn(
            "px-2 py-0.5 text-[10px] font-medium transition-colors",
            !isOrdered
              ? "bg-amber-500/20 text-amber-400"
              : "text-[var(--pro-text-secondary)] hover:text-[var(--pro-text-primary)]"
          )}
        >
          Pending
        </button>
        <button
          onClick={() => {
            if (!isOrdered) onSave(item.id, "order_status", "ordered");
          }}
          className={cn(
            "px-2 py-0.5 text-[10px] font-medium transition-colors",
            isOrdered
              ? "bg-emerald-500/20 text-emerald-400"
              : "text-[var(--pro-text-secondary)] hover:text-[var(--pro-text-primary)]"
          )}
        >
          Ordered
        </button>
      </div>
    </TableCell>
  );
}
