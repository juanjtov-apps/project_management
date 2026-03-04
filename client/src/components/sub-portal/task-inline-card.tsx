import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  FileText,
  Upload,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Loader2,
  ClipboardCheck,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface DocumentInfo {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
}

interface ChecklistItem {
  id: string;
  description: string;
  isCompleted: boolean;
  itemType: "standard" | "doc_required" | "inspection";
  notes?: string;
  documents?: DocumentInfo[];
  sortOrder: number;
}

interface Checklist {
  id: string;
  name: string;
  items: ChecklistItem[];
}

interface ReviewEntry {
  id: string;
  decision: "approved" | "revision_requested" | "rejected";
  feedback?: string;
  reviewerName?: string;
  reviewedAt: string;
}

interface TaskDetailData {
  id: string;
  name: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "not_started" | "in_progress" | "pending_review" | "revision_requested" | "approved" | "rejected";
  startDate?: string;
  endDate?: string;
  checklists: Checklist[];
  reviews: ReviewEntry[];
}

interface TaskSummary {
  id: string;
  name: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "not_started" | "in_progress" | "pending_review" | "revision_requested" | "approved" | "rejected";
  endDate?: string;
}

interface TaskInlineCardProps {
  taskId: string;
  projectId: string;
  taskSummary: TaskSummary;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  in_progress: { label: "In Progress", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  pending_review: { label: "Pending Review", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  revision_requested: { label: "Revision Requested", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  approved: { label: "Approved", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  rejected: { label: "Rejected", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  medium: { label: "Medium", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  high: { label: "High", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  urgent: { label: "Urgent", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const itemTypeConfig: Record<string, { label: string; className: string; icon: typeof ClipboardCheck }> = {
  standard: { label: "Standard", className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", icon: ClipboardCheck },
  doc_required: { label: "Doc Required", className: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: FileText },
  inspection: { label: "Inspection", className: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Eye },
};

const reviewDecisionConfig: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  revision_requested: { label: "Revision Requested", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  rejected: { label: "Rejected", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function TaskInlineCard({ taskId, projectId, taskSummary }: TaskInlineCardProps) {
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: task } = useQuery<TaskDetailData>({
    queryKey: ["/api/v1/sub/tasks", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sub/tasks/${taskId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch task");
      return res.json();
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, completed, notes }: { itemId: string; completed: boolean; notes?: string }) => {
      const endpoint = completed
        ? `/api/v1/sub/checklist-items/${itemId}/complete`
        : `/api/v1/sub/checklist-items/${itemId}/uncomplete`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to update item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/sub/tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/sub/my-tasks", projectId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update checklist item.", variant: "destructive" });
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: async ({ itemId, filePath, fileName, mimeType, fileSize }: { itemId: string; filePath: string; fileName: string; mimeType: string; fileSize: number }) => {
      const res = await fetch(`/api/v1/sub/checklist-items/${itemId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ filePath, fileName, mimeType, fileSize }),
      });
      if (!res.ok) throw new Error("Failed to upload");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/sub/tasks", taskId] });
      toast({ title: "Document Uploaded" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload document.", variant: "destructive" });
    },
  });

  const submitForReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/sub/tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "pending_review" }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/sub/tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/sub/my-tasks", projectId] });
      toast({ title: "Submitted for Review" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit for review.", variant: "destructive" });
    },
  });

  const startTaskMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/sub/tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "in_progress" }),
      });
      if (!res.ok) throw new Error("Failed to start");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/sub/tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/sub/my-tasks", projectId] });
      toast({ title: "Task Started" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start task.", variant: "destructive" });
    },
  });

  // Use live data when available, fall back to summary for instant render
  const currentStatus = task?.status || taskSummary.status;
  const currentPriority = task?.priority || taskSummary.priority;
  const endDate = task?.endDate || taskSummary.endDate;
  const status = statusConfig[currentStatus] || statusConfig.not_started;
  const priority = priorityConfig[currentPriority] || priorityConfig.medium;

  const canSubmitForReview = currentStatus === "in_progress" || currentStatus === "revision_requested";
  const canStartTask = currentStatus === "not_started";
  const isTerminal = currentStatus === "approved" || currentStatus === "rejected";

  const isOverdue = endDate && new Date(endDate) < new Date() && !isTerminal;
  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

  const checklists = task?.checklists || [];
  const reviews = task?.reviews || [];

  return (
    <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <h3 className="text-lg font-bold text-[var(--pro-text-primary)]">
                {task?.name || taskSummary.name}
              </h3>
              <Badge variant="outline" className={priority.className}>{priority.label}</Badge>
              <Badge variant="outline" className={status.className}>{status.label}</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {endDate && (
                <div className={`flex items-center gap-1 ${isOverdue ? "text-red-400" : "text-[var(--pro-text-secondary)]"}`}>
                  {isOverdue ? <AlertCircle className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
                  <span>{isOverdue ? "Overdue: " : "Due: "}{formatDate(endDate)}</span>
                </div>
              )}
              {task?.description && (
                <span className="text-[var(--pro-text-muted)] hidden sm:inline truncate max-w-xs">
                  {task.description}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0">
            {canStartTask && (
              <Button
                size="sm"
                onClick={() => startTaskMutation.mutate()}
                disabled={startTaskMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {startTaskMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Clock className="h-4 w-4 mr-1.5" />}
                Start Task
              </Button>
            )}
            {canSubmitForReview && (
              <Button
                size="sm"
                onClick={() => submitForReviewMutation.mutate()}
                disabled={submitForReviewMutation.isPending}
                className="bg-[var(--pro-mint)] text-[var(--pro-bg-deep)] hover:bg-[var(--pro-mint)]/90"
              >
                {submitForReviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                Submit for Review
              </Button>
            )}
          </div>
        </div>

        {/* Revision feedback banner */}
        {currentStatus === "revision_requested" && reviews.length > 0 && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
            <p className="text-sm font-medium text-orange-400 mb-1">Revision Requested</p>
            <p className="text-sm text-[var(--pro-text-secondary)]">
              {reviews[0].feedback || "Please review and address the requested changes."}
            </p>
          </div>
        )}

        {/* Checklists */}
        {checklists.length > 0 && (
          <div className="space-y-3 pt-1 border-t border-[var(--pro-border)]">
            {checklists.map((checklist) => {
              const done = checklist.items.filter((i) => i.isCompleted).length;
              const total = checklist.items.length;

              return (
                <div key={checklist.id}>
                  {/* Checklist header */}
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardCheck className="h-4 w-4 text-[var(--pro-mint)]" />
                    <span className="text-sm font-semibold text-[var(--pro-text-primary)]">
                      {checklist.name}
                    </span>
                    <span className="text-xs text-[var(--pro-text-muted)]">
                      {done}/{total}
                    </span>
                    {done === total && total > 0 && (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </div>

                  {/* Items */}
                  <div className="space-y-2 pl-1">
                    {checklist.items
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item) => {
                        const typeConf = itemTypeConfig[item.itemType] || itemTypeConfig.standard;
                        const TypeIcon = typeConf.icon;

                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg border p-3 space-y-2 ${
                              item.isCompleted
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : "bg-[var(--pro-surface-highlight)] border-[var(--pro-border)]"
                            }`}
                          >
                            {/* Checkbox + description + badge */}
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={item.isCompleted}
                                disabled={isTerminal || (!item.isCompleted && item.itemType === "doc_required" && (!item.documents || item.documents.length === 0))}
                                onCheckedChange={(checked) => {
                                  toggleItemMutation.mutate({
                                    itemId: item.id,
                                    completed: !!checked,
                                    notes: itemNotes[item.id] || item.notes,
                                  });
                                }}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-sm font-medium ${item.isCompleted ? "text-emerald-400 line-through" : "text-[var(--pro-text-primary)]"}`}>
                                    {item.description}
                                  </span>
                                  <Badge variant="outline" className={`text-xs ${typeConf.className}`}>
                                    <TypeIcon className="h-3 w-3 mr-1" />
                                    {typeConf.label}
                                  </Badge>
                                </div>
                                {!item.isCompleted && item.itemType === "doc_required" && (!item.documents || item.documents.length === 0) && (
                                  <p className="text-xs text-amber-400 mt-0.5">Upload document to complete</p>
                                )}
                              </div>
                            </div>

                            {/* Notes */}
                            {!isTerminal && (
                              <div className="ml-8">
                                <Textarea
                                  placeholder="Add notes..."
                                  defaultValue={item.notes || ""}
                                  onChange={(e) =>
                                    setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                                  }
                                  onBlur={() => {
                                    const notes = itemNotes[item.id];
                                    if (notes !== undefined && notes !== (item.notes || "")) {
                                      toggleItemMutation.mutate({
                                        itemId: item.id,
                                        completed: item.isCompleted,
                                        notes,
                                      });
                                    }
                                  }}
                                  className="min-h-[36px] text-sm bg-[var(--pro-bg)] border-[var(--pro-border)]"
                                  rows={1}
                                />
                              </div>
                            )}

                            {/* Doc upload */}
                            {item.itemType === "doc_required" && (
                              <div className="ml-8 space-y-2">
                                {item.documents && item.documents.length > 0 && (
                                  <div className="space-y-1">
                                    {item.documents.map((doc) => (
                                      <button
                                        key={doc.id}
                                        className="flex items-center gap-2 text-sm text-[var(--pro-text-secondary)] hover:text-[var(--pro-mint)] transition-colors group"
                                        onClick={async () => {
                                          try {
                                            const res = await fetch("/api/v1/objects/download", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              credentials: "include",
                                              body: JSON.stringify({ filePath: doc.filePath }),
                                            });
                                            if (!res.ok) throw new Error("Failed to get download URL");
                                            const { downloadURL } = await res.json();
                                            window.open(downloadURL, "_blank");
                                          } catch {
                                            toast({ title: "Download Failed", description: "Could not download document.", variant: "destructive" });
                                          }
                                        }}
                                      >
                                        <FileText className="h-3.5 w-3.5 text-[var(--pro-mint)]" />
                                        <span className="truncate group-hover:underline">{doc.fileName}</span>
                                        <span className="text-xs text-[var(--pro-text-muted)]">
                                          ({(doc.fileSize / 1024).toFixed(1)} KB)
                                        </span>
                                        <Download className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {!isTerminal && (
                                  <label className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-dashed border-[var(--pro-border)] text-[var(--pro-text-secondary)] hover:border-[var(--pro-mint)] hover:text-[var(--pro-mint)] transition-colors ${uploadingItemId === item.id ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}>
                                    {uploadingItemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                    <span>{uploadingItemId === item.id ? "Uploading..." : "Upload Document"}</span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setUploadingItemId(item.id);
                                        try {
                                          // 1. Get signed upload URL from backend
                                          const urlRes = await fetch("/api/v1/objects/upload", {
                                            method: "POST",
                                            credentials: "include",
                                          });
                                          if (!urlRes.ok) throw new Error("Failed to get upload URL");
                                          const { uploadURL, objectPath } = await urlRes.json();

                                          // 2. PUT file to GCS
                                          const putRes = await fetch(uploadURL, {
                                            method: "PUT",
                                            headers: { "Content-Type": file.type || "application/octet-stream" },
                                            body: file,
                                          });
                                          if (!putRes.ok) throw new Error("Failed to upload file to storage");

                                          // 3. Save metadata with real GCS path
                                          uploadDocMutation.mutate({
                                            itemId: item.id,
                                            filePath: objectPath,
                                            fileName: file.name,
                                            mimeType: file.type,
                                            fileSize: file.size,
                                          });
                                        } catch (err) {
                                          toast({ title: "Upload Failed", description: err instanceof Error ? err.message : "Could not upload file.", variant: "destructive" });
                                        } finally {
                                          setUploadingItemId(null);
                                          e.target.value = "";
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Review History (compact) */}
        {reviews.length > 0 && currentStatus !== "revision_requested" && (
          <div className="pt-2 border-t border-[var(--pro-border)]">
            <p className="text-xs font-medium text-[var(--pro-text-muted)] mb-1.5">Review History</p>
            {reviews.slice(0, 2).map((review) => {
              const decision = reviewDecisionConfig[review.decision] || reviewDecisionConfig.revision_requested;
              return (
                <div key={review.id} className="flex items-center gap-2 text-xs text-[var(--pro-text-secondary)] mb-1">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${decision.className}`}>
                    {decision.label}
                  </Badge>
                  {review.reviewerName && <span>{review.reviewerName}</span>}
                  {review.feedback && <span className="truncate text-[var(--pro-text-muted)]">— {review.feedback}</span>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
