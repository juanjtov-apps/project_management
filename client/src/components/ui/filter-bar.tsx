import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FilterChip {
  id: string;
  label: string;
  count?: number;
  onClick: () => void;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterChip[];
  onClearAll?: () => void;
  rightActions?: React.ReactNode;
  className?: string;
  sticky?: boolean;
  "data-testid"?: string;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  onClearAll,
  rightActions,
  className,
  sticky = true,
  "data-testid": testId,
}: FilterBarProps) {
  const hasActiveFilters = filters.length > 0;

  return (
    <div
      data-testid={testId}
      className={cn(
        "flex flex-col gap-3 p-4 bg-white border-b border-border",
        sticky && "sticky-top",
        className
      )}
    >
      {/* Search and Actions Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <Input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            data-testid="filter-search-input"
            className="pl-9 tap-target"
            aria-label="Search"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange("")}
              data-testid="clear-search-button"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--surface-muted)]"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          )}
        </div>

        {/* Clear All Button */}
        {hasActiveFilters && onClearAll && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            data-testid="clear-all-filters-button"
            className="tap-target"
          >
            Clear all
          </Button>
        )}

        {/* Right Actions */}
        {rightActions && (
          <div className="flex items-center gap-2">{rightActions}</div>
        )}
      </div>

      {/* Filter Chips Row */}
      {filters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((filter) => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="tap-target cursor-pointer hover:bg-primary/10"
              onClick={filter.onClick}
              data-testid={`filter-chip-${filter.id}`}
            >
              <span>{filter.label}</span>
              {typeof filter.count === "number" && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold bg-primary/20 rounded">
                  {filter.count}
                </span>
              )}
              <X className="ml-1.5 w-3 h-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
