import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  AlertTriangle,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Wrench,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

// --- Types ---

interface TroubleshootingSummary {
  failedToolCalls: number;
  errorInteractions: number;
  positiveFeedback: number;
  negativeFeedback: number;
  topFailingTool: { name: string; count: number } | null;
  dailyErrorTrend: { day: string; count: number }[];
  window: string;
}

interface FailedToolCall {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  errorMessage: string | null;
  executionTimeMs: number | null;
  conversationId: string | null;
  createdAt: string;
  userName: string;
  userEmail: string | null;
}

interface FailedInteraction {
  id: string;
  userPrompt: string;
  error: string;
  toolsSelected: string[];
  modelUsed: string;
  latencyMs: number;
  userId: string | null;
  conversationId: string | null;
  createdAt: string;
}

interface FeedbackEntry {
  id: string;
  isPositive: boolean;
  userQuery: string;
  assistantResponse: string;
  notes: string | null;
  toolCallsUsed: string[];
  conversationId: string | null;
  createdAt: string;
  userName: string;
  userEmail: string | null;
  companyName: string | null;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// --- Constants ---

const WINDOW_OPTIONS = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
] as const;

const TABS = ["Failed Tools", "Error Interactions", "Feedback"] as const;
type TabType = (typeof TABS)[number];

const FEEDBACK_FILTERS = [
  { label: "All", value: undefined },
  { label: "Positive", value: true },
  { label: "Negative", value: false },
] as const;

const STORAGE_KEY = "agent-logs-last-viewed";

// --- Component ---

