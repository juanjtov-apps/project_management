import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  sublabel?: string;
  tone?: "teal" | "blue" | "coral" | "slate" | "mint" | "orange" | "red";
  ariaLabel?: string;
  onClick?: () => void;
  "data-testid"?: string;
}

const toneStyles = {
  teal: {
    iconBg: "#1F242C",
    iconColor: "#4ADE80",
    valueColor: "#FFFFFF",
    sublabelColor: "#4ADE80",
  },
  mint: {
    iconBg: "#1F242C",
    iconColor: "#4ADE80",
    valueColor: "#FFFFFF",
    sublabelColor: "#4ADE80",
  },
  blue: {
    iconBg: "#1F242C",
    iconColor: "#60A5FA",
    valueColor: "#FFFFFF",
    sublabelColor: "#60A5FA",
  },
  coral: {
    iconBg: "#1F242C",
    iconColor: "#F97316",
    valueColor: "#FFFFFF",
    sublabelColor: "#F97316",
  },
  orange: {
    iconBg: "#1F242C",
    iconColor: "#F97316",
    valueColor: "#FFFFFF",
    sublabelColor: "#F97316",
  },
  red: {
    iconBg: "#1F242C",
    iconColor: "#EF4444",
    valueColor: "#FFFFFF",
    sublabelColor: "#EF4444",
  },
  slate: {
    iconBg: "#1F242C",
    iconColor: "#9CA3AF",
    valueColor: "#FFFFFF",
    sublabelColor: "#9CA3AF",
  },
};

export function StatCard({
  icon: Icon,
  value,
  label,
  sublabel,
  tone = "mint",
  ariaLabel,
  onClick,
  "data-testid": testId,
}: StatCardProps) {
  const styles = toneStyles[tone];
  const Component = onClick ? "button" : "div";
  
  return (
    <Component
      className="rounded-xl p-5 min-h-[100px] flex items-center gap-4 transition-all duration-300 cursor-pointer hover:translate-y-[-2px]"
      style={{ 
        backgroundColor: '#161B22',
        border: '1px solid #2D333B',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
      }}
      onClick={onClick}
      aria-label={ariaLabel || `${label}: ${value}${sublabel ? `, ${sublabel}` : ""}`}
      tabIndex={onClick ? 0 : undefined}
      data-testid={testId || `stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div 
        className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: styles.iconBg }}
      >
        <Icon size={24} strokeWidth={2} style={{ color: styles.iconColor }} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight" style={{ color: '#9CA3AF' }}>{label}</p>
        <p className="text-2xl font-bold leading-tight tabular-nums" style={{ color: styles.valueColor }}>{value}</p>
        {sublabel && (
          <p className="text-xs mt-0.5 font-medium" style={{ color: styles.sublabelColor }}>{sublabel}</p>
        )}
      </div>
    </Component>
  );
}
