import { useMemo } from "react";
import { useTranslation } from 'react-i18next';
import i18n from "@/i18n";

interface ActiveJobCardProps {
  project: {
    id: string;
    name: string;
    status: string;
    progress: number;
    location?: string;
    dueDate?: string;
    coverPhotoId?: string;
    aiInsightText?: string;
  };
  onProjectClick: (name: string, id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: "#4ADE80",
  "on-track": "#4ADE80",
  "at-risk": "#F97316",
  "on-hold": "#F97316",
  delayed: "#EF4444",
  completed: "#4ADE80",
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  active: "jobCard.onTrack",
  "on-track": "jobCard.onTrack",
  "at-risk": "jobCard.atRisk",
  "on-hold": "jobCard.onHold",
  delayed: "jobCard.delayed",
  completed: "jobCard.done",
};

function deriveDisplayStatus(status: string, dueDate?: string): string {
  if (status !== "active") return status;
  if (dueDate) {
    const diff = new Date(dueDate).getTime() - Date.now();
    if (diff < 0) return "delayed";
  }
  return status;
}

function formatDueDate(dueDate: string | undefined, t: (key: string, opts?: Record<string, unknown>) => string): { text: string; isOverdue: boolean } | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: t('jobCard.daysBehind', { count: Math.abs(diffDays) }), isOverdue: true };
  }
  return {
    text: due.toLocaleDateString(i18n.language === "es" ? "es" : "en-US", { month: "short", day: "numeric" }),
    isOverdue: false,
  };
}

export default function ActiveJobCard({ project, onProjectClick }: ActiveJobCardProps) {
  const { t } = useTranslation('dashboard');
  const displayStatus = useMemo(
    () => deriveDisplayStatus(project.status, project.dueDate),
    [project.status, project.dueDate]
  );
  const statusColor = STATUS_COLORS[displayStatus] || "#9CA3AF";
  const statusLabelKey = STATUS_LABEL_KEYS[displayStatus];
  const statusLabel = statusLabelKey ? t(statusLabelKey) : displayStatus;
  const dueDateInfo = useMemo(() => formatDueDate(project.dueDate, t), [project.dueDate, t]);

  return (
    <button
      onClick={() => onProjectClick(project.name, project.id)}
      className="w-full text-left transition-all duration-200"
      style={{
        background: "#0F1115",
        border: "1px solid #2D333B",
        borderRadius: 9,
        padding: "10px 12px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(74,222,128,0.3)";
        e.currentTarget.style.transform = "translateX(2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#2D333B";
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      {/* Top row: thumbnail + name + status */}
      <div className="flex items-center gap-2 mb-2">
        {/* Thumbnail */}
        {project.coverPhotoId ? (
          <img
            src={`/api/v1/photos/${project.coverPhotoId}/file`}
            alt=""
            className="shrink-0 rounded-md object-cover"
            style={{ width: 28, height: 28 }}
          />
        ) : (
          <div
            className="shrink-0 rounded-md flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              background: `${statusColor}15`,
              color: statusColor,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
        )}

        <span
          className="text-sm font-semibold truncate flex-1"
          style={{ color: "#FFFFFF", fontSize: 13 }}
        >
          {project.name}
        </span>

        <span
          className="shrink-0 px-2 py-0.5 rounded"
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            color: statusColor,
            background: `${statusColor}10`,
            border: `1px solid ${statusColor}30`,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Progress row: percentage + bar + due date */}
      <div className="flex items-center gap-2 mb-1">
        <span
          style={{
            fontFamily: "serif",
            fontSize: 17,
            fontWeight: 300,
            color: statusColor,
            minWidth: 38,
          }}
        >
          {project.progress}%
        </span>

        {/* Progress bar */}
        <div
          className="flex-1"
          style={{
            height: 2,
            background: "#1F242C",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${project.progress}%`,
              background: statusColor,
              borderRadius: 1,
            }}
          />
        </div>

        {dueDateInfo && (
          <span
            className="shrink-0"
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: dueDateInfo.isOverdue ? "#EF4444" : "#9CA3AF",
            }}
          >
            {dueDateInfo.text}
          </span>
        )}
      </div>

      {/* AI Insight box */}
      {project.aiInsightText && (
        <div
          className="mt-2"
          style={{
            background: "#161B22",
            borderRadius: 6,
            padding: "6px 8px",
            borderLeft: "2px solid #4ADE80",
          }}
        >
          <div className="flex items-start gap-1.5">
            <span
              className="shrink-0"
              style={{
                fontFamily: "monospace",
                fontSize: 8,
                color: "#4ADE80",
                lineHeight: "16px",
              }}
            >
              AI
            </span>
            <p
              style={{
                fontSize: 10.5,
                color: "#9CA3AF",
                lineHeight: "14px",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                margin: 0,
              }}
            >
              {project.aiInsightText}
            </p>
          </div>
        </div>
      )}
    </button>
  );
}
