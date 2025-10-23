import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    direction: "up" | "down";
  };
  onClick?: () => void;
  className?: string;
  "data-testid"?: string;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  onClick,
  className,
  "data-testid": testId,
}: KpiCardProps) {
  const isClickable = !!onClick;

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      data-testid={testId}
      className={cn(
        "card-surface text-left transition-all group",
        "border border-border",
        isClickable &&
          "cursor-pointer hover:border-primary/50 hover:shadow-lg active:scale-[0.98]",
        !isClickable && "cursor-default",
        className
      )}
      aria-label={`${title}: ${value}${trend ? `, ${trend.label}` : ""}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-lg bg-[var(--color-primary-600)]/10 group-hover:bg-[var(--color-primary-600)]/20 transition-colors">
          <Icon
            className="w-6 h-6 text-[var(--color-primary-600)]"
            aria-hidden="true"
          />
        </div>

        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              trend.direction === "up"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm text-[var(--text-secondary)]">{title}</p>
        <p className="text-3xl font-bold text-[var(--text-primary)]">{value}</p>
        {trend && (
          <p className="text-xs text-[var(--text-secondary)]">{trend.label}</p>
        )}
      </div>
    </button>
  );
}
