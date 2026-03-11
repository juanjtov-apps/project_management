import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  ClipboardCheck,
  Calendar,
  Building,
  Loader2,
  Eye,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItemData {
  id: string;
  description: string;
  isCompleted: boolean;
  itemType: "standard" | "doc_required" | "inspection";
  notes?: string;
  documents?: Array<{
    id: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSize?: number;
  }>;
}

interface ChecklistData {
  id: string;
  name: string;
  items: ChecklistItemData[];
}

interface ReviewQueueItem {
  id: string;
  name: string;
  description?: string;
  subCompanyName: string;
  subCompanyId: string;
  projectName: string;
  projectId: string;
  completedDate?: string;
  status: string;
  priority: "low" | "medium" | "high" | "urgent";
  checklists: ChecklistData[];
  checklistItemsTotal: number;
  checklistItemsCompleted: number;
}

interface ApprovalQueueProps {
  projectId?: string;
}

const priorityConfig: Record<
  ReviewQueueItem["priority"],
  { label: string; className: string }
> = {
  low: {
    label: "Low",
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  },
  medium: {
    label: "Medium",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  high: {
    label: "High",
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  urgent: {
    label: "Urgent",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

const itemTypeIcons: Record<ChecklistItemData["itemType"], typeof FileText> = {
  standard: ClipboardCheck,
  doc_required: FileText,
  inspection: Eye,
};

export function ApprovalQueue({ projectId }: ApprovalQueueProps) {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingTask, setReviewingTask] = useState<ReviewQueueItem | null>(
    null
  );
  const [reviewDecision, setReviewDecision] = useState<
    "approved" | "revision_requested" | "rejected"
  >("approved");
  const [feedback, setFeedback] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const queryUrl = projectId
    ? `/api/v1/sub/reviews/queue?projectId=${projectId}`
    : "/api/v1/sub/reviews/queue";

  const { data: queue = [], isLoading } = useQuery<ReviewQueueItem[]>({
    queryKey: ["/api/v1/sub/reviews/queue", projectId],
    queryFn: async () => {
      const res = await fetch(queryUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch review queue");
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      taskId,
      decision,
      feedbackText,
      reason,
    }: {
      taskId: string;
      decision: string;
      feedbackText: string;
      reason: string;
    }) => {
      const res = await fetch(`/api/v1/sub/tasks/${taskId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          decision,
          feedback: feedbackText || undefined,
          rejectionReason: reason || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to submit review");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/reviews/queue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/tasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/reviews/history"],
      });
      const decisionLabels: Record<string, string> = {
        approved: "approved",
        revision_requested: "sent back for revision",
        rejected: "rejected",
      };
      const decisionI18n: Record<string, string> = {
        approved: t('subs.taskApproved'),
        revision_requested: t('subs.taskSentBack'),
        rejected: t('subs.taskRejected'),
      };
      toast({
        title: decisionI18n[variables.decision] || t('subs.taskReviewed'),
      });
      closeReviewDialog();
    },
    onError: (error: Error) => {
      toast({
        title: t('subs.reviewFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function openReviewDialog(
    task: ReviewQueueItem,
    decision: "approved" | "revision_requested" | "rejected"
  ) {
    setReviewingTask(task);
    setReviewDecision(decision);
    setFeedback("");
    setRejectionReason("");
    setReviewDialogOpen(true);
  }

  function closeReviewDialog() {
    setReviewDialogOpen(false);
    setReviewingTask(null);
    setFeedback("");
    setRejectionReason("");
  }

  function submitReview() {
    if (!reviewingTask) return;
    if (
      (reviewDecision === "rejected" ||
        reviewDecision === "revision_requested") &&
      !feedback.trim()
    ) {
      toast({
        title: t('subs.feedbackRequiredMsg'),
        description: t('subs.feedbackRequiredDesc'),
        variant: "destructive",
      });
      return;
    }
    reviewMutation.mutate({
      taskId: reviewingTask.id,
      decision: reviewDecision,
      feedbackText: feedback,
      reason: rejectionReason,
    });
  }

  function toggleExpand(taskId: string) {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  }

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
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--pro-text-primary)]">
          {t('subs.approvalQueue')}
        </h2>
        <p className="text-[var(--pro-text-secondary)]">
          {t('subs.tasksPendingReview', { count: queue.length })}
        </p>
      </div>

      {/* Queue */}
      {queue.length === 0 ? (
        <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 mx-auto text-emerald-400/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-[var(--pro-text-primary)]">
              {t('subs.allCaughtUp')}
            </h3>
            <p className="text-[var(--pro-text-secondary)]">
              {t('subPortal:tasks.noPendingReview')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {queue.map((task) => {
            const priority = priorityConfig[task.priority] || priorityConfig.medium;
            const isExpanded = expandedTaskId === task.id;
            const progress =
              task.checklistItemsTotal > 0
                ? Math.round(
                    (task.checklistItemsCompleted / task.checklistItemsTotal) *
                      100
                  )
                : 0;

            return (
              <Card
                key={task.id}
                className="bg-[var(--pro-surface)] border-[var(--pro-border)]"
              >
                <CardContent className="p-4">
                  {/* Task Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => toggleExpand(task.id)}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-[var(--pro-text-primary)]">
                          {task.name}
                        </h3>
                        <Badge variant="outline" className={priority.className}>
                          {priority.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-[var(--pro-text-secondary)] flex-wrap">
                        <div className="flex items-center gap-1">
                          <Building className="h-3.5 w-3.5" />
                          <span>{task.subCompanyName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[var(--pro-text-muted)]">
                            {task.projectName}
                          </span>
                        </div>
                        {task.completedDate && (
                          <div className="flex items-center gap-1 text-[var(--pro-text-muted)]">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              Submitted{" "}
                              {new Date(
                                task.completedDate
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Checklist Progress */}
                      {task.checklistItemsTotal > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-24 h-1.5 bg-[var(--pro-surface-highlight)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--pro-mint)] rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-[var(--pro-text-muted)]">
                            {task.checklistItemsCompleted}/
                            {task.checklistItemsTotal} items
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Action Buttons */}
                      <div className="hidden sm:flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openReviewDialog(task, "revision_requested")
                          }
                          className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          {t('subs.revise')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReviewDialog(task, "rejected")}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          {t('subs.reject')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openReviewDialog(task, "approved")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          {t('subs.approve')}
                        </Button>
                      </div>

                      {/* Expand Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(task.id)}
                        className="h-8 w-8 p-0 text-[var(--pro-text-muted)]"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="flex gap-1.5 mt-3 sm:hidden">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openReviewDialog(task, "revision_requested")
                      }
                      className="flex-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 min-h-[44px]"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Revise
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openReviewDialog(task, "rejected")}
                      className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 min-h-[44px]"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openReviewDialog(task, "approved")}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Approve
                    </Button>
                  </div>

                  {/* Expanded Checklist Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[var(--pro-border)] space-y-4">
                      {task.description && (
                        <p className="text-sm text-[var(--pro-text-secondary)]">
                          {task.description}
                        </p>
                      )}

                      {(task.checklists || []).map((checklist) => (
                        <div key={checklist.id}>
                          <h4 className="text-sm font-medium text-[var(--pro-text-primary)] mb-2">
                            {checklist.name}
                          </h4>
                          <div className="space-y-2">
                            {checklist.items.map((item) => {
                              const TypeIcon =
                                itemTypeIcons[item.itemType] || ClipboardCheck;
                              return (
                                <div
                                  key={item.id}
                                  className={`rounded-lg border p-3 space-y-2 ${
                                    item.isCompleted
                                      ? "bg-emerald-500/5 border-emerald-500/20"
                                      : "bg-[var(--pro-bg)] border-[var(--pro-border)]"
                                  }`}
                                >
                                  {/* Item header */}
                                  <div className="flex items-start gap-2">
                                    <div
                                      className={`mt-0.5 shrink-0 ${
                                        item.isCompleted
                                          ? "text-emerald-400"
                                          : "text-[var(--pro-text-muted)]"
                                      }`}
                                    >
                                      {item.isCompleted ? (
                                        <CheckCircle className="h-4 w-4" />
                                      ) : (
                                        <TypeIcon className="h-4 w-4" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                          className={`text-sm font-medium ${
                                            item.isCompleted
                                              ? "text-emerald-400"
                                              : "text-[var(--pro-text-primary)]"
                                          }`}
                                        >
                                          {item.description}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className={`text-[10px] px-1.5 py-0 ${
                                            item.isCompleted
                                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                              : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                                          }`}
                                        >
                                          {item.isCompleted ? t('subs.done') : t('status.pending')}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Sub's notes */}
                                  {item.notes && (
                                    <div className="ml-6 p-2 rounded bg-[var(--pro-surface-highlight)] border border-[var(--pro-border)]">
                                      <p className="text-xs font-medium text-[var(--pro-text-muted)] mb-0.5">{t('subs.notesFromSub')}</p>
                                      <p className="text-sm text-[var(--pro-text-secondary)] whitespace-pre-wrap">
                                        {item.notes}
                                      </p>
                                    </div>
                                  )}

                                  {/* Attached documents */}
                                  {item.documents && item.documents.length > 0 && (
                                    <div className="ml-6 space-y-1">
                                      <p className="text-xs font-medium text-[var(--pro-text-muted)]">{t('subs.attachedDocuments')}</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {item.documents.map((doc) => (
                                          <button
                                            key={doc.id}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer group"
                                            onClick={async (e) => {
                                              e.stopPropagation();
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
                                                toast({ title: t('subs.downloadFailed'), description: t('subs.couldNotDownload'), variant: "destructive" });
                                              }
                                            }}
                                          >
                                            <FileText className="h-3.5 w-3.5" />
                                            <span>{doc.fileName}</span>
                                            {doc.fileSize && (
                                              <span className="text-blue-400/60">
                                                ({(doc.fileSize / 1024).toFixed(1)} KB)
                                              </span>
                                            )}
                                            <Download className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {(!task.checklists || task.checklists.length === 0) && (
                        <p className="text-sm text-[var(--pro-text-muted)] italic">
                          {t('subs.noChecklistsAttached')}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {reviewDecision === "approved" && t('subs.approveTask')}
              {reviewDecision === "revision_requested" && t('subs.requestRevision')}
              {reviewDecision === "rejected" && t('subs.rejectTask')}
            </DialogTitle>
          </DialogHeader>

          {reviewingTask && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[var(--pro-bg)] border border-[var(--pro-border)]">
                <p className="font-medium text-[var(--pro-text-primary)]">
                  {reviewingTask.name}
                </p>
                <p className="text-sm text-[var(--pro-text-secondary)]">
                  {reviewingTask.subCompanyName} - {reviewingTask.projectName}
                </p>
              </div>

              {reviewDecision === "approved" && (
                <div className="space-y-1.5">
                  <Label htmlFor="approve-feedback">
                    {t('subs.feedbackOptional')}
                  </Label>
                  <Textarea
                    id="approve-feedback"
                    placeholder="Great work! Any optional comments..."
                    rows={3}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>
              )}

              {reviewDecision === "revision_requested" && (
                <div className="space-y-1.5">
                  <Label htmlFor="revision-feedback">
                    <MessageSquare className="h-3.5 w-3.5 inline mr-1" />
                    {t('subs.whatNeedsRevision')}
                  </Label>
                  <Textarea
                    id="revision-feedback"
                    placeholder="Please describe what needs to be corrected or updated..."
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>
              )}

              {reviewDecision === "rejected" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="reject-feedback">
                      <MessageSquare className="h-3.5 w-3.5 inline mr-1" />
                      {t('subs.feedbackRequired')}
                    </Label>
                    <Textarea
                      id="reject-feedback"
                      placeholder="Explain why this task is being rejected..."
                      rows={3}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reject-reason">
                      {t('subs.rejectionReasonOptional')}
                    </Label>
                    <Textarea
                      id="reject-reason"
                      placeholder="Specific reason code or category..."
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeReviewDialog}>
              {t('button.cancel')}
            </Button>
            <Button
              onClick={submitReview}
              disabled={reviewMutation.isPending}
              className={
                reviewDecision === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : reviewDecision === "rejected"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700"
              }
            >
              {reviewMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : reviewDecision === "approved" ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  {t('subs.approve')}
                </>
              ) : reviewDecision === "rejected" ? (
                <>
                  <XCircle className="h-4 w-4 mr-1.5" />
                  {t('subs.reject')}
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  {t('subs.requestRevision')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
