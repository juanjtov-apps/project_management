import { LucideIcon } from "lucide-react";

interface MiniMetricProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  tone?: "teal" | "blue" | "coral" | "slate";
  ariaLabel?: string;
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

export function MiniMetric({
  icon: Icon,
  value,
  label,
  tone = "slate",
  ariaLabel,
  "data-testid": testId,
}: MiniMetricProps) {
  const styles = toneStyles[tone];
  
  return (
    <div
      className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm min-h-[80px] flex flex-col"
      aria-label={ariaLabel || `${label}: ${value}`}
      data-testid={testId || `mini-metric-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <div className={`w-10 h-10 rounded-full ${styles.iconBg} ${styles.iconColor} flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} strokeWidth={2} aria-hidden="true" />
        </div>
      </div>
      <p className={`text-2xl font-bold tabular-nums leading-tight ${styles.valueColor}`}>{value}</p>
    </div>
  );
}
