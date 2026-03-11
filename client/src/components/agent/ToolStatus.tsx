/**
 * Tool execution status indicator component.
 */

import { Loader2, CheckCircle2, XCircle, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ToolCall } from "@/hooks/useAgentChat";

interface ToolStatusProps {
  toolCall: ToolCall;
}

// Static fallback labels (used when t() is not available in non-component functions)
const TOOL_LABEL_KEYS: Record<string, string> = {
  get_projects: "tools.fetchingProjects",
  get_project_detail: "tools.gettingDetails",
  get_stages: "tools.loadingStages",
  get_tasks: "tools.fetchingTasks",
  get_materials: "tools.loadingMaterials",
  get_issues: "tools.fetchingIssues",
  get_installments: "tools.fetchingPayments",
  query_database: "tools.queryingDatabase",
  create_task: "tools.creatingTask",
  complete_task: "tools.completingTask",
  create_stage: "tools.creatingStage",
  create_daily_log: "tools.creatingLog",
  update_material_status: "tools.updatingMaterial",
};

export function ToolStatus({ toolCall }: ToolStatusProps) {
  const { t } = useTranslation('agent');
  const labelKey = TOOL_LABEL_KEYS[toolCall.tool];
  const label = labelKey ? t(labelKey) : `Running ${toolCall.tool}`;

  const getLabel = (tc: ToolCall): string => {
    const baseLabelKey = TOOL_LABEL_KEYS[tc.tool];
    const baseName = baseLabelKey ? t(baseLabelKey) : tc.tool;
    if (tc.status === "success") return `${baseName} ${t('tools.completed')}`;
    if (tc.status === "error") return tc.error || `${baseName} ${t('tools.failed')}`;
    return baseName;
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
      style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
    >
      <ToolIcon status={toolCall.status} />
      <span style={{ color: getStatusColor(toolCall.status) }}>
        {toolCall.status === "running" ? label : getLabel(toolCall)}
      </span>
    </div>
  );
}

interface ToolIconProps {
  status: ToolCall["status"];
}

function ToolIcon({ status }: ToolIconProps) {
  switch (status) {
    case "pending":
    case "running":
      return <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#60A5FA' }} />;
    case "success":
      return <CheckCircle2 className="w-4 h-4" style={{ color: '#4ADE80' }} />;
    case "error":
      return <XCircle className="w-4 h-4" style={{ color: '#EF4444' }} />;
    default:
      return <Wrench className="w-4 h-4" style={{ color: '#9CA3AF' }} />;
  }
}

function getStatusColor(status: ToolCall["status"]): string {
  switch (status) {
    case "pending":
    case "running":
      return '#60A5FA';
    case "success":
      return '#4ADE80';
    case "error":
      return '#EF4444';
    default:
      return '#9CA3AF';
  }
}

function getStatusLabel(toolCall: ToolCall): string {
  const baseName = TOOL_LABEL_KEYS[toolCall.tool] || toolCall.tool;

  if (toolCall.status === "success") {
    return `${baseName} completed`;
  }

  if (toolCall.status === "error") {
    return toolCall.error || `${baseName} failed`;
  }

  return baseName;
}

interface ActiveToolIndicatorProps {
  toolCall: ToolCall | null;
}

export function ActiveToolIndicator({ toolCall }: ActiveToolIndicatorProps) {
  const { t } = useTranslation('agent');
  if (!toolCall) return null;

  const labelKey = TOOL_LABEL_KEYS[toolCall.tool];
  const label = labelKey ? t(labelKey) : toolCall.tool;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-full"
      style={{ backgroundColor: '#1F242C' }}
    >
      <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#60A5FA' }} />
      <span style={{ color: '#9CA3AF' }}>
        {label}...
      </span>
    </div>
  );
}
