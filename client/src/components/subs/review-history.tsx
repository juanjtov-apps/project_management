import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  ClipboardCheck,
  Calendar,
  Building,
  Loader2,
  Eye,
  History,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface ReviewHistoryItem {
  id: string;
  name: string;
  description?: string;
  subcontractorName: string;
  projectName: string;
  projectId: string;
  status: string;
  priority: "low" | "medium" | "high" | "urgent";
  reviewDecision: "approved" | "rejected";
  reviewFeedback?: string;
  reviewRejectionReason?: string;
  reviewedAt: string;
  reviewerName: string;
  checklists: ChecklistData[];
  checklistItemsTotal: number;
  checklistItemsCompleted: number;
}

interface ReviewHistoryProps {
  projectId?: string;
}

const priorityConfig: Record<
  ReviewHistoryItem["priority"],
  { label: string; className: string }
> = {
  low: { label: "Low", className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  medium: { label: "Medium", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  high: { label: "High", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  urgent: { label: "Urgent", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const itemTypeIcons: Record<ChecklistItemData["itemType"], typeof FileText> = {
  standard: ClipboardCheck,
  doc_required: FileText,
  inspection: Eye,
};

export function ReviewHistory({ projectId }: ReviewHistoryProps) {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const queryUrl = projectId
    ? `/api/v1/sub/reviews/history?projectId=${projectId}`
    : "/api/v1/sub/reviews/history";

  const { data: history = [], isLoading } = useQuery<ReviewHistoryItem[]>({
    queryKey: ["/api/v1/sub/reviews/history", projectId],
    queryFn: async () => {
      const res = await fetch(queryUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch review history");
      return res.json();
    },
  });

  function toggleExpand(taskId: string) {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--pro-text-muted)]" />
      </div>
    );
  }

  if (history.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-[var(--pro-text-muted)]" />
        <h3 className="text-lg font-semibold text-[var(--pro-text-primary)]">
          {t('subs.recentlyReviewed')}
        </h3>
        <span className="text-sm text-[var(--pro-text-muted)]">
          ({history.length})
        </span>
      </div>

      {/* Reviewed tasks */}
      <div className="space-y-2">
        {history.map((task) => {
          const priority = priorityConfig[task.priority] || priorityConfig.medium;
          const isExpanded = expandedTaskId === task.id;
          const isApproved = task.reviewDecision === "approved";

          return (
            <Card
              key={task.id}
              className="bg-[var(--pro-surface)] border-[var(--pro-border)]"
            >
              <CardContent className="p-4">
                {/* Task Header */}
                <div
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => toggleExpand(task.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-[var(--pro-text-primary)]">
                        {task.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={
                          isApproved
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }
                      >
                        {isApproved ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {isApproved ? t('status.approved') : t('status.rejected')}
                      </Badge>
                      <Badge variant="outline" className={priority.className}>
                        {priority.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-[var(--pro-text-secondary)] flex-wrap">
                      <div className="flex items-center gap-1">
                        <Building className="h-3.5 w-3.5" />
                        <span>{task.subcontractorName}</span>
                      </div>
                      <span className="text-[var(--pro-text-muted)]">
                        {task.projectName}
                      </span>
                      {task.reviewedAt && (
                        <div className="flex items-center gap-1 text-[var(--pro-text-muted)]">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {task.reviewerName} &middot;{" "}
                            {new Date(task.reviewedAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-[var(--pro-text-muted)]"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[var(--pro-border)] space-y-4">
                    {/* Review feedback */}
                    {task.reviewFeedback && (
                      <div
                        className={`rounded-lg border p-3 ${
                          isApproved
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : "border-red-500/20 bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <MessageSquare className="h-3.5 w-3.5 text-[var(--pro-text-muted)]" />
                          <p className="text-xs font-medium text-[var(--pro-text-muted)]">
                            {t('subs.reviewFeedback')}
                          </p>
                        </div>
                        <p className="text-sm text-[var(--pro-text-secondary)] whitespace-pre-wrap">
                          {task.reviewFeedback}
                        </p>
                      </div>
                    )}

                    {task.description && (
                      <p className="text-sm text-[var(--pro-text-secondary)]">
                        {task.description}
                      </p>
                    )}

                    {/* Checklists */}
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
                                    <p className="text-xs font-medium text-[var(--pro-text-muted)] mb-0.5">
                                      {t('subs.notesFromSub')}
                                    </p>
                                    <p className="text-sm text-[var(--pro-text-secondary)] whitespace-pre-wrap">
                                      {item.notes}
                                    </p>
                                  </div>
                                )}

                                {/* Documents */}
                                {item.documents &&
                                  item.documents.length > 0 && (
                                    <div className="ml-6 space-y-1">
                                      <p className="text-xs font-medium text-[var(--pro-text-muted)]">
                                        {t('subs.attachedDocuments')}
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {item.documents.map((doc) => (
                                          <button
                                            key={doc.id}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer group"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              try {
                                                const res = await fetch(
                                                  "/api/v1/objects/download",
                                                  {
                                                    method: "POST",
                                                    headers: {
                                                      "Content-Type":
                                                        "application/json",
                                                    },
                                                    credentials: "include",
                                                    body: JSON.stringify({
                                                      filePath: doc.filePath,
                                                    }),
                                                  }
                                                );
                                                if (!res.ok)
                                                  throw new Error(
                                                    "Failed to get download URL"
                                                  );
                                                const { downloadURL } =
                                                  await res.json();
                                                window.open(
                                                  downloadURL,
                                                  "_blank"
                                                );
                                              } catch {
                                                toast({
                                                  title: "Download Failed",
                                                  description:
                                                    "Could not download document.",
                                                  variant: "destructive",
                                                });
                                              }
                                            }}
                                          >
                                            <FileText className="h-3.5 w-3.5" />
                                            <span>{doc.fileName}</span>
                                            {doc.fileSize && (
                                              <span className="text-blue-400/60">
                                                (
                                                {(
                                                  doc.fileSize / 1024
                                                ).toFixed(1)}{" "}
                                                KB)
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
                        No checklists attached to this task.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
