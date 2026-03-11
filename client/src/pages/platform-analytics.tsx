import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  Users,
  Clock,
  Activity,
  LogIn,
  Bot,
  ArrowUpDown,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
} from "recharts";

// --- Types ---

interface AnalyticsOverview {
  activeUsersToday: number;
  avgTimePerUserSeconds: number;
  totalActionsToday: number;
  totalLoginsToday: number;
  totalAgentTimeToday: number;
  totalAppTimeToday: number;
  activeUsersInRange: number;
  avgDailyActiveUsers: number;
}

interface DailyTrend {
  date: string;
  activeUsers: number;
  avgTimeSeconds: number;
  totalActions: number;
  totalLogins: number;
  agentTimeSeconds: number;
  appTimeSeconds: number;
}

interface UserUsageStats {
  userId: string;
  email: string;
  name: string;
  companyName: string | null;
  companyId: string | null;
  totalTimeSeconds: number;
  agentTimeSeconds: number;
  appTimeSeconds: number;
  totalActions: number;
  totalLogins: number;
  lastActiveDate: string | null;
}

interface DashboardResponse {
  overview: AnalyticsOverview;
  dailyTrends: DailyTrend[];
  topUsers: UserUsageStats[];
}

// --- Helpers ---

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function pct(a: number, total: number): string {
  if (total === 0) return "0%";
  return Math.round((a / total) * 100) + "%";
}

type SortKey = "name" | "totalTimeSeconds" | "agentTimeSeconds" | "appTimeSeconds" | "totalActions" | "totalLogins" | "lastActiveDate";

// --- Date range presets ---

const DATE_PRESET_KEYS = [
  { key: "analytics.today", days: 0 },
  { key: "analytics.7days", days: 7 },
  { key: "analytics.30days", days: 30 },
  { key: "analytics.90days", days: 90 },
] as const;

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// --- Component ---

