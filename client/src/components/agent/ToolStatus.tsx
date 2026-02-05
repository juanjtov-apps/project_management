/**
 * Tool execution status indicator component.
 */

import { Loader2, CheckCircle2, XCircle, Wrench } from "lucide-react";
import type { ToolCall } from "@/hooks/useAgentChat";

interface ToolStatusProps {
  toolCall: ToolCall;
}

const TOOL_LABELS: Record<string, string> = {
  get_projects: "Fetching projects",
  get_project_detail: "Getting project details",
  get_stages: "Loading stages",
  get_tasks: "Fetching tasks",
  get_materials: "Loading materials",
  get_issues: "Fetching issues",
  get_installments: "Fetching payment installments",
  query_database: "Querying database",
  create_task: "Creating task",
  complete_task: "Completing task",
  create_stage: "Creating stage",
  create_daily_log: "Creating daily log",
  update_material_status: "Updating material",
};

export function ToolStatus({ toolCall }: ToolStatusProps) {
  const label = TOOL_LABELS[toolCall.tool] || `Running ${toolCall.tool}`;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
      style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
    >
      <ToolIcon status={toolCall.status} />
      <span style={{ color: getStatusColor(toolCall.status) }}>
        {toolCall.status === "running" ? label : getStatusLabel(toolCall)}
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
  const baseName = TOOL_LABELS[toolCall.tool] || toolCall.tool;

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
  if (!toolCall) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-full"
      style={{ backgroundColor: '#1F242C' }}
    >
      <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#60A5FA' }} />
      <span style={{ color: '#9CA3AF' }}>
        {TOOL_LABELS[toolCall.tool] || toolCall.tool}...
      </span>
    </div>
  );
}
