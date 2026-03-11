import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Search,
  Building,
  Phone,
  Mail,
  HardHat,
  Star,
  AlertTriangle,
  ClipboardList,
  Loader2,
  Filter,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InviteSubDialog } from "@/components/subs/invite-sub-dialog";
import { SubPerformanceCard } from "@/components/subs/sub-performance-card";

interface SubCompanyEntry {
  id: string;
  companyName: string;
  trade?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: "active" | "inactive" | "suspended";
  performanceScore?: number;
  activeAssignments: number;
  insuranceExpiry?: string;
  licenseExpiry?: string;
  createdAt: string;
}

function isExpiringSoon(dateStr?: string): boolean {
  if (!dateStr) return false;
  const expiry = new Date(dateStr);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return expiry <= thirtyDaysFromNow;
}

function isExpired(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function getScoreColor(score?: number): string {
  if (!score) return "text-[var(--pro-text-muted)]";
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

const statusConfig: Record<
  SubCompanyEntry["status"],
  { labelKey: string; className: string }
> = {
  active: {
    labelKey: "status.active",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  inactive: {
    labelKey: "subs.inactive",
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  },
  suspended: {
    labelKey: "subs.suspended",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

interface SubDirectoryProps {
  onViewTasks?: (subCompanyId: string) => void;
}

export function SubDirectory({ onViewTasks }: SubDirectoryProps = {}) {
  const { t } = useTranslation('common');
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [selectedSub, setSelectedSub] = useState<SubCompanyEntry | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: companies = [], isLoading } = useQuery<SubCompanyEntry[]>({
    queryKey: ["/api/v1/sub/companies", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sub/companies?status=${statusFilter}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch sub companies");
      return res.json();
    },
  });

  // Filter companies
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      !searchQuery ||
      company.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (company.trade &&
        company.trade.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || company.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function openDetail(company: SubCompanyEntry) {
    setSelectedSub(company);
    setDetailDialogOpen(true);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--pro-text-primary)]">
            {t('subs.subDirectory')}
          </h2>
          <p className="text-[var(--pro-text-secondary)]">
            {t('subs.subcontractorCompany', { count: filteredCompanies.length })}
          </p>
        </div>
        <InviteSubDialog />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--pro-text-muted)]" />
          <Input
            placeholder={t('subs.searchByNameTrade')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-2 text-[var(--pro-text-muted)]" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('subs.allStatus')}</SelectItem>
            <SelectItem value="active">{t('status.active')}</SelectItem>
            <SelectItem value="inactive">{t('subs.inactive')}</SelectItem>
            <SelectItem value="suspended">{t('subs.suspended')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Companies Grid */}
      {filteredCompanies.length === 0 ? (
        <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
          <CardContent className="text-center py-12">
            <Building className="h-16 w-16 mx-auto text-[var(--pro-text-muted)] mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-[var(--pro-text-primary)]">
              {companies.length === 0
                ? t('subs.noSubsYet')
                : t('subs.noResultsFound')}
            </h3>
            <p className="text-[var(--pro-text-secondary)] mb-4">
              {companies.length === 0
                ? t('subs.inviteFirstSub')
                : t('subs.adjustSearchFilter')}
            </p>
            {companies.length === 0 && <InviteSubDialog />}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company) => {
            const status = statusConfig[company.status] || statusConfig.active;
            const hasInsuranceWarning =
              isExpiringSoon(company.insuranceExpiry) ||
              isExpired(company.insuranceExpiry);
            const hasLicenseWarning =
              isExpiringSoon(company.licenseExpiry) ||
              isExpired(company.licenseExpiry);

            return (
              <Card
                key={company.id}
                className="bg-[var(--pro-surface)] border-[var(--pro-border)] hover:border-[var(--pro-mint)]/30 transition-colors cursor-pointer active:scale-[0.99]"
                onClick={() => onViewTasks ? onViewTasks(company.id) : openDetail(company)}
              >
                <CardContent className="p-4">
                  {/* Company Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[var(--pro-text-primary)] truncate">
                          {company.companyName}
                        </h3>
                        <Badge variant="outline" className={status.className}>
                          {t(status.labelKey)}
                        </Badge>
                      </div>
                      {company.trade && (
                        <Badge
                          variant="outline"
                          className="mt-1.5 bg-[var(--pro-mint)]/10 text-[var(--pro-mint)] border-[var(--pro-mint)]/30"
                        >
                          <HardHat className="h-3 w-3 mr-1" />
                          {company.trade}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-[var(--pro-text-muted)] hover:text-[var(--pro-mint)] shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(company);
                      }}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Performance & Assignments */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Star
                        className={`h-4 w-4 ${getScoreColor(company.performanceScore)}`}
                      />
                      <span
                        className={`text-sm font-semibold ${getScoreColor(company.performanceScore)}`}
                      >
                        {company.performanceScore != null
                          ? Math.round(company.performanceScore)
                          : "--"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-[var(--pro-text-secondary)]">
                      <ClipboardList className="h-3.5 w-3.5" />
                      <span>
                        {t('subs.activeAssignment', { count: company.activeAssignments })}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-sm text-[var(--pro-text-secondary)]">
                    {company.contactEmail && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--pro-text-muted)]" />
                        <span className="truncate">{company.contactEmail}</span>
                      </div>
                    )}
                    {company.contactPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--pro-text-muted)]" />
                        <span>{company.contactPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Warnings */}
                  {(hasInsuranceWarning || hasLicenseWarning) && (
                    <div className="mt-3 pt-3 border-t border-[var(--pro-border)] space-y-1">
                      {hasInsuranceWarning && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <AlertTriangle
                            className={`h-3.5 w-3.5 ${
                              isExpired(company.insuranceExpiry)
                                ? "text-red-400"
                                : "text-amber-400"
                            }`}
                          />
                          <span
                            className={
                              isExpired(company.insuranceExpiry)
                                ? "text-red-400"
                                : "text-amber-400"
                            }
                          >
                            {isExpired(company.insuranceExpiry)
                              ? t('subs.insuranceExpired')
                              : t('subs.insuranceExpiringSoon')}
                            {company.insuranceExpiry &&
                              ` (${new Date(company.insuranceExpiry).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`}
                          </span>
                        </div>
                      )}
                      {hasLicenseWarning && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <AlertTriangle
                            className={`h-3.5 w-3.5 ${
                              isExpired(company.licenseExpiry)
                                ? "text-red-400"
                                : "text-amber-400"
                            }`}
                          />
                          <span
                            className={
                              isExpired(company.licenseExpiry)
                                ? "text-red-400"
                                : "text-amber-400"
                            }
                          >
                            {isExpired(company.licenseExpiry)
                              ? t('subs.licenseExpired')
                              : t('subs.licenseExpiringSoon')}
                            {company.licenseExpiry &&
                              ` (${new Date(company.licenseExpiry).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sub Detail Dialog with Performance */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-[var(--pro-mint)]" />
              {selectedSub?.companyName}
            </DialogTitle>
          </DialogHeader>

          {selectedSub && (
            <div className="space-y-4">
              {/* Company Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={
                      statusConfig[selectedSub.status]?.className || ""
                    }
                  >
                    {t(statusConfig[selectedSub.status]?.labelKey || 'status.active')}
                  </Badge>
                  {selectedSub.trade && (
                    <Badge
                      variant="outline"
                      className="bg-[var(--pro-mint)]/10 text-[var(--pro-mint)] border-[var(--pro-mint)]/30"
                    >
                      <HardHat className="h-3 w-3 mr-1" />
                      {selectedSub.trade}
                    </Badge>
                  )}
                </div>

                {selectedSub.contactEmail && (
                  <div className="flex items-center gap-2 text-sm text-[var(--pro-text-secondary)]">
                    <Mail className="h-4 w-4 text-[var(--pro-text-muted)]" />
                    <a
                      href={`mailto:${selectedSub.contactEmail}`}
                      className="hover:text-white transition-colors"
                    >
                      {selectedSub.contactEmail}
                    </a>
                  </div>
                )}
                {selectedSub.contactPhone && (
                  <div className="flex items-center gap-2 text-sm text-[var(--pro-text-secondary)]">
                    <Phone className="h-4 w-4 text-[var(--pro-text-muted)]" />
                    <a
                      href={`tel:${selectedSub.contactPhone}`}
                      className="hover:text-white transition-colors"
                    >
                      {selectedSub.contactPhone}
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-[var(--pro-text-secondary)]">
                  <ClipboardList className="h-4 w-4 text-[var(--pro-text-muted)]" />
                  <span>
                    {t('subs.activeAssignment', { count: selectedSub.activeAssignments })}
                  </span>
                </div>
              </div>

              {/* Performance Card */}
              <SubPerformanceCard subcontractorId={selectedSub.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
