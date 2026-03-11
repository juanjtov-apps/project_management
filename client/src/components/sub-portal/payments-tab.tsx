import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  DollarSign,
  CheckCircle,
  Clock,
  Loader2,
  TrendingUp,
  Wallet,
  ShieldCheck,
  CalendarCheck,
  LinkIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PaymentMilestone {
  id: string;
  name: string;
  amount: number;
  status: "pending" | "payable" | "approved" | "paid";
  linkedTasksCount: number;
  paidDate?: string;
  approvedDate?: string;
  description?: string;
}

interface PaymentSummary {
  totalContractValue: number;
  earned: number;
  paid: number;
  retention: number;
  remaining: number;
  milestones: PaymentMilestone[];
}

interface PaymentsTabProps {
  projectId: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PaymentsTab({ projectId }: PaymentsTabProps) {
  const { t } = useTranslation('subPortal');

  const milestoneStatusConfig: Record<
    PaymentMilestone["status"],
    { label: string; className: string; icon: typeof Clock }
  > = {
    pending: {
      label: t('payments.status.pending'),
      className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
      icon: Clock,
    },
    payable: {
      label: t('payments.status.payable'),
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      icon: TrendingUp,
    },
    approved: {
      label: t('payments.status.approved'),
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      icon: ShieldCheck,
    },
    paid: {
      label: t('payments.status.paid'),
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: CheckCircle,
    },
  };

  const { data, isLoading } = useQuery<PaymentSummary>({
    queryKey: ["/api/v1/sub/my-milestones", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sub/my-milestones?projectId=${projectId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch milestones");
      return res.json();
    },
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--pro-text-muted)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
        <CardContent className="text-center py-12">
          <DollarSign className="h-16 w-16 mx-auto text-[var(--pro-text-muted)] mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-[var(--pro-text-primary)]">
            {t('payments.noPaymentData')}
          </h3>
          <p className="text-[var(--pro-text-secondary)]">
            {t('payments.noPaymentDataDesc')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const milestones = data.milestones || [];
  const paidPercent =
    data.totalContractValue > 0
      ? Math.round((data.paid / data.totalContractValue) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--pro-text-primary)]">
          {t('payments.title')}
        </h2>
        <p className="text-[var(--pro-text-secondary)]">
          {t('payments.subtitle')}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-[var(--pro-text-muted)]" />
              <span className="text-xs text-[var(--pro-text-secondary)] uppercase tracking-wider">
                {t('payments.contract')}
              </span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-[var(--pro-text-primary)]">
              {formatCurrency(data.totalContractValue)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-[var(--pro-text-secondary)] uppercase tracking-wider">
                {t('payments.earned')}
              </span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-blue-400">
              {formatCurrency(data.earned)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--pro-surface)] border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-[var(--pro-text-secondary)] uppercase tracking-wider">
                {t('payments.paid')}
              </span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-emerald-400">
              {formatCurrency(data.paid)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-[var(--pro-text-secondary)] uppercase tracking-wider">
                {t('payments.retention')}
              </span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-amber-400">
              {formatCurrency(data.retention)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)] col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-[var(--pro-text-muted)]" />
              <span className="text-xs text-[var(--pro-text-secondary)] uppercase tracking-wider">
                {t('payments.remaining')}
              </span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-[var(--pro-text-primary)]">
              {formatCurrency(data.remaining)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Progress Bar */}
      <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-[var(--pro-text-secondary)]">{t('payments.paymentProgress')}</span>
            <span className="text-[var(--pro-text-primary)] font-medium">{paidPercent}%</span>
          </div>
          <div className="w-full h-3 bg-[var(--pro-surface-highlight)] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-[var(--pro-text-muted)]">
            <span>{t('payments.paidAmount', { amount: formatCurrency(data.paid) })}</span>
            <span>{t('payments.totalAmount', { amount: formatCurrency(data.totalContractValue) })}</span>
          </div>
        </CardContent>
      </Card>

      {/* Milestones List */}
      {milestones.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-[var(--pro-text-primary)]">
            {t('payments.milestones')}
          </h3>
          <div className="space-y-2">
            {milestones.map((milestone) => {
              const config =
                milestoneStatusConfig[milestone.status] ||
                milestoneStatusConfig.pending;
              const StatusIcon = config.icon;

              return (
                <Card
                  key={milestone.id}
                  className="bg-[var(--pro-surface)] border-[var(--pro-border)]"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-medium text-[var(--pro-text-primary)]">
                            {milestone.name}
                          </h4>
                          <Badge variant="outline" className={config.className}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>

                        {milestone.description && (
                          <p className="text-sm text-[var(--pro-text-secondary)] mb-2">
                            {milestone.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-[var(--pro-text-muted)]">
                          {milestone.linkedTasksCount > 0 && (
                            <div className="flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" />
                              <span>
                                {t('payments.linkedTasks', { count: milestone.linkedTasksCount })}
                              </span>
                            </div>
                          )}
                          {milestone.paidDate && (
                            <div className="flex items-center gap-1">
                              <CalendarCheck className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">
                                {t('payments.paidOn', {
                                  date: new Date(milestone.paidDate).toLocaleDateString(
                                    "en-US",
                                    { month: "short", day: "numeric", year: "numeric" }
                                  )
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-[var(--pro-text-primary)]">
                          {formatCurrency(milestone.amount)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
