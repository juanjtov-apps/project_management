import { cn } from "@/lib/utils";

interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "data-testid"?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
  "data-testid": testId,
}: SegmentedControlProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "inline-flex items-center gap-1 p-1 bg-[#1F242C] border border-[#2D333B] rounded-lg",
        className
      )}
      role="tablist"
      aria-label="Segmented control"
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          data-testid={`segment-${option.value}`}
          className={cn(
            "tap-target px-4 py-2 text-sm font-medium rounded-md transition-all",
            "focus-visible-ring",
            value === option.value
              ? "bg-[#2D333B] text-white shadow-sm"
              : "text-[#9CA3AF] hover:text-white"
          )}
          role="tab"
          aria-selected={value === option.value}
          aria-label={option.label}
        >
          <span className="flex items-center gap-2">
            {option.icon}
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}
