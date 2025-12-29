import { cn } from "@/lib/utils";

interface BottomNavigationItem {
  value: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface BottomNavigationProps {
  items: BottomNavigationItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "data-testid"?: string;
}

export function BottomNavigation({
  items,
  value,
  onChange,
  className,
  "data-testid": testId,
}: BottomNavigationProps) {
  return (
    <nav
      data-testid={testId}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-[var(--pro-surface)] border-t border-[var(--pro-border)]",
        "pb-[env(safe-area-inset-bottom)]",
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = value === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onChange(item.value)}
              data-testid={`nav-${item.value}`}
              className={cn(
                "flex flex-col items-center justify-center",
                "min-w-[64px] h-full px-3",
                "transition-colors focus-visible-ring",
                isActive
                  ? "text-[var(--pro-mint)]"
                  : "text-[var(--pro-text-secondary)] active:text-[var(--pro-text-primary)]"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
            >
              <div className="relative">
                <span className={cn(
                  "block",
                  isActive && "[&>svg]:stroke-[2.5px]"
                )}>
                  {item.icon}
                </span>
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-0.5",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
