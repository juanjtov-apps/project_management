import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Layers,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SuggestedMaterial {
  id: string;
  areaId: string;
  projectId: string;
  name: string;
  spec?: string;
  productLink?: string;
  vendor?: string;
  quantity?: string;
  unitCost?: number;
  status: string;
  stageId?: string;
  approvalStatus: string;
  isFromTemplate: boolean;
  areaName: string;
  stageName?: string;
}

interface SuggestedMaterialsReviewProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function SuggestedMaterialsReview({
  projectId,
  open,
  onOpenChange,
  onComplete,
}: SuggestedMaterialsReviewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch suggested materials
  const { data: materials = [], isLoading, refetch } = useQuery<SuggestedMaterial[]>({
    queryKey: ["/api/v1/materials/suggested", projectId],
    queryFn: async () => {
      const response = await apiRequest(
        `/api/v1/materials/suggested?projectId=${projectId}`
      );
      return response.json();
    },
    enabled: open && !!projectId,
  });

  // Group materials by area
  const materialsByArea = materials.reduce((acc, material) => {
    const area = material.areaName || "Unassigned";
    if (!acc[area]) {
      acc[area] = [];
    }
    acc[area].push(material);
    return acc;
  }, {} as Record<string, SuggestedMaterial[]>);

  // Initialize expanded areas on first load
  if (Object.keys(materialsByArea).length > 0 && expandedAreas.size === 0) {
    setExpandedAreas(new Set(Object.keys(materialsByArea)));
  }

  // Approval mutation
  const approveMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: "approve" | "reject" }) => {
      const response = await apiRequest("/api/v1/materials/approve-bulk", {
        method: "POST",
        body: {
          material_ids: ids,
          action,
        },
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.action === "approve" ? "Materials Approved" : "Materials Rejected",
        description: data.message,
      });
      // Clear selection and refetch
      setSelectedIds(new Set());
      refetch();
      // Invalidate material queries
      queryClient.invalidateQueries({ queryKey: [`/api/material-items?project_id=${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/stages"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleArea = (area: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(area)) {
      newExpanded.delete(area);
    } else {
      newExpanded.add(area);
    }
    setExpandedAreas(newExpanded);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(materials.map((m) => m.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const handleApproveSelected = () => {
    if (selectedIds.size === 0) return;
    approveMutation.mutate({ ids: Array.from(selectedIds), action: "approve" });
  };

  const handleRejectSelected = () => {
    if (selectedIds.size === 0) return;
    approveMutation.mutate({ ids: Array.from(selectedIds), action: "reject" });
  };

  const handleApproveAll = () => {
    if (materials.length === 0) return;
    approveMutation.mutate({
      ids: materials.map((m) => m.id),
      action: "approve",
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    onComplete?.();
  };

  const hasNoMaterials = !isLoading && materials.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-amber-400" />
            Review Suggested Materials
          </DialogTitle>
          <DialogDescription>
            These finish materials were auto-generated from your selected template.
            Review and approve materials to make them visible to clients.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        ) : hasNoMaterials ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-zinc-200">All Done!</h3>
            <p className="text-sm text-zinc-500 mt-1">
              No pending materials to review.
            </p>
            <Button onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Action bar */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectNone}
                  className="text-xs"
                >
                  Clear
                </Button>
                <span className="text-sm text-zinc-500">
                  {selectedIds.size} of {materials.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectSelected}
                  disabled={selectedIds.size === 0 || approveMutation.isPending}
                  className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject Selected
                </Button>
                <Button
                  size="sm"
                  onClick={handleApproveSelected}
                  disabled={selectedIds.size === 0 || approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve Selected
                </Button>
              </div>
            </div>

            {/* Materials list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {Object.entries(materialsByArea).map(([area, areaMaterials]) => (
                <div
                  key={area}
                  className="border border-zinc-800 rounded-lg overflow-hidden"
                >
                  {/* Area header */}
                  <button
                    onClick={() => toggleArea(area)}
                    className="w-full flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedAreas.has(area) ? (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-500" />
                      )}
                      <Package className="h-4 w-4 text-amber-400" />
                      <span className="font-medium text-zinc-200">{area}</span>
                    </div>
                    <Badge variant="secondary" className="bg-zinc-700">
                      {areaMaterials.length} items
                    </Badge>
                  </button>

                  {/* Area materials */}
                  {expandedAreas.has(area) && (
                    <div className="divide-y divide-zinc-800">
                      {areaMaterials.map((material) => (
                        <div
                          key={material.id}
                          className={`flex items-center gap-3 p-3 hover:bg-zinc-800/30 transition-colors ${
                            selectedIds.has(material.id) ? "bg-zinc-800/50" : ""
                          }`}
                        >
                          <Checkbox
                            checked={selectedIds.has(material.id)}
                            onCheckedChange={() => toggleSelect(material.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-200 truncate">
                                {material.name}
                              </span>
                              {material.spec && (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-zinc-400 border-zinc-700"
                                >
                                  {material.spec}
                                </Badge>
                              )}
                            </div>
                            {material.stageName && (
                              <div className="flex items-center gap-1 mt-1">
                                <Layers className="h-3 w-3 text-zinc-500" />
                                <span className="text-xs text-zinc-500">
                                  Stage: {material.stageName}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() =>
                                approveMutation.mutate({
                                  ids: [material.id],
                                  action: "reject",
                                })
                              }
                              disabled={approveMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                              onClick={() =>
                                approveMutation.mutate({
                                  ids: [material.id],
                                  action: "approve",
                                })
                              }
                              disabled={approveMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <Button variant="ghost" onClick={handleClose}>
                Review Later
              </Button>
              <Button
                onClick={handleApproveAll}
                disabled={materials.length === 0 || approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Approve All ({materials.length})
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
