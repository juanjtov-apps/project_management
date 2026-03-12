import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Calendar,
  Package,
  Eye,
  EyeOff,
  ChevronRight,
  Layers,
  Clock,
  AlertCircle,
  Sparkles,
  GripVertical,
  LayoutTemplate,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TemplateSelector } from "./template-selector";
import { SuggestedMaterialsReview } from "./suggested-materials-review";

// Stage form schema
const stageSchema = z.object({
  name: z.string().min(1, "Stage name is required"),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  finishMaterialsDueDate: z.string().optional(),
  finishMaterialsNote: z.string().optional(),
  clientVisible: z.boolean().default(true),
});

type StageFormData = z.infer<typeof stageSchema>;

/** Timezone-safe date arithmetic — avoids the UTC-parse + local-getDate mismatch. */
function addDaysToDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().split("T")[0];
}

function daysBetween(startStr: string, endStr: string): number {
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  const s = Date.UTC(sy, sm - 1, sd);
  const e = Date.UTC(ey, em - 1, ed);
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

interface ProjectStage {
  id: string;
  projectId: string;
  orderIndex: number;
  name: string;
  status: "NOT_STARTED" | "ACTIVE" | "COMPLETE";
  plannedStartDate?: string;
  plannedEndDate?: string;
  durationValue?: number;
  durationUnit?: string;
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
  onClose?: () => void;  // Optional close callback for dialog usage
}

const statusConfig = {
  NOT_STARTED: {
    label: "Not Started",
    color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    dotColor: "bg-zinc-500",
    icon: Clock,
  },
  ACTIVE: {
    label: "In Progress",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    dotColor: "bg-amber-500 animate-pulse",
    icon: Sparkles,
  },
  COMPLETE: {
    label: "Complete",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    dotColor: "bg-emerald-500",
    icon: Check,
  },
};

// Sortable Stage Card component for drag-and-drop
interface SortableStageCardProps {
  stage: ProjectStage;
  index: number;
  formatDate: (dateStr?: string) => string | null;
  getDaysUntil: (dateStr?: string) => number | null;
  handleStatusChange: (stage: ProjectStage, newStatus: string) => void;
  handleVisibilityToggle: (stage: ProjectStage) => void;
  openEditDialog: (stage: ProjectStage) => void;
  setDeleteStage: (stage: ProjectStage) => void;
  onInsertBelow: (stage: ProjectStage) => void;
}

function SortableStageCard({
  stage,
  index,
  formatDate,
  getDaysUntil,
  handleStatusChange,
  handleVisibilityToggle,
  openEditDialog,
  setDeleteStage,
  onInsertBelow,
}: SortableStageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const config = statusConfig[stage.status];
  const StatusIcon = config.icon;
  const daysUntilMaterials = getDaysUntil(stage.finishMaterialsDueDate);
  const isMaterialsOverdue = daysUntilMaterials !== null && daysUntilMaterials < 0;
  const isMaterialsSoon =
    daysUntilMaterials !== null && daysUntilMaterials >= 0 && daysUntilMaterials <= 7;

  return (
    <div ref={setNodeRef} style={style} className="relative pl-6 sm:pl-12 group/stage">
      {/* Timeline Dot */}
      <div
        className={`absolute left-1 sm:left-3 top-5 sm:top-6 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-[3px] sm:border-4 border-zinc-900 ${config.dotColor} transition-all duration-300`}
      />

      {/* Stage Card - 16px padding on mobile */}
      <Card
        className={`bg-zinc-900/80 border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-200 group ${isDragging ? "shadow-xl shadow-black/30 border-amber-500/50" : ""}`}
      >
        <CardContent className="p-4 sm:p-5">
          {/* Mobile: Stack layout, Desktop: Side by side */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
            {/* Top row on mobile: Drag handle + Title + Status */}
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
              {/* Drag Handle - 44px touch target */}
              <div
                {...attributes}
                {...listeners}
                className="flex items-center justify-center w-11 h-11 -ml-1 -mt-1 cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 active:text-zinc-200 transition-colors touch-manipulation rounded-lg hover:bg-zinc-800/50"
              >
                <GripVertical className="h-5 w-5" />
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0 pt-1">
                {/* Stage number + Title - 2 lines before truncate */}
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-1 rounded shrink-0 mt-0.5">
                    #{index + 1}
                  </span>
                  <h3 className="font-semibold text-white text-base leading-snug line-clamp-2">
                    {stage.name}
                  </h3>
                </div>

                {/* Status and visibility badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="outline" className={`${config.color} border text-xs py-1 px-2`}>
                    <StatusIcon className="h-3 w-3 mr-1.5" />
                    {config.label}
                  </Badge>
                  {!stage.clientVisible && (
                    <Badge
                      variant="outline"
                      className="bg-zinc-800/50 text-zinc-400 border-zinc-700 text-xs py-1 px-2"
                    >
                      <EyeOff className="h-3 w-3 mr-1" />
                      Hidden
                    </Badge>
                  )}
                </div>

                {/* Dates Row - Better contrast and spacing */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 text-sm">
                  {stage.plannedStartDate && (
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Calendar className="h-4 w-4 text-zinc-500 shrink-0" />
                      <span className="leading-relaxed">
                        {formatDate(stage.plannedStartDate)}
                        {stage.plannedEndDate && ` → ${formatDate(stage.plannedEndDate)}`}
                      </span>
                    </div>
                  )}

                  {stage.durationValue && (
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs">
                        {stage.durationValue} {stage.durationUnit === "hours" ? "hrs" : "days"}
                      </span>
                    </div>
                  )}

                  {stage.finishMaterialsDueDate ? (
                    <div
                      className={`flex items-center gap-2 ${
                        isMaterialsOverdue
                          ? "text-red-400"
                          : isMaterialsSoon
                            ? "text-amber-400"
                            : "text-zinc-300"
                      }`}
                    >
                      <Package className="h-4 w-4 shrink-0 opacity-70" />
                      <span className="leading-relaxed">
                        Materials: {formatDate(stage.finishMaterialsDueDate)}
                        {isMaterialsOverdue && (
                          <span className="ml-1 font-medium">(overdue)</span>
                        )}
                        {isMaterialsSoon && !isMaterialsOverdue && (
                          <span className="ml-1 font-medium">({daysUntilMaterials}d)</span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Package className="h-4 w-4 shrink-0 opacity-50" />
                      <span className="leading-relaxed italic">
                        No finish materials required
                      </span>
                    </div>
                  )}

                  {stage.materialCount > 0 && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Package className="h-4 w-4 shrink-0" />
                      <span>
                        {stage.materialCount} material{stage.materialCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* Materials Note */}
                {stage.finishMaterialsNote && (
                  <p className="mt-3 text-sm text-zinc-500 leading-relaxed line-clamp-2">
                    {stage.finishMaterialsNote}
                  </p>
                )}
              </div>
            </div>

            {/* Actions - Always visible on mobile, stacked vertically on mobile */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              {/* Status Selector - 44px height on mobile */}
              <Select
                value={stage.status}
                onValueChange={(v) => handleStatusChange(stage, v)}
              >
                <SelectTrigger className="w-full sm:w-[130px] h-11 sm:h-9 text-sm sm:text-xs bg-zinc-800 border-zinc-700 touch-manipulation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_STARTED" className="py-3 sm:py-2">Not Started</SelectItem>
                  <SelectItem value="ACTIVE" className="py-3 sm:py-2">In Progress</SelectItem>
                  <SelectItem value="COMPLETE" className="py-3 sm:py-2">Complete</SelectItem>
                </SelectContent>
              </Select>

              {/* Icon buttons - 44px touch targets */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 sm:h-9 sm:w-9 text-zinc-400 hover:text-white hover:bg-zinc-800 touch-manipulation rounded-lg"
                  onClick={() => handleVisibilityToggle(stage)}
                  title={stage.clientVisible ? "Hide from client" : "Show to client"}
                >
                  {stage.clientVisible ? (
                    <Eye className="h-5 w-5 sm:h-4 sm:w-4" />
                  ) : (
                    <EyeOff className="h-5 w-5 sm:h-4 sm:w-4" />
                  )}
                </Button>

                {/* Materials navigation button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 sm:h-9 sm:w-9 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 touch-manipulation rounded-lg relative"
                  onClick={() => {
                    // Navigate to client portal materials tab filtered by this stage
                    window.location.href = `/client-portal?projectId=${stage.projectId}&tab=materials&stageId=${stage.id}`;
                  }}
                  title="View materials for this stage"
                >
                  <Package className="h-5 w-5 sm:h-4 sm:w-4" />
                  {stage.materialCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                      {stage.materialCount > 9 ? "9+" : stage.materialCount}
                    </span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 sm:h-9 sm:w-9 text-zinc-400 hover:text-white hover:bg-zinc-800 touch-manipulation rounded-lg"
                  onClick={() => openEditDialog(stage)}
                  title="Edit stage"
                >
                  <Pencil className="h-5 w-5 sm:h-4 sm:w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 sm:h-9 sm:w-9 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 touch-manipulation rounded-lg"
                  onClick={() => setDeleteStage(stage)}
                  title="Delete stage"
                >
                  <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insert Stage Below button */}
      <div className="flex justify-center py-1 opacity-0 group-hover/stage:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10"
          onClick={(e) => {
            e.stopPropagation();
            onInsertBelow(stage);
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Stage
        </Button>
      </div>
    </div>
  );
}

interface InlineMaterial {
  name: string;
  areaName: string;
}

export function StagesTab({ projectId, onClose }: StagesTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isMaterialsReviewOpen, setIsMaterialsReviewOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<ProjectStage | null>(null);
  const [deleteStage, setDeleteStage] = useState<ProjectStage | null>(null);
  const [finishMaterialsNA, setFinishMaterialsNA] = useState(false);
  const [inlineMaterials, setInlineMaterials] = useState<InlineMaterial[]>([]);
  const [newMaterialName, setNewMaterialName] = useState("");
  const [selectedAreaName, setSelectedAreaName] = useState("");
  const [isCreatingNewArea, setIsCreatingNewArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [customAreaNames, setCustomAreaNames] = useState<string[]>([]);
  const [insertAfterStage, setInsertAfterStage] = useState<ProjectStage | null>(null);
  const [durationDays, setDurationDays] = useState<string>("");
  const [durationUnit, setDurationUnit] = useState<"days" | "hours">("days");
  const durationSourceRef = useRef<"duration" | "endDate" | null>(null);
  const [pendingCascade, setPendingCascade] = useState<{
    afterOrderIndex: number;
    deltaDays: number;
    stageCount: number;
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<StageFormData>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      name: "",
      plannedStartDate: "",
      plannedEndDate: "",
      finishMaterialsDueDate: "",
      finishMaterialsNote: "",
      clientVisible: true,
    },
  });

  // Watch date fields for bidirectional duration sync
  const watchedStartDate = form.watch("plannedStartDate");
  const watchedEndDate = form.watch("plannedEndDate");

  // Duration → End Date: auto-calculate end date when duration changes
  useEffect(() => {
    if (durationSourceRef.current === "duration" && watchedStartDate && durationDays && parseInt(durationDays) > 0) {
      if (durationUnit === "hours") {
        // Hours: end date = start date (sub-day duration, DATE type)
        form.setValue("plannedEndDate", watchedStartDate);
      } else {
        form.setValue("plannedEndDate", addDaysToDate(watchedStartDate, parseInt(durationDays)));
      }
    }
  }, [watchedStartDate, durationDays, durationUnit, form]);

  // End Date → Duration: auto-calculate duration when end date changes (days only)
  useEffect(() => {
    if (durationSourceRef.current === "endDate" && watchedStartDate && watchedEndDate && durationUnit === "days") {
      const diff = daysBetween(watchedStartDate, watchedEndDate);
      if (diff > 0) {
        setDurationDays(String(diff));
      }
    }
  }, [watchedStartDate, watchedEndDate, durationUnit]);

  // Fetch stages
  const { data: stages = [], isLoading } = useQuery<ProjectStage[]>({
    queryKey: [`/api/v1/stages?projectId=${projectId}`],
    enabled: !!projectId,
  });

  // Fetch existing material areas for the dropdown
  const { data: existingAreas = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: [`/api/material-areas?project_id=${projectId}`],
    enabled: !!projectId,
  });

  // Calculate order index based on start date for new stages
  const calculateOrderIndex = (startDate: string | null): number => {
    if (!startDate) {
      // No date = place at end
      return stages.length;
    }

    const sortedStages = [...stages].sort((a, b) => a.orderIndex - b.orderIndex);

    // Find position among dated stages (compare as strings — YYYY-MM-DD sorts correctly)
    for (let i = 0; i < sortedStages.length; i++) {
      const stage = sortedStages[i];
      if (!stage.plannedStartDate) {
        // Hit an undated stage, insert before it
        return i;
      }
      if (stage.plannedStartDate > startDate) {
        return i;
      }
    }

    // Goes after all dated stages
    return sortedStages.length;
  };

  // Create stage mutation with auto-positioning by start date
  const createMutation = useMutation({
    mutationFn: async (data: StageFormData) => {
      // Create the stage - backend auto-assigns order_index at the end
      const response = await apiRequest(`/api/v1/stages`, {
        method: "POST",
        body: {
          projectId,
          name: data.name,
          // Don't send orderIndex - backend will auto-assign it
          plannedStartDate: data.plannedStartDate || null,
          plannedEndDate: data.plannedEndDate || null,
          durationValue: durationDays ? parseInt(durationDays) : null,
          durationUnit: durationUnit,
          finishMaterialsDueDate: data.finishMaterialsDueDate || null,
          finishMaterialsNote: data.finishMaterialsNote || null,
          clientVisible: data.clientVisible,
          materials: inlineMaterials.length > 0 ? inlineMaterials : null,
        },
      });

      // Parse the JSON response to get the created stage with its ID
      const newStage = await response.json();

      // Validate we got a valid ID before using it
      if (!newStage?.id || typeof newStage.id !== "string") {
        throw new Error("Failed to get stage ID from response");
      }

      // If inserting after a specific stage, position right after it
      if (insertAfterStage) {
        const sortedStages = [...stages].sort((a, b) => a.orderIndex - b.orderIndex);
        const insertIdx = sortedStages.findIndex((s) => s.id === insertAfterStage.id);
        const stageIds: string[] = [
          ...sortedStages.slice(0, insertIdx + 1).map((s) => s.id),
          newStage.id,
          ...sortedStages.slice(insertIdx + 1).map((s) => s.id),
        ];

        await apiRequest(`/api/v1/stages/reorder?projectId=${projectId}`, {
          method: "POST",
          body: { stageIds },
        });
      } else if (data.plannedStartDate) {
        // If stage has a start date, reorder to position it correctly based on date
        const insertIndex = calculateOrderIndex(data.plannedStartDate);
        const sortedStages = [...stages].sort((a, b) => a.orderIndex - b.orderIndex);

        // Only reorder if the new stage should not be at the end
        if (insertIndex < sortedStages.length) {
          const stageIds: string[] = [
            ...sortedStages.slice(0, insertIndex).map((s) => s.id),
            newStage.id,
            ...sortedStages.slice(insertIndex).map((s) => s.id),
          ];

          await apiRequest(`/api/v1/stages/reorder?projectId=${projectId}`, {
            method: "POST",
            body: { stageIds },
          });
        }
      }

      // Calculate cascade info for subsequent stages
      let cascadeInfo: { afterOrderIndex: number; deltaDays: number; stageCount: number } | null = null;
      if (data.plannedEndDate) {
        const sortedStages = [...stages].sort((a, b) => a.orderIndex - b.orderIndex);
        let insertedPosition = -1;

        if (insertAfterStage) {
          insertedPosition = sortedStages.findIndex((s) => s.id === insertAfterStage.id) + 1;
        } else if (data.plannedStartDate) {
          insertedPosition = calculateOrderIndex(data.plannedStartDate);
        }

        // Check if there are stages after the inserted position with dates
        if (insertedPosition >= 0 && insertedPosition < sortedStages.length) {
          const nextStage = sortedStages[insertedPosition];
          if (nextStage?.plannedStartDate) {
            const expectedNextStart = addDaysToDate(data.plannedEndDate, 1);
            const deltaDays = daysBetween(nextStage.plannedStartDate, expectedNextStart);
            if (deltaDays !== 0) {
              cascadeInfo = {
                afterOrderIndex: insertedPosition,
                deltaDays,
                stageCount: sortedStages.length - insertedPosition,
              };
            }
          }
        }
      }

      return { newStage, cascadeInfo };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/stages?projectId=${projectId}`],
      });
      if (inlineMaterials.length > 0) {
        queryClient.invalidateQueries({ queryKey: [`/api/material-items?project_id=${projectId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      }
      setIsCreateOpen(false);
      setInsertAfterStage(null);
      setDurationDays("");
      setDurationUnit("days");
      durationSourceRef.current = null;
      setInlineMaterials([]);
      setNewMaterialName("");
      setSelectedAreaName("");
      setIsCreatingNewArea(false);
      setNewAreaName("");
      setCustomAreaNames([]);
      form.reset();
      toast({ title: "Stage created successfully" });

      // Show cascade dialog if applicable
      if (result?.cascadeInfo) {
        setPendingCascade(result.cascadeInfo);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create stage",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update stage mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      stageId,
      data,
    }: {
      stageId: string;
      data: Record<string, unknown>;
    }) => {
      return apiRequest(`/api/v1/stages/${stageId}`, {
        method: "PATCH",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/stages?projectId=${projectId}`],
      });
      if (inlineMaterials.length > 0) {
        queryClient.invalidateQueries({ queryKey: [`/api/material-items?project_id=${projectId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      }
      setEditingStage(null);
      setIsCreateOpen(false);
      setDurationDays("");
      setDurationUnit("days");
      setInlineMaterials([]);
      setNewMaterialName("");
      setSelectedAreaName("");
      setIsCreatingNewArea(false);
      setNewAreaName("");
      setCustomAreaNames([]);
      form.reset();
      toast({ title: "Stage updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update stage",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete stage mutation
  const deleteMutation = useMutation({
    mutationFn: async (stageId: string) => {
      return apiRequest(`/api/v1/stages/${stageId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/stages?projectId=${projectId}`],
      });
      setDeleteStage(null);
      toast({ title: "Stage deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete stage",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reorder stages mutation with optimistic update
  const reorderMutation = useMutation({
    mutationFn: async (stageIds: string[]) => {
      return apiRequest(`/api/v1/stages/reorder?projectId=${projectId}`, {
        method: "POST",
        body: { stageIds },
      });
    },
    // Optimistic update for smooth drag UX
    onMutate: async (stageIds: string[]) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [`/api/v1/stages?projectId=${projectId}`],
      });

      // Snapshot previous value
      const previousStages = queryClient.getQueryData<ProjectStage[]>(
        [`/api/v1/stages?projectId=${projectId}`]
      );

      // Optimistically update to new order
      if (previousStages) {
        const reorderedStages = stageIds.map((id, index) => {
          const stage = previousStages.find((s) => s.id === id)!;
          return { ...stage, orderIndex: index };
        });
        queryClient.setQueryData(
          [`/api/v1/stages?projectId=${projectId}`],
          reorderedStages
        );
      }

      return { previousStages };
    },
    onError: (error: any, _stageIds, context) => {
      // Revert on error
      if (context?.previousStages) {
        queryClient.setQueryData(
          [`/api/v1/stages?projectId=${projectId}`],
          context.previousStages
        );
      }
      toast({
        title: "Failed to reorder stages",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/stages?projectId=${projectId}`],
      });
    },
  });

  // Shift dates mutation for cascading subsequent stages
  const shiftDatesMutation = useMutation({
    mutationFn: async (params: { afterOrderIndex: number; deltaDays: number }) => {
      return apiRequest(`/api/v1/stages/shift-dates?projectId=${projectId}`, {
        method: "POST",
        body: { afterOrderIndex: params.afterOrderIndex, deltaDays: params.deltaDays },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/stages?projectId=${projectId}`],
      });
      setPendingCascade(null);
      toast({ title: "Subsequent stage dates adjusted" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to adjust dates",
        description: error.message,
        variant: "destructive",
      });
      setPendingCascade(null);
    },
  });

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const sortedStages = [...stages].sort((a, b) => a.orderIndex - b.orderIndex);
      const oldIndex = sortedStages.findIndex((s) => s.id === active.id);
      const newIndex = sortedStages.findIndex((s) => s.id === over.id);

      const reorderedStages = arrayMove(sortedStages, oldIndex, newIndex);
      const stageIds = reorderedStages.map((s) => s.id);

      reorderMutation.mutate(stageIds);
    }
  };

  const handleStatusChange = (stage: ProjectStage, newStatus: string) => {
    updateMutation.mutate({
      stageId: stage.id,
      data: { status: newStatus as ProjectStage["status"] },
    });
  };

  const handleVisibilityToggle = (stage: ProjectStage) => {
    updateMutation.mutate({
      stageId: stage.id,
      data: { clientVisible: !stage.clientVisible },
    });
  };

  const onSubmit = (data: StageFormData) => {
    if (editingStage) {
      updateMutation.mutate({
        stageId: editingStage.id,
        data: {
          name: data.name,
          plannedStartDate: data.plannedStartDate || null,
          plannedEndDate: data.plannedEndDate || null,
          durationValue: durationDays ? parseInt(durationDays) : null,
          durationUnit: durationUnit,
          finishMaterialsDueDate: data.finishMaterialsDueDate || null,
          finishMaterialsNote: data.finishMaterialsNote || null,
          clientVisible: data.clientVisible,
          ...(inlineMaterials.length > 0 ? { materials: inlineMaterials } : {}),
        },
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (stage: ProjectStage) => {
    setEditingStage(stage);
    setInsertAfterStage(null);
    setFinishMaterialsNA(!stage.finishMaterialsDueDate);
    setDurationDays(stage.durationValue?.toString() || "");
    setDurationUnit((stage.durationUnit as "days" | "hours") || "days");
    durationSourceRef.current = null;
    setInlineMaterials([]);
    setNewMaterialName("");
    setSelectedAreaName("");
    setIsCreatingNewArea(false);
    setNewAreaName("");
    setCustomAreaNames([]);
    form.reset({
      name: stage.name,
      plannedStartDate: stage.plannedStartDate?.split("T")[0] || "",
      plannedEndDate: stage.plannedEndDate?.split("T")[0] || "",
      finishMaterialsDueDate: stage.finishMaterialsDueDate?.split("T")[0] || "",
      finishMaterialsNote: stage.finishMaterialsNote || "",
      clientVisible: stage.clientVisible,
    });
    setIsCreateOpen(true);
  };

  const handleInsertBelow = (stage: ProjectStage) => {
    setEditingStage(null);
    setInsertAfterStage(stage);
    setFinishMaterialsNA(false);
    setDurationDays("");
    setDurationUnit("days");
    durationSourceRef.current = null;
    setInlineMaterials([]);
    setNewMaterialName("");
    setSelectedAreaName("");
    setIsCreatingNewArea(false);
    setNewAreaName("");
    setCustomAreaNames([]);

    // Pre-fill start date as day after previous stage's end date
    let prefillStartDate = "";
    if (stage.plannedEndDate) {
      prefillStartDate = addDaysToDate(stage.plannedEndDate, 1);
    }

    form.reset({
      name: "",
      plannedStartDate: prefillStartDate,
      plannedEndDate: "",
      finishMaterialsDueDate: "",
      finishMaterialsNote: "",
      clientVisible: true,
    });
    setIsCreateOpen(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntil = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateStr.split("-").map(Number);
    const target = new Date(y, m - 1, d);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Progress - Mobile optimized */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/50 p-4 sm:p-6">
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative">
          {/* Header row - title and buttons on same row on desktop */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-5">
            {/* Title section with close button */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Close button - 44px touch target */}
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-11 w-11 sm:h-9 sm:w-9 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white flex-shrink-0 touch-manipulation -ml-1"
                >
                  <X className="h-5 w-5 sm:h-4 sm:w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              )}
              <div className="p-2.5 sm:p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Layers className="h-5 w-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-white leading-tight">
                  Project Stages
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed mt-0.5">
                  {stages.length} stages · {completedStages} complete
                </p>
              </div>
            </div>

            {/* Action buttons - full width on mobile, inline on desktop */}
            <div className="flex gap-3 w-full sm:w-auto">
              {stages.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => setIsTemplateOpen(true)}
                  className="flex-1 sm:flex-none border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-11 sm:h-10 text-sm font-medium touch-manipulation"
                >
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  Template
                </Button>
              )}
              <Button
                onClick={() => {
                  setEditingStage(null);
                  setInsertAfterStage(null);
                  setDurationDays("");
                  setDurationUnit("days");
                  durationSourceRef.current = null;
                  form.reset();
                  setFinishMaterialsNA(false);
                  setIsCreateOpen(true);
                }}
                className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-black font-semibold h-11 sm:h-10 text-sm touch-manipulation"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Stage
              </Button>
            </div>
          </div>

          {/* Progress Bar - More vertical spacing */}
          {stages.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-zinc-700/30">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400 font-medium">Overall Progress</span>
                <span className="text-sm text-amber-400 font-semibold tabular-nums">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {activeStage && (
                <p className="text-sm text-zinc-500 leading-relaxed pt-1">
                  Currently active:{" "}
                  <span className="text-amber-400 font-medium">{activeStage.name}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {stages.length === 0 && (
        <Card className="bg-zinc-900/50 border-zinc-700/50 border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <Layers className="h-8 w-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              No Stages Yet
            </h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Create stages to track your project progress. Use a template to
              get started quickly, or add stages manually.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => setIsTemplateOpen(true)}
                className="border-zinc-600 hover:bg-zinc-800"
              >
                <LayoutTemplate className="h-4 w-4 mr-2" />
                Choose Template
              </Button>
              <Button
                onClick={() => {
                  setEditingStage(null);
                  setInsertAfterStage(null);
                  setDurationDays("");
                  setDurationUnit("days");
                  durationSourceRef.current = null;
                  form.reset();
                  setFinishMaterialsNA(false);
                  setIsCreateOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Stage
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stages Timeline with Drag-and-Drop */}
      {stages.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="relative">
            {/* Timeline Line - Responsive positioning */}
            <div className="absolute left-3 sm:left-5 top-0 bottom-0 w-px bg-gradient-to-b from-amber-500/50 via-zinc-700 to-zinc-800" />

            <SortableContext
              items={[...stages].sort((a, b) => a.orderIndex - b.orderIndex).map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {/* Card spacing: 12px on mobile, 16px on desktop */}
              <div className="space-y-3 sm:space-y-4">
                {[...stages]
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((stage, index) => (
                    <SortableStageCard
                      key={stage.id}
                      stage={stage}
                      index={index}
                      formatDate={formatDate}
                      getDaysUntil={getDaysUntil}
                      handleStatusChange={handleStatusChange}
                      handleVisibilityToggle={handleVisibilityToggle}
                      openEditDialog={openEditDialog}
                      setDeleteStage={setDeleteStage}
                      onInsertBelow={handleInsertBelow}
                    />
                  ))}
              </div>
            </SortableContext>
          </div>
        </DndContext>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingStage(null);
            setInsertAfterStage(null);
            setDurationDays("");
            setDurationUnit("days");
            durationSourceRef.current = null;
            setInlineMaterials([]);
            setNewMaterialName("");
            setSelectedAreaName("");
            setIsCreatingNewArea(false);
            setNewAreaName("");
            setCustomAreaNames([]);
            form.reset();
          }
        }}
      >
        <DialogContent hideCloseButton className="bg-zinc-900 border-zinc-700 w-[calc(100vw-2rem)] sm:w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col mx-4 sm:mx-auto">
          {/* Apple HIG pattern: Close (left) → Title → Actions (right) */}
          <DialogHeader className="flex flex-row items-center gap-3">
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white flex-shrink-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
            <div className="flex-1">
              <DialogTitle className="text-white">
                {editingStage ? "Edit Stage" : "Add New Stage"}
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                {editingStage
                  ? "Update the stage details below."
                  : "Define a new stage for your project timeline."}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto flex-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Stage Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Demo & Prep, Rough Plumbing..."
                        className="bg-zinc-800 border-zinc-700 text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="plannedStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">
                        Start Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="bg-zinc-800 border-zinc-700 text-white"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            // If duration is filled, recalculate end date
                            if (durationDays && parseInt(durationDays) > 0) {
                              durationSourceRef.current = "duration";
                            }
                          }}
                        />
                      </FormControl>
                      {/* "Day after previous stage" button */}
                      {!editingStage && (() => {
                        const sortedStages = [...stages].sort((a, b) => a.orderIndex - b.orderIndex);
                        const prevStage = insertAfterStage || (sortedStages.length > 0 ? sortedStages[sortedStages.length - 1] : null);
                        if (prevStage?.plannedEndDate) {
                          return (
                            <button
                              type="button"
                              className="text-xs text-amber-400 hover:text-amber-300 hover:underline mt-1 text-left"
                              onClick={() => {
                                const dateStr = addDaysToDate(prevStage.plannedEndDate!, 1);
                                form.setValue("plannedStartDate", dateStr);
                                if (durationDays && parseInt(durationDays) > 0) {
                                  durationSourceRef.current = "duration";
                                }
                              }}
                            >
                              Day after {prevStage.name} ends
                            </button>
                          );
                        }
                        return null;
                      })()}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel className="text-zinc-300">Duration</FormLabel>
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      min="1"
                      placeholder={durationUnit === "hours" ? "4" : "14"}
                      className="bg-zinc-800 border-zinc-700 text-white min-w-[60px] flex-1"
                      value={durationDays}
                      onChange={(e) => {
                        durationSourceRef.current = "duration";
                        setDurationDays(e.target.value);
                      }}
                    />
                    <Select
                      value={durationUnit}
                      onValueChange={(val: "days" | "hours") => {
                        setDurationUnit(val);
                        if (durationDays) {
                          durationSourceRef.current = "duration";
                        }
                      }}
                    >
                      <SelectTrigger className="w-[72px] shrink-0 bg-zinc-800 border-zinc-700 text-white text-xs px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="hours">Hrs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </FormItem>

                <FormField
                  control={form.control}
                  name="plannedEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">End Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="bg-zinc-800 border-zinc-700 text-white"
                          {...field}
                          onChange={(e) => {
                            durationSourceRef.current = "endDate";
                            field.onChange(e);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="finishMaterialsDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">
                      Finish Materials Due Date
                    </FormLabel>
                    <div className="flex items-center gap-3">
                      <FormControl>
                        <Input
                          type="date"
                          className="bg-zinc-800 border-zinc-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={finishMaterialsNA}
                          {...field}
                        />
                      </FormControl>
                      <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer whitespace-nowrap">
                        <Checkbox
                          checked={finishMaterialsNA}
                          onCheckedChange={(checked) => {
                            setFinishMaterialsNA(!!checked);
                            if (checked) {
                              field.onChange("");  // Clear date when N/A is checked
                            }
                          }}
                          className="border-zinc-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        N/A
                      </label>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="finishMaterialsNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">
                      Materials Note
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What materials are needed for this stage?"
                        className="bg-zinc-800 border-zinc-700 text-white resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Inline Finish Materials */}
              {!finishMaterialsNA && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-zinc-300">
                      Finish Materials
                    </label>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Add materials needed for this stage. They will appear in the Materials tab.
                    </p>
                  </div>

                  {/* Existing materials count (edit mode) */}
                  {editingStage && editingStage.materialCount > 0 && (
                    <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                      <Package className="h-4 w-4 text-amber-400" />
                      <span className="text-sm text-zinc-300">
                        {editingStage.materialCount} material{editingStage.materialCount !== 1 ? "s" : ""} already linked
                      </span>
                    </div>
                  )}

                  {/* List of added materials */}
                  {inlineMaterials.length > 0 && (
                    <div className="space-y-1.5">
                      {inlineMaterials.map((mat, i) => (
                        <div key={i} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                          <Package className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <span className="text-sm text-zinc-200 flex-1 truncate">{mat.name}</span>
                          <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400 shrink-0">
                            {mat.areaName}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-zinc-500 hover:text-red-400 shrink-0"
                            onClick={() => setInlineMaterials(prev => prev.filter((_, idx) => idx !== i))}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Area selector */}
                  <div className="space-y-2">
                    {!isCreatingNewArea ? (
                      <Select
                        value={selectedAreaName}
                        onValueChange={(value) => {
                          if (value === "__new__") {
                            setIsCreatingNewArea(true);
                            setSelectedAreaName("");
                          } else {
                            setSelectedAreaName(value);
                          }
                        }}
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm">
                          <SelectValue placeholder="Select area..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          {existingAreas.map((area) => (
                            <SelectItem key={area.id} value={area.name} className="text-zinc-200">
                              {area.name}
                            </SelectItem>
                          ))}
                          {customAreaNames
                            .filter((c) => !existingAreas.some((a) => a.name === c))
                            .map((name) => (
                              <SelectItem key={`custom-${name}`} value={name} className="text-zinc-200">
                                {name}
                              </SelectItem>
                            ))}
                          <SelectItem value="__new__" className="text-amber-400">
                            + Create new area
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="New area name..."
                          className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm flex-1"
                          value={newAreaName}
                          onChange={(e) => setNewAreaName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newAreaName.trim()) {
                              e.preventDefault();
                              const name = newAreaName.trim();
                              setCustomAreaNames((prev) => prev.includes(name) ? prev : [...prev, name]);
                              setSelectedAreaName(name);
                              setIsCreatingNewArea(false);
                              setNewAreaName("");
                            }
                            if (e.key === "Escape") {
                              setIsCreatingNewArea(false);
                              setNewAreaName("");
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-green-400 hover:text-green-300 shrink-0"
                          disabled={!newAreaName.trim()}
                          onClick={() => {
                            if (newAreaName.trim()) {
                              const name = newAreaName.trim();
                              setCustomAreaNames((prev) => prev.includes(name) ? prev : [...prev, name]);
                              setSelectedAreaName(name);
                              setIsCreatingNewArea(false);
                              setNewAreaName("");
                            }
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-zinc-400 hover:text-white shrink-0"
                          onClick={() => {
                            setIsCreatingNewArea(false);
                            setNewAreaName("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Material name input + add button */}
                  <div className="flex gap-2">
                    <Input
                      placeholder={selectedAreaName ? "Material name..." : "Select an area first..."}
                      className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm flex-1"
                      value={newMaterialName}
                      disabled={!selectedAreaName}
                      onChange={(e) => setNewMaterialName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newMaterialName.trim() && selectedAreaName) {
                          e.preventDefault();
                          setInlineMaterials(prev => [...prev, { name: newMaterialName.trim(), areaName: selectedAreaName }]);
                          setNewMaterialName("");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 border-zinc-700 text-zinc-400 hover:text-amber-400 shrink-0"
                      disabled={!newMaterialName.trim() || !selectedAreaName}
                      onClick={() => {
                        if (newMaterialName.trim() && selectedAreaName) {
                          setInlineMaterials(prev => [...prev, { name: newMaterialName.trim(), areaName: selectedAreaName }]);
                          setNewMaterialName("");
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="clientVisible"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0 rounded-lg border border-zinc-700 p-3 bg-zinc-800/50">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-amber-500 focus:ring-amber-500"
                      />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel className="text-zinc-300 font-normal">
                        Visible to client
                      </FormLabel>
                      <p className="text-xs text-zinc-500">
                        Client can see this stage in their portal
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingStage
                      ? "Save Changes"
                      : "Create Stage"}
                </Button>
              </div>
            </form>
          </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteStage}
        onOpenChange={(open) => !open && setDeleteStage(null)}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete Stage
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete "{deleteStage?.name}"? Any
              materials linked to this stage will be unlinked but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStage && deleteMutation.mutate(deleteStage.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Stage"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template Selector */}
      <TemplateSelector
        projectId={projectId}
        open={isTemplateOpen}
        onOpenChange={setIsTemplateOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: [`/api/v1/stages?projectId=${projectId}`],
          });
          // Open materials review dialog after template is applied
          setIsMaterialsReviewOpen(true);
        }}
      />

      {/* Suggested Materials Review */}
      <SuggestedMaterialsReview
        projectId={projectId}
        open={isMaterialsReviewOpen}
        onOpenChange={setIsMaterialsReviewOpen}
        onComplete={() => {
          // Refresh stages to update material counts
          queryClient.invalidateQueries({
            queryKey: [`/api/v1/stages?projectId=${projectId}`],
          });
        }}
      />

      {/* Cascade Dates Confirmation */}
      <AlertDialog open={!!pendingCascade} onOpenChange={(open) => !open && setPendingCascade(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Adjust subsequent stages?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {pendingCascade && (
                <>
                  This will shift {pendingCascade.stageCount} subsequent stage{pendingCascade.stageCount !== 1 ? "s" : ""} by{" "}
                  <span className="text-white font-medium">
                    {Math.abs(pendingCascade.deltaDays)} day{Math.abs(pendingCascade.deltaDays) !== 1 ? "s" : ""}
                    {pendingCascade.deltaDays > 0 ? " forward" : " back"}
                  </span>{" "}
                  to maintain the timeline.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
              No, keep dates
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingCascade && shiftDatesMutation.mutate({
                afterOrderIndex: pendingCascade.afterOrderIndex,
                deltaDays: pendingCascade.deltaDays,
              })}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {shiftDatesMutation.isPending ? "Adjusting..." : "Yes, adjust dates"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
