import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  Plus, Package, ExternalLink, Trash2, ChevronDown, ChevronRight,
  Pencil, Check, X, DollarSign, Search, Building2, AlertTriangle, Layers, Filter, ArrowLeft, GripVertical, Copy, Loader2,
  CalendarClock, Paperclip, FileText, Upload, Download, LayoutGrid, Table2
} from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MaterialsTableView } from "./materials-table-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Schema for creating an area
const areaSchema = z.object({
  name: z.string().min(1, "Area name is required"),
  description: z.string().optional(),
});

// Schema for creating a material item
const materialItemSchema = z.object({
  name: z.string().min(1, "Material name is required"),
  spec: z.string().optional(),
  product_link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  vendor: z.string().optional(),
  quantity: z.string().optional(),
  unit_cost: z.number().optional(),
  stage_id: z.string().optional(),
});

type AreaFormData = z.infer<typeof areaSchema>;
type MaterialItemFormData = z.infer<typeof materialItemSchema>;

export interface MaterialArea {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  item_count: number;
  total_cost: number;
}

export interface MaterialItem {
  id: string;
  area_id: string;
  project_id: string;
  name: string;
  spec?: string;
  product_link?: string;
  vendor?: string;
  quantity?: string;
  unit_cost?: number;
  status: string;
  order_status: string;  // 'pending_to_order' or 'ordered'
  added_by: string;
  added_by_name?: string;
  created_at: string;
  updated_at: string;
  stage_id?: string;
  stage_name?: string;
}

export interface ProjectStage {
  id: string;
  projectId: string;
  orderIndex: number;
  name: string;
  status: string;
  finishMaterialsDueDate?: string;
}

interface MaterialsTabProps {
  projectId: string;
  initialStageFilter?: string;
  isClient?: boolean;
}