export default function PlatformAnalytics() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [rangeDays, setRangeDays] = useState(7);
  const [sortKey, setSortKey] = useState<SortKey>("totalTimeSeconds");
  const [sortAsc, setSortAsc] = useState(false);

  const endDate = toISODate(new Date());
  const startDate = toISODate(
    new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000)
  );

  // Root admin check
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/v1/auth/user"],
    retry: false,
  });
  const isRootAdmin =
    currentUser?.isRoot === true || currentUser?.is_root === true;

  // Dashboard data
  const { data: dashboard, isLoading: dashLoading } =
    useQuery<DashboardResponse>({
      queryKey: [
        `/api/v1/analytics/dashboard?start_date=${startDate}&end_date=${endDate}`,
      ],
      enabled: isRootAdmin,
      staleTime: 30000,
    });

  // User table data
  const { data: usageData, isLoading: usageLoading } = useQuery<
    UserUsageStats[]
  >({
    queryKey: [
      `/api/v1/analytics/usage?start_date=${startDate}&end_date=${endDate}&limit=200`,
    ],
    enabled: isRootAdmin,
    staleTime: 30000,
  });

  const sortedUsers = useMemo(() => {
    if (!usageData) return [];
    return [...usageData].sort((a, b) => {
      let aVal: string | number = a[sortKey] ?? "";
      let bVal: string | number = b[sortKey] ?? "";
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [usageData, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  // Loading
  if (dashLoading && usageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#9CA3AF" }} />
      </div>
    );
  }

  // Access denied
  if (!isRootAdmin) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card style={{ backgroundColor: "#161B22", borderColor: "#2D333B" }}>
          <CardHeader>
            <CardTitle style={{ color: "#EF4444" }}>{tc('error.accessDenied')}</CardTitle>
            <p style={{ color: "#9CA3AF" }}>
              {tc('error.rootOnly')}
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const overview = dashboard?.overview;
  const trends = dashboard?.dailyTrends || [];

  // Chart data with short date labels
  const chartData = trends.map((trend) => ({
    ...trend,
    label: formatDate(trend.date),
    agentMin: Math.round(trend.agentTimeSeconds / 60),
    appMin: Math.round(trend.appTimeSeconds / 60),
    avgMin: Math.round(trend.avgTimeSeconds / 60),
  }));

  const totalAgentToday = overview?.totalAgentTimeToday ?? 0;
  const totalAppToday = overview?.totalAppTimeToday ?? 0;
  const totalTimeToday = totalAgentToday + totalAppToday;

  return (
    <div className="space-y-6">
      {/* Header + Date Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#FFFFFF" }}>
            {t('analytics.title')}
          </h1>
          <p style={{ color: "#9CA3AF" }} className="text-sm">
            {t('analytics.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          {DATE_PRESET_KEYS.map((p) => (
            <button
              key={p.days}
              onClick={() => setRangeDays(p.days)}
              className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
              style={{
                backgroundColor:
                  rangeDays === p.days ? "#4ADE80" : "#1F242C",
                color: rangeDays === p.days ? "#0F1115" : "#9CA3AF",
                border: "1px solid",
                borderColor:
                  rangeDays === p.days ? "#4ADE80" : "#2D333B",
              }}
            >
              {t(p.key)}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label={t('analytics.activeUsersToday')}
          value={String(overview?.activeUsersToday ?? 0)}
          icon={<Users className="h-4 w-4" />}
          accent="#4ADE80"
        />
        <KpiCard
          label={t('analytics.avgTimePerUser')}
          value={formatDuration(overview?.avgTimePerUserSeconds ?? 0)}
          icon={<Clock className="h-4 w-4" />}
          accent="#60A5FA"
        />
        <KpiCard
          label={t('analytics.actionsToday')}
          value={String(overview?.totalActionsToday ?? 0)}
          icon={<Activity className="h-4 w-4" />}
          accent="#FBBF24"
        />
        <KpiCard
          label={t('analytics.loginsToday')}
          value={String(overview?.totalLoginsToday ?? 0)}
          icon={<LogIn className="h-4 w-4" />}
          accent="#F97316"
        />
        <KpiCard
          label={t('analytics.agentVsApp')}
          value={
            totalTimeToday > 0
              ? `${pct(totalAgentToday, totalTimeToday)} / ${pct(totalAppToday, totalTimeToday)}`
              : "No data"
          }
          subtitle={
            totalTimeToday > 0
              ? `${t('analytics.agentTime')} ${formatDuration(totalAgentToday)} · ${t('analytics.appTime')} ${formatDuration(totalAppToday)}`
              : undefined
          }
          icon={<Bot className="h-4 w-4" />}
          accent="#A78BFA"
          miniBar={
            totalTimeToday > 0
              ? { agent: totalAgentToday, app: totalAppToday }
              : undefined
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Activity Trends */}
        <Card style={{ backgroundColor: "#161B22", borderColor: "#2D333B" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "#9CA3AF" }}>
              {t('analytics.activityTrends')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D333B" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    axisLine={{ stroke: "#2D333B" }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    axisLine={{ stroke: "#2D333B" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    axisLine={{ stroke: "#2D333B" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#1F242C",
                      border: "1px solid #2D333B",
                      borderRadius: 8,
                      color: "#fff",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: "#9CA3AF", fontSize: 11 }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="activeUsers"
                    name={t('analytics.activeUsers')}
                    fill="#4ADE80"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgMin"
                    name={t('analytics.avgTime')}
                    stroke="#60A5FA"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalActions"
                    name={t('analytics.actions')}
                    stroke="#FBBF24"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Agent vs App Time */}
        <Card style={{ backgroundColor: "#161B22", borderColor: "#2D333B" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "#9CA3AF" }}>
              {t('analytics.agentVsAppTime')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D333B" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    axisLine={{ stroke: "#2D333B" }}
                  />
                  <YAxis
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    axisLine={{ stroke: "#2D333B" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#1F242C",
                      border: "1px solid #2D333B",
                      borderRadius: 8,
                      color: "#fff",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: "#9CA3AF", fontSize: 11 }}
                  />
                  <Bar
                    dataKey="agentMin"
                    name={t('analytics.agentTime')}
                    stackId="time"
                    fill="#A78BFA"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="appMin"
                    name={t('analytics.appTime')}
                    stackId="time"
                    fill="#4ADE80"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card style={{ backgroundColor: "#161B22", borderColor: "#2D333B" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium" style={{ color: "#9CA3AF" }}>
            {t('analytics.userUsage', { count: sortedUsers.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {sortedUsers.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3
                className="h-12 w-12 mx-auto mb-4"
                style={{ color: "#2D333B" }}
              />
              <p style={{ color: "#9CA3AF" }}>
                {t('analytics.noUsageData')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "#2D333B" }}>
                  <SortableHead
                    label={tc('table.name')}
                    sortKey="name"
                    currentKey={sortKey}
                    asc={sortAsc}
                    onSort={handleSort}
                  />
                  <TableHead style={{ color: "#9CA3AF" }}>{tc('table.email')}</TableHead>
                  <TableHead style={{ color: "#9CA3AF" }}>{tc('table.company')}</TableHead>
                  <SortableHead
                    label={t('analytics.totalTime')}
                    sortKey="totalTimeSeconds"
                    currentKey={sortKey}
                    asc={sortAsc}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label={t('analytics.agent')}
                    sortKey="agentTimeSeconds"
                    currentKey={sortKey}
                    asc={sortAsc}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label={t('analytics.app')}
                    sortKey="appTimeSeconds"
                    currentKey={sortKey}
                    asc={sortAsc}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label={t('analytics.actions')}
                    sortKey="totalActions"
                    currentKey={sortKey}
                    asc={sortAsc}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label={t('analytics.logins')}
                    sortKey="totalLogins"
                    currentKey={sortKey}
                    asc={sortAsc}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label={t('analytics.lastActive')}
                    sortKey="lastActiveDate"
                    currentKey={sortKey}
                    asc={sortAsc}
                    onSort={handleSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((u) => (
                  <TableRow
                    key={u.userId}
                    style={{ borderColor: "#2D333B" }}
                  >
                    <TableCell
                      className="font-medium"
                      style={{ color: "#FFFFFF" }}
                    >
                      {u.name}
                    </TableCell>
                    <TableCell style={{ color: "#9CA3AF" }}>
                      {u.email}
                    </TableCell>
                    <TableCell style={{ color: "#9CA3AF" }}>
                      {u.companyName || "-"}
                    </TableCell>
                    <TableCell style={{ color: "#FFFFFF" }}>
                      {formatDuration(u.totalTimeSeconds)}
                    </TableCell>
                    <TableCell style={{ color: "#A78BFA" }}>
                      {formatDuration(u.agentTimeSeconds)}
                    </TableCell>
                    <TableCell style={{ color: "#4ADE80" }}>
                      {formatDuration(u.appTimeSeconds)}
                    </TableCell>
                    <TableCell style={{ color: "#FBBF24" }}>
                      {u.totalActions}
                    </TableCell>
                    <TableCell style={{ color: "#F97316" }}>
                      {u.totalLogins}
                    </TableCell>
                    <TableCell style={{ color: "#9CA3AF" }}>
                      {u.lastActiveDate
                        ? formatDate(u.lastActiveDate)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Sub-components ---

function KpiCard({
  label,
  value,
  subtitle,
  icon,
  accent,
  miniBar,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
  miniBar?: { agent: number; app: number };
}) {
  const total = miniBar ? miniBar.agent + miniBar.app : 0;
  const agentPct = total > 0 ? (miniBar!.agent / total) * 100 : 0;

  return (
    <Card style={{ backgroundColor: "#161B22", borderColor: "#2D333B" }}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-xs font-medium"
            style={{ color: "#9CA3AF" }}
          >
            {label}
          </span>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <div
          className="text-xl font-bold"
          style={{ color: "#FFFFFF" }}
        >
          {value}
        </div>
        {subtitle && (
          <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
            {subtitle}
          </div>
        )}
        {miniBar && total > 0 && (
          <div
            className="mt-2 h-1.5 rounded-full overflow-hidden flex"
            style={{ backgroundColor: "#2D333B" }}
          >
            <div
              className="h-full rounded-l-full"
              style={{
                width: `${agentPct}%`,
                backgroundColor: "#A78BFA",
              }}
            />
            <div
              className="h-full rounded-r-full"
              style={{
                width: `${100 - agentPct}%`,
                backgroundColor: "#4ADE80",
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SortableHead({
  label,
  sortKey: key,
  currentKey,
  asc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  asc: boolean;
  onSort: (k: SortKey) => void;
}) {
  const active = currentKey === key;
  return (
    <TableHead
      className="cursor-pointer select-none"
      style={{ color: active ? "#FFFFFF" : "#9CA3AF" }}
      onClick={() => onSort(key)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" style={{ opacity: active ? 1 : 0.4 }} />
      </span>
    </TableHead>
  );
}

function EmptyChart() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ height: 260, color: "#9CA3AF" }}
    >
      <div className="text-center">
        <BarChart3
          className="h-10 w-10 mx-auto mb-2"
          style={{ color: "#2D333B" }}
        />
        <p className="text-sm">No data for this period</p>
      </div>
    </div>
  );
}