export default function AgentTroubleshooting() {
  const [timeWindow, setTimeWindow] = useState<string>("24h");
  const [activeTab, setActiveTab] = useState<TabType>("Failed Tools");
  const [feedbackFilter, setFeedbackFilter] = useState<boolean | undefined>(undefined);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Mark as viewed on mount
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  }, []);

  // Root admin check
  const { data: currentUser } = useQuery<Record<string, unknown>>({
    queryKey: ["/api/v1/auth/user"],
    retry: false,
  });
  const isRootAdmin =
    currentUser?.isRoot === true || currentUser?.is_root === true;

  // Summary data
  const { data: summary, isLoading: summaryLoading } =
    useQuery<TroubleshootingSummary>({
      queryKey: [`/api/v1/admin/agent-troubleshooting/summary?window=${timeWindow}`],
      enabled: isRootAdmin,
      staleTime: 15000,
    });

  // Failed tools
  const { data: failedTools, isLoading: toolsLoading } =
    useQuery<PaginatedResponse<FailedToolCall>>({
      queryKey: [`/api/v1/admin/agent-troubleshooting/failed-tools?limit=50&offset=0`],
      enabled: isRootAdmin && activeTab === "Failed Tools",
      staleTime: 15000,
    });

  // Failed interactions
  const { data: failedInteractions, isLoading: interactionsLoading } =
    useQuery<PaginatedResponse<FailedInteraction>>({
      queryKey: [`/api/v1/admin/agent-troubleshooting/failed-interactions?limit=50&offset=0`],
      enabled: isRootAdmin && activeTab === "Error Interactions",
      staleTime: 15000,
    });

  // Feedback
  const feedbackFilterParam = feedbackFilter !== undefined ? `&is_positive=${feedbackFilter}` : "";
  const { data: feedback, isLoading: feedbackLoading } =
    useQuery<PaginatedResponse<FeedbackEntry>>({
      queryKey: [`/api/v1/admin/agent-troubleshooting/feedback?limit=50&offset=0${feedbackFilterParam}`],
      enabled: isRootAdmin && activeTab === "Feedback",
      staleTime: 15000,
    });

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#9CA3AF" }} />
      </div>
    );
  }

  if (!isRootAdmin) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card style={{ backgroundColor: "#161B22", borderColor: "#2D333B" }}>
          <CardHeader>
            <CardTitle style={{ color: "#EF4444" }}>Access Denied</CardTitle>
            <p style={{ color: "#9CA3AF" }}>Root admin access required.</p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Window Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#FFFFFF" }}>
            Agent Troubleshooting
          </h1>
          <p style={{ color: "#9CA3AF" }} className="text-sm">
            Monitor agent errors, failed tools, and user feedback
          </p>
        </div>
        <div className="flex gap-2">
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTimeWindow(opt.value)}
              className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
              style={{
                backgroundColor: timeWindow === opt.value ? "#4ADE80" : "#1F242C",
                color: timeWindow === opt.value ? "#0F1115" : "#9CA3AF",
                border: "1px solid",
                borderColor: timeWindow === opt.value ? "#4ADE80" : "#2D333B",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Failed Tools"
          value={summary?.failedToolCalls ?? 0}
          icon={<XCircle className="h-4 w-4" />}
          accent="#EF4444"
        />
        <SummaryCard
          label="Error Interactions"
          value={summary?.errorInteractions ?? 0}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent="#F97316"
        />
        <SummaryCard
          label="Negative Feedback"
          value={summary?.negativeFeedback ?? 0}
          icon={<ThumbsDown className="h-4 w-4" />}
          accent="#FBBF24"
        />
        <SummaryCard
          label="Positive Feedback"
          value={summary?.positiveFeedback ?? 0}
          icon={<ThumbsUp className="h-4 w-4" />}
          accent="#4ADE80"
        />
      </div>

      {/* Top Failing Tool */}
      {summary?.topFailingTool && (
        <div
          className="px-4 py-2 rounded-md text-sm flex items-center gap-2"
          style={{ backgroundColor: "#1F242C", border: "1px solid #2D333B" }}
        >
          <Wrench className="h-4 w-4" style={{ color: "#EF4444" }} />
          <span style={{ color: "#9CA3AF" }}>Most failing tool:</span>
          <span style={{ color: "#FFFFFF" }} className="font-medium">
            {summary.topFailingTool.name}
          </span>
          <span style={{ color: "#EF4444" }}>
            ({summary.topFailingTool.count} failures)
          </span>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "#1F242C" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors"
            style={{
              backgroundColor: activeTab === tab ? "#161B22" : "transparent",
              color: activeTab === tab ? "#FFFFFF" : "#9CA3AF",
              border: activeTab === tab ? "1px solid #2D333B" : "1px solid transparent",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Card style={{ backgroundColor: "#161B22", borderColor: "#2D333B" }}>
        <CardContent className="pt-4 overflow-x-auto">
          {activeTab === "Failed Tools" && (
            <FailedToolsTable
              items={failedTools?.items ?? []}
              loading={toolsLoading}
              total={failedTools?.total ?? 0}
              expandedRow={expandedRow}
              onToggleExpand={(id) => setExpandedRow(expandedRow === id ? null : id)}
            />
          )}
          {activeTab === "Error Interactions" && (
            <ErrorInteractionsTable
              items={failedInteractions?.items ?? []}
              loading={interactionsLoading}
              total={failedInteractions?.total ?? 0}
              expandedRow={expandedRow}
              onToggleExpand={(id) => setExpandedRow(expandedRow === id ? null : id)}
            />
          )}
          {activeTab === "Feedback" && (
            <>
              <div className="flex gap-2 mb-4">
                {FEEDBACK_FILTERS.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setFeedbackFilter(f.value)}
                    className="px-3 py-1 text-xs font-medium rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        feedbackFilter === f.value ? "#4ADE80" : "#1F242C",
                      color:
                        feedbackFilter === f.value ? "#0F1115" : "#9CA3AF",
                      border: "1px solid",
                      borderColor:
                        feedbackFilter === f.value ? "#4ADE80" : "#2D333B",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <FeedbackTable
                items={feedback?.items ?? []}
                loading={feedbackLoading}
                total={feedback?.total ?? 0}
                expandedRow={expandedRow}
                onToggleExpand={(id) => setExpandedRow(expandedRow === id ? null : id)}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Sub-components ---

function SummaryCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card style={{ backgroundColor: "#161B22", borderColor: "#2D333B" }}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium" style={{ color: "#9CA3AF" }}>
            {label}
          </span>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <div className="text-2xl font-bold" style={{ color: accent }}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <MessageSquare className="h-12 w-12 mx-auto mb-4" style={{ color: "#2D333B" }} />
      <p style={{ color: "#9CA3AF" }}>{message}</p>
    </div>
  );
}

function TimeAgo({ date }: { date: string }) {
  return (
    <span title={new Date(date).toLocaleString()}>
      {formatDistanceToNow(new Date(date), { addSuffix: true })}
    </span>
  );
}

function ExpandToggle({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-6 w-6 p-0"
      style={{ color: "#9CA3AF" }}
    >
      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </Button>
  );
}

function FailedToolsTable({
  items,
  loading,
  total,
  expandedRow,
  onToggleExpand,
}: {
  items: FailedToolCall[];
  loading: boolean;
  total: number;
  expandedRow: string | null;
  onToggleExpand: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#9CA3AF" }} />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState message="No failed tool calls found." />;
  }

  return (
    <>
      <p className="text-xs mb-3" style={{ color: "#6B7280" }}>
        {total} total failed tool calls
      </p>
      <Table>
        <TableHeader>
          <TableRow style={{ borderColor: "#2D333B" }}>
            <TableHead style={{ color: "#9CA3AF" }} className="w-8" />
            <TableHead style={{ color: "#9CA3AF" }}>Tool</TableHead>
            <TableHead style={{ color: "#9CA3AF" }}>Error</TableHead>
            <TableHead style={{ color: "#9CA3AF" }}>User</TableHead>
            <TableHead style={{ color: "#9CA3AF" }}>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <>
              <TableRow key={item.id} style={{ borderColor: "#2D333B" }}>
                <TableCell>
                  <ExpandToggle
                    expanded={expandedRow === item.id}
                    onClick={() => onToggleExpand(item.id)}
                  />
                </TableCell>
                <TableCell>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-mono"
                    style={{ backgroundColor: "#2D333B", color: "#EF4444" }}
                  >
                    {item.toolName}
                  </span>
                </TableCell>
                <TableCell style={{ color: "#FFFFFF" }} className="max-w-xs truncate">
                  {item.errorMessage || "Unknown error"}
                </TableCell>
                <TableCell style={{ color: "#9CA3AF" }} className="text-sm">
                  {item.userName}
                </TableCell>
                <TableCell style={{ color: "#6B7280" }} className="text-sm whitespace-nowrap">
                  <TimeAgo date={item.createdAt} />
                </TableCell>
              </TableRow>
              {expandedRow === item.id && (
                <TableRow key={`${item.id}-detail`} style={{ borderColor: "#2D333B" }}>
                  <TableCell colSpan={5}>
                    <div
                      className="p-3 rounded text-xs font-mono whitespace-pre-wrap"
                      style={{ backgroundColor: "#0D1117", color: "#9CA3AF" }}
                    >
                      <div className="mb-2">
                        <span style={{ color: "#6B7280" }}>Error: </span>
                        <span style={{ color: "#EF4444" }}>{item.errorMessage}</span>
                      </div>
                      <div className="mb-2">
                        <span style={{ color: "#6B7280" }}>Input: </span>
                        <span style={{ color: "#FFFFFF" }}>
                          {JSON.stringify(item.toolInput, null, 2)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "#6B7280" }}>User: </span>
                        <span style={{ color: "#FFFFFF" }}>
                          {item.userName} ({item.userEmail})
                        </span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

function ErrorInteractionsTable({
  items,
  loading,
  total,
  expandedRow,
  onToggleExpand,
}: {
  items: FailedInteraction[];
  loading: boolean;
  total: number;
  expandedRow: string | null;
  onToggleExpand: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#9CA3AF" }} />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState message="No error interactions found." />;
  }

  return (
    <>
      <p className="text-xs mb-3" style={{ color: "#6B7280" }}>
        {total} total error interactions
      </p>
      <Table>
        <TableHeader>
          <TableRow style={{ borderColor: "#2D333B" }}>
            <TableHead style={{ color: "#9CA3AF" }} className="w-8" />
            <TableHead style={{ color: "#9CA3AF" }}>User Prompt</TableHead>
            <TableHead style={{ color: "#9CA3AF" }}>Error</TableHead>
            <TableHead style={{ color: "#9CA3AF" }}>Model</TableHead>
            <TableHead style={{ color: "#9CA3AF" }}>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <>
              <TableRow key={item.id} style={{ borderColor: "#2D333B" }}>
                <TableCell>
                  <ExpandToggle
                    expanded={expandedRow === item.id}
                    onClick={() => onToggleExpand(item.id)}
                  />
                </TableCell>
                <TableCell style={{ color: "#FFFFFF" }} className="max-w-xs truncate">
                  {item.userPrompt.slice(0, 80)}
                  {item.userPrompt.length > 80 ? "..." : ""}
                </TableCell>
                <TableCell style={{ color: "#EF4444" }} className="max-w-xs truncate text-sm">
                  {item.error}
                </TableCell>
                <TableCell style={{ color: "#9CA3AF" }} className="text-sm">
                  {item.modelUsed || "-"}
                </TableCell>
                <TableCell style={{ color: "#6B7280" }} className="text-sm whitespace-nowrap">
                  <TimeAgo date={item.createdAt} />
                </TableCell>
              </TableRow>
              {expandedRow === item.id && (
                <TableRow key={`${item.id}-detail`} style={{ borderColor: "#2D333B" }}>
                  <TableCell colSpan={5}>
                    <div
                      className="p-3 rounded text-xs font-mono whitespace-pre-wrap"
                      style={{ backgroundColor: "#0D1117", color: "#9CA3AF" }}
                    >
                      <div className="mb-2">
                        <span style={{ color: "#6B7280" }}>Prompt: </span>
                        <span style={{ color: "#FFFFFF" }}>{item.userPrompt}</span>
                      </div>
                      <div className="mb-2">
                        <span style={{ color: "#6B7280" }}>Error: </span>
                        <span style={{ color: "#EF4444" }}>{item.error}</span>
                      </div>
                      <div className="mb-2">
                        <span style={{ color: "#6B7280" }}>Tools attempted: </span>
                        <span style={{ color: "#FFFFFF" }}>
                          {item.toolsSelected.length > 0
                            ? item.toolsSelected.join(", ")
                            : "None"}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "#6B7280" }}>Latency: </span>
                        <span style={{ color: "#FFFFFF" }}>{item.latencyMs}ms</span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

function FeedbackTable({
  items,
  loading,
  total,
  expandedRow,
  onToggleExpand,
}: {
  items: FeedbackEntry[];
  loading: boolean;
  total: number;
  expandedRow: string | null;
  onToggleExpand: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#9CA3AF" }} />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState message="No feedback entries found." />;
  }

  return (
    <>
      <p className="text-xs mb-3" style={{ color: "#6B7280" }}>
        {total} total feedback entries
      </p>
      <Table>
        <TableHeader>
          <TableRow style={{ borderColor: "#2D333B" }}>
            <TableHead style={{ color: "#9CA3AF" }} className="w-8" />
            <TableHead style={{ color: "#9CA3AF" }} className="w-10">
              Rating
            </TableHead>
            <TableHead style={{ color: "#9CA3AF" }}>User Query</TableHead>
            <TableHead style={{ color: "#9CA3AF" }}>Notes</TableHead>
            <TableHead style={{ color: "#9CA3AF" }}>User</TableHead>
            <TableHead style={{ color: "#9CA3AF" }}>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <>
              <TableRow key={item.id} style={{ borderColor: "#2D333B" }}>
                <TableCell>
                  <ExpandToggle
                    expanded={expandedRow === item.id}
                    onClick={() => onToggleExpand(item.id)}
                  />
                </TableCell>
                <TableCell>
                  {item.isPositive ? (
                    <ThumbsUp className="h-4 w-4" style={{ color: "#4ADE80" }} />
                  ) : (
                    <ThumbsDown className="h-4 w-4" style={{ color: "#EF4444" }} />
                  )}
                </TableCell>
                <TableCell style={{ color: "#FFFFFF" }} className="max-w-xs truncate">
                  {item.userQuery.slice(0, 80)}
                  {item.userQuery.length > 80 ? "..." : ""}
                </TableCell>
                <TableCell style={{ color: "#9CA3AF" }} className="max-w-xs truncate text-sm">
                  {item.notes || "-"}
                </TableCell>
                <TableCell style={{ color: "#9CA3AF" }} className="text-sm">
                  <div>{item.userName}</div>
                  {item.companyName && (
                    <div className="text-xs" style={{ color: "#6B7280" }}>
                      {item.companyName}
                    </div>
                  )}
                </TableCell>
                <TableCell style={{ color: "#6B7280" }} className="text-sm whitespace-nowrap">
                  <TimeAgo date={item.createdAt} />
                </TableCell>
              </TableRow>
              {expandedRow === item.id && (
                <TableRow key={`${item.id}-detail`} style={{ borderColor: "#2D333B" }}>
                  <TableCell colSpan={6}>
                    <div
                      className="p-3 rounded text-xs whitespace-pre-wrap space-y-3"
                      style={{ backgroundColor: "#0D1117", color: "#9CA3AF" }}
                    >
                      <div>
                        <div className="font-medium mb-1" style={{ color: "#6B7280" }}>
                          User Query:
                        </div>
                        <div style={{ color: "#FFFFFF" }}>{item.userQuery}</div>
                      </div>
                      <div>
                        <div className="font-medium mb-1" style={{ color: "#6B7280" }}>
                          Assistant Response:
                        </div>
                        <div style={{ color: "#FFFFFF" }}>{item.assistantResponse}</div>
                      </div>
                      {item.notes && (
                        <div>
                          <div className="font-medium mb-1" style={{ color: "#6B7280" }}>
                            User Notes:
                          </div>
                          <div style={{ color: "#FBBF24" }}>{item.notes}</div>
                        </div>
                      )}
                      {item.toolCallsUsed.length > 0 && (
                        <div>
                          <div className="font-medium mb-1" style={{ color: "#6B7280" }}>
                            Tools Used:
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            {item.toolCallsUsed.map((tool, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-xs font-mono"
                                style={{ backgroundColor: "#2D333B", color: "#4ADE80" }}
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