export function MaterialsTab({ projectId, initialStageFilter, isClient = false }: MaterialsTabProps) {
  const [isCreateAreaOpen, setIsCreateAreaOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>(initialStageFilter || "all");
  const [activeDragItem, setActiveDragItem] = useState<MaterialItem | null>(null);
  const [viewMode, setViewMode] = useLocalStorage<"card" | "table">("materials-view-mode", "table");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Drag-and-drop sensors with activation distance to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Update filter when initialStageFilter changes (from URL)
  useEffect(() => {
    if (initialStageFilter) {
      setStageFilter(initialStageFilter);
    }
  }, [initialStageFilter]);

  const areaForm = useForm<AreaFormData>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Get material areas for the project
  const { data: areas = [], isLoading: areasLoading } = useQuery<MaterialArea[]>({
    queryKey: [`/api/material-areas?project_id=${projectId}`],
    enabled: !!projectId,
  });

  // Get all material items for the project
  const { data: allItems = [], isLoading: itemsLoading } = useQuery<MaterialItem[]>({
    queryKey: [`/api/material-items?project_id=${projectId}`],
    enabled: !!projectId,
  });

  // Get project stages for filtering
  const { data: stages = [] } = useQuery<ProjectStage[]>({
    queryKey: [`/api/v1/stages?projectId=${projectId}`],
    enabled: !!projectId,
  });

  // Get document counts per material item (for badge display)
  const { data: docCounts = {} } = useQuery<Record<string, number>>({
    queryKey: [`/api/material-documents/count?project_id=${projectId}`],
    enabled: !!projectId,
  });

  // Create area mutation
  const createAreaMutation = useMutation({
    mutationFn: async (data: AreaFormData) => {
      const response = await apiRequest(`/api/material-areas`, {
        method: "POST",
        body: {
          project_id: projectId,
          name: data.name,
          description: data.description || null,
          sort_order: areas.length,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      toast({
        title: "Area Created",
        description: "New material area has been created successfully.",
      });
      areaForm.reset();
      setIsCreateAreaOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create area. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmitArea = (data: AreaFormData) => {
    createAreaMutation.mutate(data);
  };

  // Move item between areas mutation (optimistic)
  const moveItemMutation = useMutation({
    mutationFn: async ({ itemId, newAreaId }: { itemId: string; newAreaId: string }) => {
      const response = await apiRequest(`/api/material-items/${itemId}`, {
        method: "PATCH",
        body: { area_id: newAreaId },
      });
      return response.json();
    },
    onMutate: async ({ itemId, newAreaId }) => {
      await queryClient.cancelQueries({
        queryKey: [`/api/material-items?project_id=${projectId}`],
      });
      const previousItems = queryClient.getQueryData<MaterialItem[]>(
        [`/api/material-items?project_id=${projectId}`]
      );
      if (previousItems) {
        queryClient.setQueryData<MaterialItem[]>(
          [`/api/material-items?project_id=${projectId}`],
          previousItems.map((item) =>
            item.id === itemId ? { ...item, area_id: newAreaId } : item
          )
        );
      }
      return { previousItems };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(
          [`/api/material-items?project_id=${projectId}`],
          context.previousItems
        );
      }
      toast({
        title: "Move Failed",
        description: "Failed to move material to the new area. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/material-items?project_id=${projectId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/material-areas?project_id=${projectId}`],
      });
    },
    onSuccess: () => {
      toast({
        title: "Material Moved",
        description: "Material has been moved to the new area.",
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const draggedItemId = event.active.id as string;
    const item = allItems.find((i) => i.id === draggedItemId);
    if (item) {
      setActiveDragItem(item);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const itemId = active.id as string;
    const targetAreaId = over.id as string;

    const draggedItem = allItems.find((i) => i.id === itemId);
    if (!draggedItem) return;

    // Only move if dropped on a different area
    if (draggedItem.area_id === targetAreaId) return;

    // Verify the target is actually an area
    const targetArea = areas.find((a: MaterialArea) => a.id === targetAreaId);
    if (!targetArea) return;

    moveItemMutation.mutate({ itemId, newAreaId: targetAreaId });
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
  };

  // Filter items based on search and stage filter
  const filteredItems = allItems.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.spec?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vendor?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStage =
      stageFilter === "all" ||
      (stageFilter === "unassigned" && !item.stage_id) ||
      item.stage_id === stageFilter;

    return matchesSearch && matchesStage;
  });

  // Calculate totals
  const totalItems = allItems.length;
  const totalCost = allItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity || "0") || 1;
    const cost = item.unit_cost || 0;
    return sum + (qty * cost);
  }, 0);

  // Compute materials deadline data grouped by stage urgency
  const getDaysUntil = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatDeadlineDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const stageDueDates = stages
    .filter((s) => s.finishMaterialsDueDate && s.status !== "COMPLETE")
    .map((s) => {
      const stageItems = allItems.filter((i) => i.stage_id === s.id);
      const needsOrdering = stageItems.filter((i) => i.order_status === "pending_to_order").length;
      const daysUntil = getDaysUntil(s.finishMaterialsDueDate);
      return { ...s, needsOrdering, totalItems: stageItems.length, daysUntil };
    })
    .filter((s) => s.totalItems > 0)
    .sort(
      (a, b) =>
        new Date(a.finishMaterialsDueDate!).getTime() -
        new Date(b.finishMaterialsDueDate!).getTime()
    );

  const hasUnorderedDeadlines = stageDueDates.some((s) => s.needsOrdering > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Materials by Area</h2>
          <p className="text-muted-foreground">
            Organize materials by house area with collapsible sections
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SegmentedControl
            options={[
              { value: "card", label: "Card View", icon: <LayoutGrid className="h-4 w-4" /> },
              { value: "table", label: "Table View", icon: <Table2 className="h-4 w-4" /> },
            ]}
            value={viewMode}
            onChange={(v) => setViewMode(v as "card" | "table")}
          />

          {/* Back to Stages button - always visible for PMs */}
          {!isClient && (
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = `/projects?projectId=${projectId}&tab=stages`;
              }}
              data-testid="button-back-to-stages"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Stages
            </Button>
          )}

          {!isClient && (
            <Dialog open={isCreateAreaOpen} onOpenChange={setIsCreateAreaOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-area">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Area
                </Button>
              </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Material Area</DialogTitle>
            </DialogHeader>
            
            <Form {...areaForm}>
              <form onSubmit={areaForm.handleSubmit(onSubmitArea)} className="space-y-4">
                <FormField
                  control={areaForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Foundation, Framing, Electrical" 
                          {...field} 
                          data-testid="input-area-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={areaForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Optional description for this area..."
                          className="min-h-[80px]"
                          {...field}
                          data-testid="textarea-area-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateAreaOpen(false)}
                    data-testid="button-cancel-area"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createAreaMutation.isPending}
                    data-testid="button-submit-area"
                  >
                    {createAreaMutation.isPending ? "Creating..." : "Create Area"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Materials Deadlines — compact horizontal strip */}
      {hasUnorderedDeadlines && stageDueDates.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-4 py-2.5 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <CalendarClock className="h-4 w-4 text-rose-400" />
            <span className="text-xs font-medium text-zinc-400">Deadlines</span>
          </div>
          <div className="flex items-center gap-2">
            {stageDueDates.map((stage) => {
              const isOverdue = stage.daysUntil !== null && stage.daysUntil < 0;
              const isDueSoon = stage.daysUntil !== null && stage.daysUntil >= 0 && stage.daysUntil <= 7;
              const isActive = stageFilter === stage.id;

              const deadlineLabel = isOverdue
                ? "Overdue"
                : stage.daysUntil === 0
                  ? "Today"
                  : stage.daysUntil === 1
                    ? "1d"
                    : `${stage.daysUntil}d`;

              return (
                <button
                  key={stage.id}
                  onClick={() => setStageFilter(isActive ? "all" : stage.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-zinc-700 border-zinc-500 text-white"
                      : "bg-zinc-900/40 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      isOverdue ? "bg-red-500" : isDueSoon ? "bg-amber-500" : "bg-zinc-500"
                    )}
                  />
                  <span className="font-medium truncate max-w-[100px]">{stage.name}</span>
                  <span
                    className={cn(
                      "font-semibold",
                      isOverdue ? "text-red-400" : isDueSoon ? "text-amber-400" : "text-zinc-400"
                    )}
                  >
                    {deadlineLabel}
                  </span>
                  <span className="text-zinc-500">
                    {stage.needsOrdering}/{stage.totalItems}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{areas.length}</p>
                <p className="text-sm text-muted-foreground">Material Areas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-teal-500" />
              <div>
                <p className="text-2xl font-bold">{totalItems}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Estimated Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Stage Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials by name, spec, or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-materials"
          />
        </div>
        {stages.length > 0 && (
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-500" />
                <SelectValue placeholder="Filter by stage" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {stages
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Areas List / Table View */}
      {areasLoading ? (
        <div className="text-center py-8">Loading areas...</div>
      ) : areas.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Areas Created</h3>
              <p className="text-muted-foreground mb-4">
                {isClient
                  ? "No material areas have been set up for this project yet. Contact your project manager."
                  : "Create your first material area to organize materials by house section."
                }
              </p>
              {!isClient && (
                <Button onClick={() => setIsCreateAreaOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Area
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <MaterialsTableView
          items={filteredItems}
          areas={areas}
          stages={stages}
          projectId={projectId}
          isClient={isClient}
          docCounts={docCounts}
        />
      ) : !isClient ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="space-y-3">
            {areas.map((area) => (
              <MaterialAreaSection
                key={area.id}
                area={area}
                items={filteredItems.filter(item => item.area_id === area.id)}
                projectId={projectId}
                isClient={isClient}
                stages={stages}
                isDragActive={!!activeDragItem}
                docCounts={docCounts}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDragItem ? (
              <div className="bg-background border rounded-lg p-3 shadow-xl opacity-90 max-w-md">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-sm">{activeDragItem.name}</h4>
                    {activeDragItem.spec && (
                      <p className="text-xs text-muted-foreground">{activeDragItem.spec}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="space-y-3">
          {areas.map((area) => (
            <MaterialAreaSection
              key={area.id}
              area={area}
              items={filteredItems.filter(item => item.area_id === area.id)}
              projectId={projectId}
              isClient={isClient}
              stages={stages}
              isDragActive={false}
              docCounts={docCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MaterialAreaSectionProps {
  area: MaterialArea;
  items: MaterialItem[];
  projectId: string;
  isClient?: boolean;
  stages?: ProjectStage[];
  isDragActive?: boolean;
  docCounts?: Record<string, number>;
}

function MaterialAreaSection({ area, items, projectId, isClient = false, stages = [], isDragActive = false, docCounts = {} }: MaterialAreaSectionProps) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: area.id,
  });

  const [isOpen, setIsOpen] = useState(true);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isDeleteAreaDialogOpen, setIsDeleteAreaDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");
  const [pendingFormData, setPendingFormData] = useState<MaterialItemFormData | null>(null);
  const [isEditingAreaName, setIsEditingAreaName] = useState(false);
  const [editAreaName, setEditAreaName] = useState(area.name);
  const [isDuplicateAreaDialogOpen, setIsDuplicateAreaDialogOpen] = useState(false);
  const [duplicateAreaName, setDuplicateAreaName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const itemForm = useForm<MaterialItemFormData>({
    resolver: zodResolver(materialItemSchema),
    defaultValues: {
      name: "",
      spec: "",
      product_link: "",
      vendor: "",
      quantity: "",
      unit_cost: undefined,
    },
  });

  // Calculate area totals
  const areaCost = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity || "0") || 1;
    const cost = item.unit_cost || 0;
    return sum + (qty * cost);
  }, 0);

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: async (data: MaterialItemFormData) => {
      const response = await apiRequest(`/api/material-items`, {
        method: "POST",
        body: {
          area_id: area.id,
          project_id: projectId,
          name: data.name,
          spec: data.spec || null,
          product_link: data.product_link || null,
          vendor: data.vendor || null,
          quantity: data.quantity || null,
          unit_cost: data.unit_cost || null,
          status: "pending",
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-items?project_id=${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      toast({
        title: "Item Added",
        description: "Material item has been added successfully.",
      });
      itemForm.reset();
      setIsAddingItem(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiRequest(`/api/material-items/${itemId}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-items?project_id=${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      toast({
        title: "Item Deleted",
        description: "Material item has been removed.",
      });
    },
  });

  const onSubmitItem = async (data: MaterialItemFormData) => {
    // Check for duplicate name in the same area
    try {
      const response = await fetch(`/api/material-items/check-duplicate?area_id=${area.id}&name=${encodeURIComponent(data.name)}`);
      const result = await response.json();

      if (result.exists) {
        // Show duplicate warning dialog
        setDuplicateName(data.name);
        setPendingFormData(data);
        setIsDuplicateDialogOpen(true);
        return;
      }
    } catch (error) {
      console.error("Error checking for duplicate:", error);
      // Continue with creation if check fails
    }

    createItemMutation.mutate(data);
  };

  const handleDuplicateChangeName = () => {
    setIsDuplicateDialogOpen(false);
    // Focus on name field - form stays open
    setTimeout(() => {
      const nameInput = document.querySelector(`[data-area-id="${area.id}"] input[name="name"]`) as HTMLInputElement;
      if (nameInput) {
        nameInput.focus();
        nameInput.select();
      }
    }, 100);
  };

  const handleDuplicateCancel = () => {
    setIsDuplicateDialogOpen(false);
    setPendingFormData(null);
    setDuplicateName("");
  };

  // Delete area mutation
  const deleteAreaMutation = useMutation({
    mutationFn: async (areaId: string) => {
      const response = await apiRequest(`/api/material-areas/${areaId}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-items?project_id=${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      toast({
        title: "Area Deleted",
        description: "Material area and all its items have been removed.",
      });
    },
  });

  // Rename area mutation
  const renameAreaMutation = useMutation({
    mutationFn: async (newName: string) => {
      const response = await apiRequest(`/api/material-areas/${area.id}`, {
        method: "PATCH",
        body: { name: newName },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      toast({
        title: "Area Renamed",
        description: "Material area has been renamed successfully.",
      });
      setIsEditingAreaName(false);
    },
    onError: (error: Error) => {
      const isDuplicate = error.message.includes("already exists");
      toast({
        title: isDuplicate ? "Name Already Taken" : "Error",
        description: isDuplicate
          ? "An area with this name already exists in this project."
          : "Failed to rename area. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Duplicate area mutation
  const duplicateAreaMutation = useMutation({
    mutationFn: async (newName: string) => {
      const response = await apiRequest(`/api/material-areas/${area.id}/duplicate`, {
        method: "POST",
        body: { new_name: newName },
      });
      return response.json();
    },
    onSuccess: (data: { area?: { name: string }; items_copied: number }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/material-items?project_id=${projectId}`] });
      toast({
        title: "Area Duplicated",
        description: `Created "${data.area?.name || duplicateAreaName}" with ${data.items_copied} material(s).`,
      });
      setIsDuplicateAreaDialogOpen(false);
      setDuplicateAreaName("");
    },
    onError: (error: Error) => {
      const isDuplicate = error.message.includes("already exists");
      toast({
        title: isDuplicate ? "Name Already Taken" : "Error",
        description: isDuplicate
          ? "An area with this name already exists. Please choose a different name."
          : "Failed to duplicate area. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteItem = (itemId: string) => {
    setItemToDelete(itemId);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      deleteItemMutation.mutate(itemToDelete);
      setItemToDelete(null);
    }
  };

  const handleDeleteArea = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteAreaDialogOpen(true);
  };

  const confirmDeleteArea = () => {
    deleteAreaMutation.mutate(area.id);
    setIsDeleteAreaDialogOpen(false);
  };

  const handleEditAreaName = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditAreaName(area.name);
    setIsEditingAreaName(true);
  };

  const handleSaveAreaName = (e: React.MouseEvent) => {
    e.stopPropagation();
    const trimmed = editAreaName.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "Area name cannot be empty.", variant: "destructive" });
      return;
    }
    if (trimmed === area.name) {
      setIsEditingAreaName(false);
      return;
    }
    renameAreaMutation.mutate(trimmed);
  };

  const handleCancelEditAreaName = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingAreaName(false);
    setEditAreaName(area.name);
  };

  const handleDuplicateArea = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDuplicateAreaName(`${area.name} - Copy`);
    setIsDuplicateAreaDialogOpen(true);
  };

  const confirmDuplicateArea = () => {
    const trimmed = duplicateAreaName.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "Area name cannot be empty.", variant: "destructive" });
      return;
    }
    duplicateAreaMutation.mutate(trimmed);
  };

  return (
    <Card
      ref={setDroppableRef}
      className={`transition-all duration-200 ${
        isDragActive ? "ring-2 ring-dashed ring-muted-foreground/30" : ""
      } ${
        isOver ? "ring-2 ring-primary bg-primary/5 scale-[1.01]" : ""
      }`}
    >
      {isOver && !isOpen && (
        <div className="text-xs text-primary text-center py-1 animate-pulse">Drop here</div>
      )}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-accent/50 transition-colors rounded-lg p-2 -m-2">
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="flex-1">
                {isEditingAreaName ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editAreaName}
                      onChange={(e) => setEditAreaName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveAreaName(e as unknown as React.MouseEvent);
                        if (e.key === "Escape") handleCancelEditAreaName(e as unknown as React.MouseEvent);
                      }}
                      className="h-8 text-lg font-semibold"
                      autoFocus
                      data-testid={`input-edit-area-name-${area.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveAreaName}
                      disabled={renameAreaMutation.isPending}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCancelEditAreaName}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-lg">{area.name}</h3>
                    {area.description && (
                      <p className="text-sm text-muted-foreground">{area.description}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2 sm:gap-3 pl-10 sm:pl-0">
            <Badge variant="outline" className="text-xs">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Badge>
            <div className="text-sm font-medium text-green-600 dark:text-green-400">
              ${areaCost.toFixed(2)}
            </div>
            {!isClient && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditAreaName}
                  title="Rename area"
                  data-testid={`button-edit-area-${area.id}`}
                >
                  <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDuplicateArea}
                  title="Duplicate area with all materials"
                  data-testid={`button-duplicate-area-${area.id}`}
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteArea}
                  data-testid={`button-delete-area-${area.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {/* Items List */}
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item) => (
                  <MaterialItemRow
                    key={item.id}
                    item={item}
                    onDelete={handleDeleteItem}
                    projectId={projectId}
                    isClient={isClient}
                    stages={stages}
                    docCount={docCounts[item.id] || 0}
                  />
                ))}
              </div>
            )}

            {/* Add Item Form - Available to all users including clients */}
            {isAddingItem ? (
              <Card className="border-2 border-dashed">
                <CardContent className="p-4">
                  <Form {...itemForm}>
                    <form onSubmit={itemForm.handleSubmit(onSubmitItem)} className="space-y-4" data-area-id={area.id}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Material Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 2x4 Lumber" {...field} data-testid="input-item-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={itemForm.control}
                          name="vendor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vendor</FormLabel>
                              <FormControl>
                                <Input placeholder="Home Depot, Lowes..." {...field} data-testid="input-item-vendor" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={itemForm.control}
                        name="spec"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specifications</FormLabel>
                            <FormControl>
                              <Input placeholder="Dimensions, brand, model..." {...field} data-testid="input-item-spec" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="product_link"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Link</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} data-testid="input-item-link" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 50, 100 sq ft" {...field} data-testid="input-item-quantity" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={itemForm.control}
                          name="unit_cost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Cost</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  data-testid="input-item-cost"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            itemForm.reset();
                            setIsAddingItem(false);
                          }}
                          data-testid="button-cancel-item"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          size="sm"
                          disabled={createItemMutation.isPending}
                          data-testid="button-submit-item"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {createItemMutation.isPending ? "Adding..." : "Add Item"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() => setIsAddingItem(true)}
                data-testid={`button-add-item-${area.id}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item to {area.name}
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Delete Area Confirmation Dialog */}
      <AlertDialog open={isDeleteAreaDialogOpen} onOpenChange={setIsDeleteAreaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Material Area
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>"{area.name}"</strong>?
              </p>
              {items.length > 0 && (
                <p className="text-destructive font-medium">
                  This will also permanently delete all {items.length} {items.length === 1 ? 'item' : 'items'} in this area.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteArea}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-area"
            >
              Delete Area
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Area Dialog */}
      <Dialog open={isDuplicateAreaDialogOpen} onOpenChange={setIsDuplicateAreaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Area</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will create a new area with copies of all {items.length} material{items.length !== 1 ? 's' : ''} from <strong>"{area.name}"</strong>.
              Each material name will have the new area name appended.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Area Name</label>
              <Input
                value={duplicateAreaName}
                onChange={(e) => setDuplicateAreaName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmDuplicateArea();
                }}
                placeholder="Enter name for the duplicated area"
                autoFocus
                data-testid={`input-duplicate-area-name-${area.id}`}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsDuplicateAreaDialogOpen(false)}
                disabled={duplicateAreaMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDuplicateArea}
                disabled={duplicateAreaMutation.isPending || !duplicateAreaName.trim()}
                data-testid={`button-confirm-duplicate-area-${area.id}`}
              >
                {duplicateAreaMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Duplicating...
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Create Duplicate
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Material Item
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this material item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-item"
            >
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Name Warning Dialog */}
      <AlertDialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Material Name Already Exists
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                A material named <strong>"{duplicateName}"</strong> already exists in this area.
              </p>
              <p className="text-muted-foreground">
                Please choose a different name to avoid confusion.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDuplicateCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicateChangeName}>
              Change Name
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

interface MaterialItemRowProps {
  item: MaterialItem;
  onDelete: (id: string) => void;
  projectId: string;
  isClient?: boolean;
  stages?: ProjectStage[];
  docCount?: number;
}

interface MaterialDocument {
  id: string;
  item_id: string;
  file_name: string;
  mime_type?: string;
  download_url?: string;
  uploaded_by: string;
  uploaded_by_email?: string;
  created_at?: string;
}

function MaterialItemRow({ item, onDelete, projectId, isClient = false, stages = [], docCount = 0 }: MaterialItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: item.id,
    disabled: isClient || isEditing,
  });

  const editForm = useForm<MaterialItemFormData>({
    resolver: zodResolver(materialItemSchema),
    defaultValues: {
      name: item.name,
      spec: item.spec || "",
      product_link: item.product_link || "",
      vendor: item.vendor || "",
      quantity: item.quantity || "",
      unit_cost: item.unit_cost || undefined,
      stage_id: item.stage_id || "",
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async (data: MaterialItemFormData) => {
      const response = await apiRequest(`/api/material-items/${item.id}`, {
        method: "PATCH",
        body: {
          name: data.name,
          spec: data.spec || null,
          product_link: data.product_link || null,
          vendor: data.vendor || null,
          quantity: data.quantity || null,
          unit_cost: data.unit_cost || null,
          stage_id: data.stage_id || null,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-items?project_id=${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      toast({
        title: "Item Updated",
        description: "Material item has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmitEdit = (data: MaterialItemFormData) => {
    updateItemMutation.mutate(data);
  };

  // Toggle order status mutation
  const toggleOrderStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await apiRequest(`/api/material-items/${item.id}`, {
        method: "PATCH",
        body: { order_status: newStatus },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-items?project_id=${projectId}`] });
      toast({
        title: "Status Updated",
        description: `Material marked as ${item.order_status === 'ordered' ? 'pending' : 'ordered'}.`,
      });
    },
  });

  // Document queries and mutations
  const { data: documents = [], isLoading: docsLoading } = useQuery<MaterialDocument[]>({
    queryKey: [`/api/material-documents?item_id=${item.id}`],
    enabled: showDocs,
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (params: { documentPath: string; fileName: string; mimeType: string }) => {
      const response = await apiRequest("/api/material-documents", {
        method: "POST",
        body: {
          item_id: item.id,
          project_id: projectId,
          document_path: params.documentPath,
          file_name: params.fileName,
          mime_type: params.mimeType,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-documents?item_id=${item.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/material-documents/count?project_id=${projectId}`] });
      toast({ title: "Document Uploaded", description: "Document attached to material." });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error?.message || "Failed to attach document.",
        variant: "destructive",
      });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await apiRequest(`/api/material-documents/${docId}`, { method: "DELETE" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-documents?item_id=${item.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/material-documents/count?project_id=${projectId}`] });
      toast({ title: "Document Deleted" });
    },
  });

  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const handleDocFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 50MB.", variant: "destructive" });
      e.target.value = "";
      return;
    }

    setIsUploadingDoc(true);
    try {
      // Step 1: Get signed upload URL from GCS
      const uploadParams = await apiRequest("/api/v1/objects/upload", { method: "POST" });
      const { uploadURL, objectPath } = await uploadParams.json();

      // Step 2: Upload file to GCS via signed PUT URL
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      // Step 3: Create document record in database
      uploadDocMutation.mutate({
        documentPath: objectPath,
        fileName: file.name,
        mimeType: file.type,
      });
    } catch (error) {
      toast({ title: "Upload Failed", description: "Could not upload document.", variant: "destructive" });
    } finally {
      setIsUploadingDoc(false);
      e.target.value = "";
    }
  };

  const totalCost = (parseFloat(item.quantity || "0") || 1) * (item.unit_cost || 0);

  if (isEditing) {
    return (
      <Card className="border-2 border-primary/50">
        <CardContent className="p-4">
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 2x4 Lumber"
                          {...field}
                          data-testid="input-edit-name"
                          disabled={isClient}
                          className={isClient ? "bg-muted cursor-not-allowed" : ""}
                        />
                      </FormControl>
                      {isClient && (
                        <p className="text-xs text-muted-foreground">Contact PM to change material name</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <FormControl>
                        <Input placeholder="Home Depot, Lowes..." {...field} data-testid="input-edit-vendor" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="spec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specifications</FormLabel>
                    <FormControl>
                      <Input placeholder="Dimensions, brand, model..." {...field} data-testid="input-edit-spec" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="product_link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} data-testid="input-edit-link" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 50, 100 sq ft" {...field} data-testid="input-edit-quantity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="unit_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-edit-cost"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Stage Assignment - PM/Admin only */}
              {!isClient && stages.length > 0 && (
                <FormField
                  control={editForm.control}
                  name="stage_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-amber-500" />
                        Assigned Stage
                      </FormLabel>
                      <Select
                        value={field.value || "__none__"}
                        onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-stage">
                            <SelectValue placeholder="Select a stage (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No stage assigned</SelectItem>
                          {stages
                            .sort((a, b) => a.orderIndex - b.orderIndex)
                            .map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    editForm.reset();
                    setIsEditing(false);
                  }}
                  data-testid="button-cancel-edit"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateItemMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  <Check className="h-4 w-4 mr-1" />
                  {updateItemMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={setDraggableRef}
      className={`flex items-start gap-3 p-3 bg-muted/30 rounded-lg transition-opacity ${
        isDragging ? "opacity-30" : ""
      }`}
      data-testid={`item-row-${item.id}`}
    >
      {!isClient && (
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-6 h-6 mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors rounded"
          title="Drag to move to another area"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-medium">{item.name}</h4>
            {item.spec && (
              <p className="text-sm text-muted-foreground">{item.spec}</p>
            )}
            {/* Stage indicator with navigation for PMs */}
            {item.stage_name && (
              <div className="flex items-center gap-1 mt-1">
                <Layers className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-muted-foreground">Stage: {item.stage_name}</span>
                {!isClient && item.stage_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-xs text-amber-600 hover:text-amber-700"
                    onClick={() => {
                      window.location.href = `/projects?projectId=${projectId}&tab=stages&highlight=${item.stage_id}`;
                    }}
                    title="Go to stage"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* Order Status Toggle */}
            <div className="flex rounded-md border border-border overflow-hidden shrink-0">
              <button
                onClick={() => {
                  if (item.order_status === 'ordered') {
                    toggleOrderStatusMutation.mutate('pending_to_order');
                  }
                }}
                disabled={toggleOrderStatusMutation.isPending}
                className={cn(
                  "px-2 py-1 text-xs transition-colors",
                  item.order_status !== 'ordered'
                    ? "bg-amber-500 text-white"
                    : "bg-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                Pending
              </button>
              <button
                onClick={() => {
                  if (item.order_status !== 'ordered') {
                    toggleOrderStatusMutation.mutate('ordered');
                  }
                }}
                disabled={toggleOrderStatusMutation.isPending}
                className={cn(
                  "px-2 py-1 text-xs transition-colors",
                  item.order_status === 'ordered'
                    ? "bg-emerald-500 text-white"
                    : "bg-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                Ordered
              </button>
            </div>
            {/* Icon buttons grouped together so they never split across lines */}
            <div className="flex items-center">
              {item.product_link && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  data-testid={`button-link-${item.id}`}
                >
                  <a href={item.product_link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDocs(!showDocs)}
                className="relative"
                title="Documents"
                data-testid={`button-docs-${item.id}`}
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                {docCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {docCount}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                data-testid={`button-edit-${item.id}`}
              >
                <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </Button>
              {!isClient && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(item.id)}
                  data-testid={`button-delete-${item.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-sm text-muted-foreground">
          {item.vendor && <span>📦 {item.vendor}</span>}
          {item.quantity && <span>Qty: {item.quantity}</span>}
          {item.unit_cost !== null && item.unit_cost !== undefined && (
            <span>${item.unit_cost.toFixed(2)}/unit</span>
          )}
          {totalCost > 0 && (
            <span className="font-medium text-green-600 dark:text-green-400">
              Total: ${totalCost.toFixed(2)}
            </span>
          )}
        </div>

        {/* Documents Panel */}
        {showDocs && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Documents {documents.length > 0 && `(${documents.length}/5)`}
              </span>
              {documents.length < 5 && (
                <label className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-cyan-600 dark:text-cyan-400 hover:bg-muted rounded cursor-pointer transition-colors">
                  <Upload className="h-3 w-3" />
                  {isUploadingDoc ? "Uploading..." : "Upload"}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleDocFileSelect}
                    disabled={isUploadingDoc}
                  />
                </label>
              )}
            </div>

            {docsLoading ? (
              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading documents...
              </div>
            ) : documents.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">
                No documents attached. Upload installation manuals, layouts, or specs.
              </p>
            ) : (
              <div className="space-y-1.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 p-2 bg-background rounded border border-border/50 text-xs min-w-0"
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate font-medium min-w-0">{doc.file_name}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      {doc.download_url && (
                        <a
                          href={doc.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-600 dark:text-cyan-400 hover:underline"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => deleteDocMutation.mutate(doc.id)}
                        className="text-destructive hover:text-destructive/80"
                        title="Delete document"
                        disabled={deleteDocMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
