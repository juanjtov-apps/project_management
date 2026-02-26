import { formatDistanceToNow } from "date-fns";

// ─── Status color classes (Tailwind) ───────────────────────────────────────────
// Used by: schedule.tsx (approved/rejected/pending), logs.tsx (open/in-progress/resolved/closed),
//          project-card.tsx (active/completed/delayed/on-hold), issues-tab.tsx (open/closed)

/** Returns Tailwind classes for badge/status styling based on status string */
export const getStatusColor = (status: string): string => {
  switch (status) {
    // Schedule statuses
    case "approved":
      return "bg-[var(--pro-mint)]/20 text-[var(--pro-mint)]";
    case "rejected":
      return "bg-[var(--pro-red)]/20 text-[var(--pro-red)]";
    case "pending":
      return "bg-[var(--pro-orange)]/20 text-[var(--pro-orange)]";
    // Log / issue statuses
    case "open":
      return "bg-blue-500/20 text-blue-400";
    case "in-progress":
      return "bg-[var(--pro-orange)]/20 text-[var(--pro-orange)]";
    case "resolved":
      return "bg-[var(--pro-mint)]/20 text-[var(--pro-mint)]";
    case "closed":
      return "bg-[var(--pro-surface-highlight)] text-[var(--pro-text-secondary)]";
    // Project statuses
    case "active":
      return "bg-brand-teal/10 text-brand-teal";
    case "completed":
      return "bg-green-100 text-green-800";
    case "delayed":
      return "bg-red-100 text-red-800";
    case "on-hold":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-[var(--pro-surface-highlight)] text-[var(--pro-text-secondary)]";
  }
};

// ─── Issue-specific status color (client portal) ──────────────────────────────

/** Returns Tailwind classes for client-portal issue status badges */
export const getIssueStatusColor = (status: string): string => {
  return status === "open" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800";
};

// ─── Priority color classes (Tailwind) ─────────────────────────────────────────
// Used by: schedule.tsx

/** Returns a single Tailwind bg-* class for priority indicators (dots, circles) */
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case "high": return "bg-brand-coral";
    case "medium": return "bg-brand-teal";
    case "low": return "bg-green-500";
    default: return "bg-gray-500";
  }
};

// ─── Priority config (inline styles) ───────────────────────────────────────────
// Used by: expired-upcoming-tasks.tsx, todays-tasks.tsx

export interface PriorityConfig {
  bg: string;
  color: string;
  label: string;
}

/** Returns an object with bg (rgba), color (hex), and label for a priority level */
export const getPriorityConfig = (priority: string): PriorityConfig => {
  switch (priority) {
    case "critical":
      return { bg: "rgba(239, 68, 68, 0.15)", color: "#EF4444", label: "Critical" };
    case "high":
      return { bg: "rgba(249, 115, 22, 0.15)", color: "#F97316", label: "High" };
    case "medium":
      return { bg: "rgba(96, 165, 250, 0.15)", color: "#60A5FA", label: "Medium" };
    case "low":
      return { bg: "rgba(74, 222, 128, 0.15)", color: "#4ADE80", label: "Low" };
    default:
      return { bg: "rgba(156, 163, 175, 0.15)", color: "#9CA3AF", label: priority };
  }
};

// ─── Status config (inline styles) ─────────────────────────────────────────────
// Used by: active-projects.tsx, multi-project-overview.tsx

export interface StatusConfig {
  bg: string;
  color: string;
  label: string;
}

/** Returns an object with bg (rgba), color (hex), and label for a project status */
export const getStatusConfig = (status: string): StatusConfig => {
  switch (status) {
    case "active":
      return { bg: "rgba(74, 222, 128, 0.15)", color: "#4ADE80", label: "Active" };
    case "completed":
      return { bg: "rgba(16, 185, 129, 0.15)", color: "#10B981", label: "Completed" };
    case "delayed":
      return { bg: "rgba(239, 68, 68, 0.15)", color: "#EF4444", label: "Delayed" };
    case "on-hold":
      return { bg: "rgba(249, 115, 22, 0.15)", color: "#F97316", label: "On Hold" };
    default:
      return { bg: "rgba(156, 163, 175, 0.15)", color: "#9CA3AF", label: status };
  }
};

// ─── Date formatting utilities ─────────────────────────────────────────────────

/** Returns a human-readable string describing how a due date relates to now */
export const formatDueDate = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} day(s) overdue`;
  } else if (diffDays === 0) {
    return "Due today";
  } else if (diffDays === 1) {
    return "Due tomorrow";
  } else {
    return `Due in ${diffDays} days`;
  }
};

/** Returns a relative time string like "3 hours ago" using date-fns */
export const formatRelativeTime = (dateString: string): string => {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'Recently';
  }
};
