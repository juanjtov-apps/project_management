import { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
    <div ref={setNodeRef} style={style} className="relative pl-14">
      {/* Timeline Dot */}
      <div
        className={`absolute left-4 top-6 w-5 h-5 rounded-full border-4 border-zinc-900 ${config.dotColor} transition-all duration-300`}
      />

      {/* Stage Card */}
      <Card
        className={`bg-zinc-900/80 border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-200 group ${isDragging ? "shadow-xl shadow-black/30 border-amber-500/50" : ""}`}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="flex items-center justify-center w-6 h-6 mt-1 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <GripVertical className="h-5 w-5" />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                  #{index + 1}
                </span>
                <h3 className="font-semibold text-white truncate">{stage.name}</h3>
                <Badge variant="outline" className={`${config.color} border shrink-0`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                {!stage.clientVisible && (
                  <Badge
                    variant="outline"
                    className="bg-zinc-800/50 text-zinc-400 border-zinc-700"
                  >
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hidden
                  </Badge>
                )}
              </div>

              {/* Dates Row */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {stage.plannedStartDate && (
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {formatDate(stage.plannedStartDate)}
                      {stage.plannedEndDate && ` - ${formatDate(stage.plannedEndDate)}`}
                    </span>
                  </div>
                )}

                {stage.finishMaterialsDueDate && (
                  <div
                    className={`flex items-center gap-1.5 ${
                      isMaterialsOverdue
                        ? "text-red-400"
                        : isMaterialsSoon
                          ? "text-amber-400"
                          : "text-zinc-400"
                    }`}
                  >
                    <Package className="h-3.5 w-3.5" />
                    <span>
                      Materials due {formatDate(stage.finishMaterialsDueDate)}
                      {isMaterialsOverdue && (
                        <span className="ml-1 text-red-400">(overdue)</span>
                      )}
                      {isMaterialsSoon && !isMaterialsOverdue && (
                        <span className="ml-1">({daysUntilMaterials}d left)</span>
                      )}
                    </span>
                  </div>
                )}

                {stage.materialCount > 0 && (
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Package className="h-3.5 w-3.5" />
                    <span>
                      {stage.materialCount} material
                      {stage.materialCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Materials Note */}
              {stage.finishMaterialsNote && (
                <p className="mt-2 text-sm text-zinc-500 line-clamp-2">
                  {stage.finishMaterialsNote}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Status Selector */}
              <Select
                value={stage.status}
                onValueChange={(v) => handleStatusChange(stage, v)}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                  <SelectItem value="ACTIVE">In Progress</SelectItem>
                  <SelectItem value="COMPLETE">Complete</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white"
                onClick={() => handleVisibilityToggle(stage)}
                title={stage.clientVisible ? "Hide from client" : "Show to client"}
              >
                {stage.clientVisible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white"
                onClick={() => openEditDialog(stage)}
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-red-400"
                onClick={() => setDeleteStage(stage)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StagesTab({ projectId }: StagesTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<ProjectStage | null>(null);
  const [deleteStage, setDeleteStage] = useState<ProjectStage | null>(null);
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

  // Fetch stages
  const { data: stages = [], isLoading } = useQuery<ProjectStage[]>({
    queryKey: [`/api/v1/stages?projectId=${projectId}`],
    enabled: !!projectId,
  });

  // Calculate order index based on start date for new stages
  const calculateOrderIndex = (startDate: string | null): number => {
    if (!startDate) {
      // No date = place at end
      return stages.length;
    }

    const newDate = new Date(startDate);
    const sortedStages = [...stages].sort((a, b) => a.orderIndex - b.orderIndex);

    // Find position among dated stages
    for (let i = 0; i < sortedStages.length; i++) {
      const stage = sortedStages[i];
      if (!stage.plannedStartDate) {
        // Hit an undated stage, insert before it
        return i;
      }
      if (new Date(stage.plannedStartDate) > newDate) {
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
          finishMaterialsDueDate: data.finishMaterialsDueDate || null,
          finishMaterialsNote: data.finishMaterialsNote || null,
          clientVisible: data.clientVisible,
        },
      });

      // Parse the JSON response to get the created stage with its ID
      const newStage = await response.json();

      // Validate we got a valid ID before using it
      if (!newStage?.id || typeof newStage.id !== "string") {
        throw new Error("Failed to get stage ID from response");
      }

      // If stage has a start date, reorder to position it correctly based on date
      if (data.plannedStartDate) {
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

      return newStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/stages?projectId=${projectId}`],
      });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Stage created successfully" });
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
      data: Partial<ProjectStage>;
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
      setEditingStage(null);
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
          plannedStartDate: data.plannedStartDate || undefined,
          plannedEndDate: data.plannedEndDate || undefined,
          finishMaterialsDueDate: data.finishMaterialsDueDate || undefined,
          finishMaterialsNote: data.finishMaterialsNote || undefined,
          clientVisible: data.clientVisible,
        },
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (stage: ProjectStage) => {
    setEditingStage(stage);
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

  const formatDate = (dateStr?: string) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/50 p-6">
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Layers className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Project Stages
                </h2>
                <p className="text-sm text-zinc-400">
                  {stages.length} stages &middot; {completedStages} complete
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {stages.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => setIsTemplateOpen(true)}
                  className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              )}
              <Button
                onClick={() => {
                  setEditingStage(null);
                  form.reset();
                  setIsCreateOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Stage
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {stages.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Overall Progress</span>
                <span className="text-amber-400 font-medium">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {activeStage && (
                <p className="text-sm text-zinc-500">
                  Currently active:{" "}
                  <span className="text-amber-400">{activeStage.name}</span>
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
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => setIsTemplateOpen(true)}
                className="border-zinc-600 hover:bg-zinc-800"
              >
                <LayoutTemplate className="h-4 w-4 mr-2" />
                Choose Template
              </Button>
              <Button
                onClick={() => setIsCreateOpen(true)}
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
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-amber-500/50 via-zinc-700 to-zinc-800" />

            <SortableContext
              items={[...stages].sort((a, b) => a.orderIndex - b.orderIndex).map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
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
            form.reset();
          }
        }}
      >
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingStage ? "Edit Stage" : "Add New Stage"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editingStage
                ? "Update the stage details below."
                : "Define a new stage for your project timeline."}
            </DialogDescription>
          </DialogHeader>

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

              <div className="grid grid-cols-2 gap-4">
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                    <FormControl>
                      <Input
                        type="date"
                        className="bg-zinc-800 border-zinc-700 text-white"
                        {...field}
                      />
                    </FormControl>
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
        }}
      />
    </div>
  );
}
