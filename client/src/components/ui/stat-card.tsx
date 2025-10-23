import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
  "data-testid"?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  onClick,
  className,
  "data-testid": testId,
}: StatCardProps) {
  const isClickable = !!onClick;

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      data-testid={testId}
      className={cn(
        "tap-target card-surface flex flex-col items-start text-left transition-all",
        "border border-border hover:border-primary/50",
        isClickable && "cursor-pointer hover:shadow-lg active:scale-[0.98]",
        !isClickable && "cursor-default",
        className
      )}
      aria-label={`${title}: ${value}${subtitle ? `, ${subtitle}` : ""}`}
    >
      <div className="flex items-center justify-between w-full mb-3">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">{title}</h3>
        {Icon && (
          <Icon className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
        )}
      </div>
      
      <div className="flex flex-col gap-1">
        <p className="text-3xl font-bold text-[var(--text-primary)]">{value}</p>
        {subtitle && (
          <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>
        )}
      </div>
    </button>
  );
}
