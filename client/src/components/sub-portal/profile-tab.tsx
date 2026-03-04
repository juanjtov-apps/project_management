import { useQuery } from "@tanstack/react-query";
import {
  UserCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Wrench,
  Star,
  Loader2,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface SubCompanyInfo {
  id: string;
  companyName: string;
  trade: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  licenseNumber?: string;
  insuranceExpiry?: string;
  status: "active" | "inactive" | "suspended";
}

interface PerformanceDimension {
  dimension: string;
  score: number;
  maxScore: number;
}

interface ProjectPerformance {
  projectId: string;
  projectName: string;
  compositeScore: number;
  dimensions: PerformanceDimension[];
}

interface PerformanceData {
  overallScore: number;
  projectPerformances: ProjectPerformance[];
}

interface ProfileTabProps {
  subcontractorId: string;
}

const dimensionConfig: Record<
  string,
  { label: string; color: string; indicatorColor: string }
> = {
  timeliness: {
    label: "Timeliness",
    color: "text-blue-400",
    indicatorColor: "#60a5fa",
  },
  quality: {
    label: "Quality",
    color: "text-emerald-400",
    indicatorColor: "#34d399",
  },
  documentation: {
    label: "Documentation",
    color: "text-amber-400",
    indicatorColor: "#fbbf24",
  },
  responsiveness: {
    label: "Responsiveness",
    color: "text-purple-400",
    indicatorColor: "#c084fc",
  },
  safety: {
    label: "Safety",
    color: "text-red-400",
    indicatorColor: "#f87171",
  },
};

function getScoreColor(score: number): string {
  if (score >= 90) return "text-emerald-400";
  if (score >= 75) return "text-blue-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Average";
  if (score >= 40) return "Below Average";
  return "Poor";
}

export function ProfileTab({ subcontractorId }: ProfileTabProps) {
  // Fetch sub company info
  const { data: company, isLoading: companyLoading } = useQuery<SubCompanyInfo>({
    queryKey: ["/api/v1/sub/companies", subcontractorId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sub/companies/${subcontractorId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch company info");
      return res.json();
    },
    enabled: !!subcontractorId,
  });

  // Fetch performance data
  const { data: performance, isLoading: performanceLoading } =
    useQuery<PerformanceData>({
      queryKey: ["/api/v1/sub/companies", subcontractorId, "performance"],
      queryFn: async () => {
        const res = await fetch(
          `/api/v1/sub/companies/${subcontractorId}/performance`,
          {
            credentials: "include",
          }
        );
        if (!res.ok) throw new Error("Failed to fetch performance data");
        return res.json();
      },
      enabled: !!subcontractorId,
    });

  const isLoading = companyLoading || performanceLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--pro-text-muted)]" />
      </div>
    );
  }

  if (!subcontractorId) {
    return (
      <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
        <CardContent className="text-center py-12">
          <UserCircle className="h-16 w-16 mx-auto text-[var(--pro-text-muted)] mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-[var(--pro-text-primary)]">
            Profile Unavailable
          </h3>
          <p className="text-[var(--pro-text-secondary)]">
            Your subcontractor profile could not be loaded.
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusColor = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    suspended: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--pro-text-primary)]">
          Profile
        </h2>
        <p className="text-[var(--pro-text-secondary)]">
          Your company information and performance ratings
        </p>
      </div>

      {/* Company Info Card */}
      {company && (
        <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-[var(--pro-text-primary)]">
                <Building2 className="h-5 w-5 text-[var(--pro-mint)]" />
                Company Information
              </CardTitle>
              <Badge
                variant="outline"
                className={statusColor[company.status] || statusColor.active}
              >
                {company.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--pro-text-muted)] uppercase tracking-wider">
                    Company Name
                  </label>
                  <p className="text-[var(--pro-text-primary)] font-medium">
                    {company.companyName}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-[var(--pro-text-muted)] uppercase tracking-wider">
                    Trade
                  </label>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Wrench className="h-4 w-4 text-[var(--pro-text-secondary)]" />
                    <p className="text-[var(--pro-text-primary)]">{company.trade}</p>
                  </div>
                </div>

                {company.contactName && (
                  <div>
                    <label className="text-xs text-[var(--pro-text-muted)] uppercase tracking-wider">
                      Contact
                    </label>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <UserCircle className="h-4 w-4 text-[var(--pro-text-secondary)]" />
                      <p className="text-[var(--pro-text-primary)]">
                        {company.contactName}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {company.contactEmail && (
                  <div>
                    <label className="text-xs text-[var(--pro-text-muted)] uppercase tracking-wider">
                      Email
                    </label>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-4 w-4 text-[var(--pro-text-secondary)]" />
                      <p className="text-[var(--pro-text-primary)]">
                        {company.contactEmail}
                      </p>
                    </div>
                  </div>
                )}

                {company.contactPhone && (
                  <div>
                    <label className="text-xs text-[var(--pro-text-muted)] uppercase tracking-wider">
                      Phone
                    </label>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-4 w-4 text-[var(--pro-text-secondary)]" />
                      <p className="text-[var(--pro-text-primary)]">
                        {company.contactPhone}
                      </p>
                    </div>
                  </div>
                )}

                {company.address && (
                  <div>
                    <label className="text-xs text-[var(--pro-text-muted)] uppercase tracking-wider">
                      Address
                    </label>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MapPin className="h-4 w-4 text-[var(--pro-text-secondary)]" />
                      <p className="text-[var(--pro-text-primary)]">
                        {company.address}
                      </p>
                    </div>
                  </div>
                )}

                {company.licenseNumber && (
                  <div>
                    <label className="text-xs text-[var(--pro-text-muted)] uppercase tracking-wider">
                      License #
                    </label>
                    <p className="text-[var(--pro-text-primary)]">
                      {company.licenseNumber}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Performance Score */}
      {performance && (
        <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-[var(--pro-text-primary)]">
              <Star className="h-5 w-5 text-amber-400" />
              Overall Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Score circle */}
              <div className="relative flex items-center justify-center w-32 h-32 shrink-0">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="var(--pro-surface-highlight)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke={
                      performance.overallScore >= 75
                        ? "#34d399"
                        : performance.overallScore >= 50
                          ? "#fbbf24"
                          : "#f87171"
                    }
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(performance.overallScore / 100) * 327} 327`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={`text-3xl font-bold ${getScoreColor(
                      performance.overallScore
                    )}`}
                  >
                    {performance.overallScore}
                  </span>
                  <span className="text-xs text-[var(--pro-text-muted)]">
                    {getScoreLabel(performance.overallScore)}
                  </span>
                </div>
              </div>

              {/* Score explanation */}
              <div className="flex-1 text-center sm:text-left">
                <p className="text-[var(--pro-text-secondary)] text-sm">
                  Your composite performance score is based on timeliness, quality,
                  documentation, responsiveness, and safety across all projects.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Project Performance */}
      {performance &&
        performance.projectPerformances &&
        performance.projectPerformances.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-[var(--pro-text-primary)] flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[var(--pro-blue)]" />
              Performance by Project
            </h3>

            {performance.projectPerformances.map((proj) => (
              <Card
                key={proj.projectId}
                className="bg-[var(--pro-surface)] border-[var(--pro-border)]"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-[var(--pro-text-primary)]">
                      {proj.projectName}
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp
                        className={`h-4 w-4 ${getScoreColor(
                          proj.compositeScore
                        )}`}
                      />
                      <span
                        className={`text-lg font-bold ${getScoreColor(
                          proj.compositeScore
                        )}`}
                      >
                        {proj.compositeScore}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {proj.dimensions.map((dim) => {
                    const config = dimensionConfig[dim.dimension] || {
                      label: dim.dimension,
                      color: "text-zinc-400",
                      indicatorColor: "#a1a1aa",
                    };
                    const percent =
                      dim.maxScore > 0
                        ? Math.round((dim.score / dim.maxScore) * 100)
                        : 0;

                    return (
                      <div key={dim.dimension}>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-sm font-medium ${config.color}`}
                          >
                            {config.label}
                          </span>
                          <span className="text-xs text-[var(--pro-text-muted)]">
                            {dim.score}/{dim.maxScore}
                          </span>
                        </div>
                        <Progress
                          value={percent}
                          indicatorColor={config.indicatorColor}
                          className="h-2"
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
