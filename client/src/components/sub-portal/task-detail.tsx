import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
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
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  checklistId: string;
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
  taskId: string;
  items: ChecklistItem[];
}

interface DocumentInfo {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

interface ReviewEntry {
  id: string;
  taskId: string;
  decision: "approved" | "revision_requested" | "rejected";
  feedback?: string;
  reviewedBy: string;
  reviewerName?: string;
  reviewedAt: string;
}

interface TaskDetailData {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "not_started" | "in_progress" | "pending_review" | "revision_requested" | "approved" | "rejected";
  startDate?: string;
  endDate?: string;
  location?: string;
  projectId: string;
  checklists: Checklist[];
  reviews: ReviewEntry[];
  checklistItemsTotal: number;
  checklistItemsCompleted: number;
}

interface TaskDetailProps {
  taskId: string;
  projectId: string;
  onBack: () => void;
}

export function TaskDetail({ taskId, projectId, onBack }: TaskDetailProps) {
  const { t } = useTranslation('subPortal');

  const statusConfig: Record<
    TaskDetailData["status"],
    { label: string; className: string; icon: typeof Clock }
  > = {
    not_started: {
      label: t('status.not_started'),
      className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
      icon: Clock,
    },
    in_progress: {
      label: t('status.in_progress'),
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      icon: AlertCircle,
    },
    pending_review: {
      label: t('status.pending_review'),
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      icon: Eye,
    },
    revision_requested: {
      label: t('status.revision_requested'),
      className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      icon: AlertCircle,
    },
    approved: {
      label: t('status.approved'),
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: ShieldCheck,
    },
    rejected: {
      label: t('status.rejected'),
      className: "bg-red-500/20 text-red-400 border-red-500/30",
      icon: AlertCircle,
    },
  };

  const priorityConfig: Record<
    TaskDetailData["priority"],
    { label: string; className: string }
  > = {
    low: { label: t('priority.low'), className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
    medium: { label: t('priority.medium'), className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    high: { label: t('priority.high'), className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    urgent: { label: t('priority.urgent'), className: "bg-red-500/20 text-red-400 border-red-500/30" },
  };

  const itemTypeConfig: Record<
    ChecklistItem["itemType"],
    { label: string; className: string; icon: typeof FileText }
  > = {
    standard: {
      label: t('tasks.itemType.standard'),
      className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
      icon: ClipboardCheck,
    },
    doc_required: {
      label: t('tasks.itemType.docRequired'),
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      icon: FileText,
    },
    inspection: {
      label: t('tasks.itemType.inspection'),
      className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      icon: Eye,
    },
  };

  const reviewDecisionConfig: Record<
    ReviewEntry["decision"],
    { label: string; className: string }
  > = {
    approved: {
      label: t('status.approved'),
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    revision_requested: {
      label: t('status.revision_requested'),
      className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    },
    rejected: {
      label: t('status.rejected'),
      className: "bg-red-500/20 text-red-400 border-red-500/30",
    },
  };
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(
    new Set()
  );
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch task detail
  const { data: task, isLoading } = useQuery<TaskDetailData>({
    queryKey: ["/api/v1/sub/tasks", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sub/tasks/${taskId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch task details");
      return res.json();
    },
    enabled: !!taskId,
  });

  // Toggle checklist item completion
  const toggleItemMutation = useMutation({
    mutationFn: async ({
      itemId,
      completed,
      notes,
    }: {
      itemId: string;
      completed: boolean;
      notes?: string;
    }) => {
      const endpoint = completed
        ? `/api/v1/sub/checklist-items/${itemId}/complete`
        : `/api/v1/sub/checklist-items/${itemId}/uncomplete`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to update checklist item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/tasks", taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/my-tasks", projectId],
      });
    },
    onError: () => {
      toast({
        title: t('tasks.error'),
        description: t('tasks.checklistError'),
        variant: "destructive",
      });
    },
  });

  // Upload document for a checklist item
  const uploadDocMutation = useMutation({
    mutationFn: async ({
      itemId,
      filePath,
      fileName,
      mimeType,
      fileSize,
    }: {
      itemId: string;
      filePath: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
    }) => {
      const res = await fetch(
        `/api/v1/sub/checklist-items/${itemId}/documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ filePath, fileName, mimeType, fileSize }),
        }
      );
      if (!res.ok) throw new Error("Failed to upload document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/tasks", taskId],
      });
      toast({
        title: t('tasks.documentUploaded'),
        description: t('tasks.documentUploadedDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('tasks.error'),
        description: t('tasks.documentUploadError'),
        variant: "destructive",
      });
    },
  });

  // Submit task for review
  const submitForReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/sub/tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "pending_review" }),
      });
      if (!res.ok) throw new Error("Failed to submit for review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/tasks", taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/my-tasks", projectId],
      });
      toast({
        title: t('tasks.submittedForReview'),
        description: t('tasks.submittedForReviewDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('tasks.error'),
        description: t('tasks.submitError'),
        variant: "destructive",
      });
    },
  });

  // Start working on task (not_started -> in_progress)
  const startTaskMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/sub/tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "in_progress" }),
      });
      if (!res.ok) throw new Error("Failed to start task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/tasks", taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/my-tasks", projectId],
      });
      toast({
        title: t('tasks.taskStarted'),
        description: t('tasks.taskStartedDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('tasks.error'),
        description: t('tasks.startError'),
        variant: "destructive",
      });
    },
  });

  const toggleChecklist = (checklistId: string) => {
    setExpandedChecklists((prev) => {
      const next = new Set(prev);
      if (next.has(checklistId)) {
        next.delete(checklistId);
      } else {
        next.add(checklistId);
      }
      return next;
    });
  };

  const handleFileUpload = async (itemId: string, file: File) => {
    setUploadingItemId(itemId);
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
        itemId,
        filePath: objectPath,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
    } catch (err) {
      toast({
        title: t('tasks.uploadFailed'),
        description: err instanceof Error ? err.message : t('tasks.uploadFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setUploadingItemId(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return t('tasks.notSet');
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--pro-text-muted)]" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--pro-text-secondary)]">{t('tasks.notFound')}</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('tasks.backToTasks')}
        </Button>
      </div>
    );
  }

  const status = statusConfig[task.status] || statusConfig.not_started;
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const StatusIcon = status.icon;

  const canSubmitForReview =
    task.status === "in_progress" || task.status === "revision_requested";
  const canStartTask = task.status === "not_started";
  const isTerminal = task.status === "approved" || task.status === "rejected";

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-[var(--pro-text-secondary)] hover:text-[var(--pro-text-primary)] min-h-[44px] -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('tasks.backToTasks')}
      </Button>

      {/* Task Header */}
      <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-xl sm:text-2xl text-[var(--pro-text-primary)]">
                {task.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={status.className}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
                <Badge variant="outline" className={priority.className}>
                  {priority.label}
                </Badge>
                {task.location && (
                  <Badge
                    variant="outline"
                    className="bg-[var(--pro-surface-highlight)] text-[var(--pro-text-secondary)] border-[var(--pro-border)]"
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {task.location}
                  </Badge>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {canStartTask && (
                <Button
                  onClick={() => startTaskMutation.mutate()}
                  disabled={startTaskMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 min-h-[44px]"
                >
                  {startTaskMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 mr-2" />
                  )}
                  {t('tasks.startTask')}
                </Button>
              )}
              {canSubmitForReview && (
                <Button
                  onClick={() => submitForReviewMutation.mutate()}
                  disabled={submitForReviewMutation.isPending}
                  className="bg-[var(--pro-mint)] text-[var(--pro-bg-deep)] hover:bg-[var(--pro-mint)]/90 min-h-[44px]"
                >
                  {submitForReviewMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {t('tasks.submitForReview')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-sm font-medium text-[var(--pro-text-secondary)] mb-1">
                {t('tasks.description')}
              </h4>
              <p className="text-[var(--pro-text-primary)] whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Instructions */}
          {task.instructions && (
            <div className="bg-[var(--pro-surface-highlight)] rounded-lg p-4 border border-[var(--pro-border)]">
              <h4 className="text-sm font-medium text-amber-400 mb-1">
                {t('tasks.instructions')}
              </h4>
              <p className="text-[var(--pro-text-primary)] whitespace-pre-wrap text-sm">
                {task.instructions}
              </p>
            </div>
          )}

          {/* Dates */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-[var(--pro-text-secondary)]">
              <Calendar className="h-4 w-4" />
              <span>{t('tasks.start')} {formatDate(task.startDate)}</span>
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                task.endDate &&
                new Date(task.endDate) < new Date() &&
                !isTerminal
                  ? "text-red-400"
                  : "text-[var(--pro-text-secondary)]"
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>{t('tasks.due')} {formatDate(task.endDate)}</span>
            </div>
          </div>

          {/* Progress */}
          {task.checklistItemsTotal > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <span className="text-[var(--pro-text-secondary)]">{t('tasks.progress')}</span>
                <span className="text-[var(--pro-text-primary)] font-medium">
                  {task.checklistItemsCompleted}/{task.checklistItemsTotal} {t('tasks.items')}
                </span>
              </div>
              <div className="w-full h-2 bg-[var(--pro-surface-highlight)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--pro-mint)] rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(
                      (task.checklistItemsCompleted / task.checklistItemsTotal) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklists */}
      {task.checklists && task.checklists.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-[var(--pro-text-primary)]">
            {t('tasks.checklists')}
          </h3>
          {task.checklists.map((checklist) => {
            const isExpanded = expandedChecklists.has(checklist.id);
            const completedCount = checklist.items.filter(
              (item) => item.isCompleted
            ).length;
            const totalCount = checklist.items.length;

            return (
              <Card
                key={checklist.id}
                className="bg-[var(--pro-surface)] border-[var(--pro-border)]"
              >
                {/* Checklist Header */}
                <button
                  onClick={() => toggleChecklist(checklist.id)}
                  className="w-full flex items-center justify-between p-4 text-left min-h-[44px] hover:bg-[var(--pro-surface-highlight)] transition-colors rounded-t-lg"
                >
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-5 w-5 text-[var(--pro-mint)]" />
                    <span className="font-medium text-[var(--pro-text-primary)]">
                      {checklist.name}
                    </span>
                    <span className="text-sm text-[var(--pro-text-secondary)]">
                      {completedCount}/{totalCount}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-[var(--pro-text-muted)]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[var(--pro-text-muted)]" />
                  )}
                </button>

                {/* Checklist Items */}
                {isExpanded && (
                  <CardContent className="pt-0 space-y-3">
                    {checklist.items
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item) => {
                        const typeConfig =
                          itemTypeConfig[item.itemType] ||
                          itemTypeConfig.standard;
                        const TypeIcon = typeConfig.icon;

                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg border p-3 space-y-2 ${
                              item.isCompleted
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : "bg-[var(--pro-surface-highlight)] border-[var(--pro-border)]"
                            }`}
                          >
                            {/* Item header */}
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
                                  <span
                                    className={`text-sm font-medium ${
                                      item.isCompleted
                                        ? "text-emerald-400 line-through"
                                        : "text-[var(--pro-text-primary)]"
                                    }`}
                                  >
                                    {item.description}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${typeConfig.className}`}
                                  >
                                    <TypeIcon className="h-3 w-3 mr-1" />
                                    {typeConfig.label}
                                  </Badge>
                                </div>
                                {!item.isCompleted && item.itemType === "doc_required" && (!item.documents || item.documents.length === 0) && (
                                  <p className="text-xs text-amber-400 mt-0.5">{t('tasks.uploadDocToComplete')}</p>
                                )}
                              </div>
                            </div>

                            {/* Notes field */}
                            {!isTerminal && (
                              <div className="ml-8">
                                <Textarea
                                  placeholder={t('tasks.addNotes')}
                                  defaultValue={item.notes || ""}
                                  onChange={(e) =>
                                    setItemNotes((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value,
                                    }))
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

                            {/* Document upload for doc_required items */}
                            {item.itemType === "doc_required" && (
                              <div className="ml-8 space-y-2">
                                {/* Existing documents */}
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
                                            toast({ title: t('tasks.downloadFailed'), description: t('tasks.downloadFailedDesc'), variant: "destructive" });
                                          }
                                        }}
                                      >
                                        <FileText className="h-3.5 w-3.5 text-[var(--pro-mint)]" />
                                        <span className="truncate group-hover:underline">
                                          {doc.fileName}
                                        </span>
                                        <span className="text-xs text-[var(--pro-text-muted)]">
                                          ({(doc.fileSize / 1024).toFixed(1)} KB)
                                        </span>
                                        <Download className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Upload button */}
                                {!isTerminal && (
                                  <label className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-dashed border-[var(--pro-border)] text-[var(--pro-text-secondary)] hover:border-[var(--pro-mint)] hover:text-[var(--pro-mint)] transition-colors min-h-[44px] ${uploadingItemId === item.id ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}>
                                    {uploadingItemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                    <span>{uploadingItemId === item.id ? t('tasks.uploadingDoc') : t('tasks.uploadDocument')}</span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleFileUpload(item.id, file);
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
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Review History */}
      {task.reviews && task.reviews.length > 0 && (
        <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
          <CardHeader>
            <CardTitle className="text-lg text-[var(--pro-text-primary)] flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[var(--pro-mint)]" />
              {t('tasks.reviewHistory')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {task.reviews.map((review) => {
              const decision =
                reviewDecisionConfig[review.decision] ||
                reviewDecisionConfig.revision_requested;
              return (
                <div
                  key={review.id}
                  className="rounded-lg border border-[var(--pro-border)] bg-[var(--pro-surface-highlight)] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={decision.className}>
                        {decision.label}
                      </Badge>
                      <span className="text-sm text-[var(--pro-text-secondary)]">
                        {t('tasks.by')} {review.reviewerName || "PM"}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--pro-text-muted)]">
                      {new Date(review.reviewedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {review.feedback && (
                    <p className="text-sm text-[var(--pro-text-primary)] whitespace-pre-wrap">
                      {review.feedback}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
