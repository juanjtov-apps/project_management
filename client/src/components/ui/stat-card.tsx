import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  sublabel?: string;
  tone?: "teal" | "blue" | "coral" | "slate";
  ariaLabel?: string;
  onClick?: () => void;
  "data-testid"?: string;
}

const toneStyles = {
  teal: {
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    valueColor: "text-teal-700",
  },
  blue: {
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    valueColor: "text-blue-700",
  },
  coral: {
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    valueColor: "text-orange-700",
  },
  slate: {
    iconBg: "bg-slate-50",
    iconColor: "text-slate-600",
    valueColor: "text-slate-700",
  },
};

export function StatCard({
  icon: Icon,
  value,
  label,
  sublabel,
  tone = "slate",
  ariaLabel,
  onClick,
  "data-testid": testId,
}: StatCardProps) {
  const styles = toneStyles[tone];
  const Component = onClick ? "button" : "div";
  
  return (
    <Component
      className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm min-h-[88px] flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-slate-200"
      onClick={onClick}
      aria-label={ariaLabel || `${label}: ${value}${sublabel ? `, ${sublabel}` : ""}`}
      tabIndex={onClick ? 0 : undefined}
      data-testid={testId || `stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className={`h-12 w-12 rounded-xl ${styles.iconBg} ${styles.iconColor} flex items-center justify-center flex-shrink-0`}>
        <Icon size={28} strokeWidth={2} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 font-medium leading-tight">{label}</p>
        <p className={`text-2xl font-semibold leading-tight tabular-nums ${styles.valueColor}`}>{value}</p>
        {sublabel && (
          <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>
        )}
      </div>
    </Component>
  );
}
