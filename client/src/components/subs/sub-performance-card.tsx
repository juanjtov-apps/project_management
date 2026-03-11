import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Star,
  Clock,
  ShieldCheck,
  FileText,
  MessageSquare,
  HardHat,
  RefreshCw,
  Loader2,
  TrendingUp,
  Building,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface PerformanceDimension {
  score: number;
  weight: number;
  dataPoints: number;
}

interface ProjectBreakdown {
  projectId: string;
  projectName: string;
  compositeScore: number;
  taskCount: number;
  completedTasks: number;
}

interface PerformanceData {
  subcontractorId: string;
  companyName: string;
  compositeScore: number;
  dimensions: {
    timeliness: PerformanceDimension;
    quality: PerformanceDimension;
    documentation: PerformanceDimension;
    responsiveness: PerformanceDimension;
    safety: PerformanceDimension;
  };
  projectBreakdowns: ProjectBreakdown[];
  lastCalculatedAt?: string;
}

interface SubPerformanceCardProps {
  subcontractorId: string;
}

const dimensionConfig: Record<
  string,
  { labelKey: string; icon: typeof Star; color: string; indicatorColor: string }
> = {
  timeliness: {
    labelKey: "subs.timeliness",
    icon: Clock,
    color: "text-blue-400",
    indicatorColor: "#60A5FA",
  },
  quality: {
    labelKey: "subs.quality",
    icon: ShieldCheck,
    color: "text-emerald-400",
    indicatorColor: "#34D399",
  },
  documentation: {
    labelKey: "subs.documentation",
    icon: FileText,
    color: "text-amber-400",
    indicatorColor: "#FBBF24",
  },
  responsiveness: {
    labelKey: "subs.responsiveness",
    icon: MessageSquare,
    color: "text-purple-400",
    indicatorColor: "#A78BFA",
  },
  safety: {
    labelKey: "subs.safety",
    icon: HardHat,
    color: "text-red-400",
    indicatorColor: "#F87171",
  },
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function getScoreBadgeKey(score: number): { labelKey: string; className: string } {
  if (score >= 90)
    return {
      labelKey: "subs.excellent",
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    };
  if (score >= 75)
    return {
      labelKey: "subs.good",
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };
  if (score >= 60)
    return {
      labelKey: "subs.average",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
  if (score >= 40)
    return {
      labelKey: "subs.belowAvg",
      className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    };
  return {
    labelKey: "subs.poor",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  };
}

export function SubPerformanceCard({
  subcontractorId,
}: SubPerformanceCardProps) {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PerformanceData | null>({
    queryKey: ["/api/v1/sub/companies", subcontractorId, "performance"],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/sub/companies/${subcontractorId}/performance`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch performance data");
      const rows = await res.json();

      // API returns a flat array of per-project score rows — transform to expected shape
      if (!Array.isArray(rows) || rows.length === 0) return null;

      const totalTasks = rows.reduce((s: number, r: Record<string, number>) => s + (r.tasksTotal || 0), 0);

      // Weighted average of each dimension across projects (weighted by tasksTotal)
      const avgDim = (field: string) => {
        if (totalTasks === 0) return 0;
        return rows.reduce((s: number, r: Record<string, number>) =>
          s + (r[field] || 0) * (r.tasksTotal || 0), 0) / totalTasks;
      };

      const compositeScore = rows.reduce((s: number, r: Record<string, number>) =>
        s + (r.compositeScore || 0), 0) / rows.length;

      const data: PerformanceData = {
        subcontractorId,
        companyName: "",
        compositeScore: Math.round(compositeScore * 100) / 100,
        dimensions: {
          timeliness: { score: avgDim("timelinessScore"), weight: 30, dataPoints: totalTasks },
          quality: { score: avgDim("qualityScore"), weight: 30, dataPoints: totalTasks },
          documentation: { score: avgDim("documentationScore"), weight: 15, dataPoints: totalTasks },
          responsiveness: { score: avgDim("responsivenessScore"), weight: 15, dataPoints: totalTasks },
          safety: { score: avgDim("safetyScore"), weight: 10, dataPoints: totalTasks },
        },
        projectBreakdowns: rows.map((r: Record<string, unknown>) => ({
          projectId: String(r.projectId || ""),
          projectName: String(r.projectName || "Unknown"),
          compositeScore: Number(r.compositeScore || 0),
          taskCount: Number(r.tasksTotal || 0),
          completedTasks: Number(r.tasksOnTime || 0),
        })),
        lastCalculatedAt: rows[0]?.calculatedAt as string | undefined,
      };
      return data;
    },
    enabled: !!subcontractorId,
  });

  const recalcMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/v1/sub/companies/${subcontractorId}/calculate-performance`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to recalculate");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/companies", subcontractorId, "performance"],
      });
      toast({ title: t('subs.performanceRecalculated') });
    },
    onError: (error: Error) => {
      toast({
        title: t('subs.recalculationFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--pro-text-muted)]" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
        <CardContent className="text-center py-12">
          <TrendingUp className="h-12 w-12 mx-auto text-[var(--pro-text-muted)] mb-3" />
          <h3 className="text-lg font-semibold text-[var(--pro-text-primary)] mb-1">
            {t('subs.noPerformanceData')}
          </h3>
          <p className="text-sm text-[var(--pro-text-secondary)]">
            {t('subs.performanceWillAppear')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const scoreBadge = getScoreBadgeKey(data.compositeScore);

  return (
    <div className="space-y-4">
      {/* Composite Score */}
      <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-[var(--pro-text-primary)] flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" />
              {t('subs.performanceScore')}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => recalcMutation.mutate()}
              disabled={recalcMutation.isPending}
              className="text-[var(--pro-text-secondary)] hover:text-white"
            >
              {recalcMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-1.5 hidden sm:inline">{t('subs.recalculate')}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div
              className={`text-5xl font-bold ${getScoreColor(data.compositeScore)}`}
            >
              {Math.round(data.compositeScore)}
            </div>
            <div>
              <Badge variant="outline" className={scoreBadge.className}>
                {t(scoreBadge.labelKey)}
              </Badge>
              {data.lastCalculatedAt && (
                <p className="text-xs text-[var(--pro-text-muted)] mt-1">
                  {t('subs.updated')}{" "}
                  {new Date(data.lastCalculatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Dimension Bars */}
          <div className="space-y-4">
            {Object.entries(data.dimensions).map(([key, dim]) => {
              const config = dimensionConfig[key];
              if (!config) return null;
              const Icon = config.icon;

              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className="text-sm font-medium text-[var(--pro-text-primary)]">
                        {t(config.labelKey)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--pro-text-primary)]">
                        {Math.round(dim.score)}
                      </span>
                      <span className="text-xs text-[var(--pro-text-muted)]">
                        ({t('subs.pts', { count: dim.dataPoints })})
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={dim.score}
                    className="h-2"
                    indicatorColor={config.indicatorColor}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-Project Breakdown */}
      {data.projectBreakdowns && data.projectBreakdowns.length > 0 && (
        <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[var(--pro-text-primary)] flex items-center gap-2">
              <Building className="h-5 w-5 text-[var(--pro-blue)]" />
              {t('subs.projectBreakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.projectBreakdowns.map((proj) => {
                const projBadge = getScoreBadgeKey(proj.compositeScore);
                return (
                  <div
                    key={proj.projectId}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--pro-bg)] border border-[var(--pro-border)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--pro-text-primary)] truncate">
                        {proj.projectName}
                      </p>
                      <p className="text-xs text-[var(--pro-text-muted)]">
                        {t('subs.tasksCompleted', { completed: proj.completedTasks, total: proj.taskCount })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-lg font-bold ${getScoreColor(proj.compositeScore)}`}
                      >
                        {Math.round(proj.compositeScore)}
                      </span>
                      <Badge variant="outline" className={projBadge.className}>
                        {t(projBadge.labelKey)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
