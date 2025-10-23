import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarData {
  id: string;
  name: string;
  image?: string;
}

interface AvatarGroupProps {
  avatars: AvatarData[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  "data-testid"?: string;
}

export function AvatarGroup({
  avatars,
  max = 3,
  size = "md",
  className,
  "data-testid": testId,
}: AvatarGroupProps) {
  const displayedAvatars = avatars.slice(0, max);
  const remainingCount = Math.max(0, avatars.length - max);

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      data-testid={testId}
      className={cn("flex -space-x-2", className)}
      role="group"
      aria-label={`${avatars.length} ${avatars.length === 1 ? 'person' : 'people'}`}
    >
      {displayedAvatars.map((avatar, index) => (
        <Avatar
          key={avatar.id}
          className={cn(
            sizeClasses[size],
            "border-2 border-white ring-1 ring-gray-200"
          )}
          style={{ zIndex: displayedAvatars.length - index }}
          title={avatar.name}
        >
          <AvatarImage src={avatar.image} alt={avatar.name} />
          <AvatarFallback className="bg-[var(--color-primary-600)] text-white">
            {getInitials(avatar.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            sizeClasses[size],
            "flex items-center justify-center rounded-full",
            "bg-[var(--surface-muted)] border-2 border-white",
            "text-[var(--text-secondary)] font-medium"
          )}
          style={{ zIndex: 0 }}
          title={`+${remainingCount} more`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
