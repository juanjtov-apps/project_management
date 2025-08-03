import { cn } from "@/lib/utils";

interface HealthScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export default function HealthScoreRing({ 
  score, 
  size = "md", 
  showText = true,
  className 
}: HealthScoreRingProps) {
  // Size configurations
  const sizeConfig = {
    sm: { 
      radius: 20, 
      strokeWidth: 3, 
      textSize: "text-xs",
      containerSize: "w-12 h-12"
    },
    md: { 
      radius: 30, 
      strokeWidth: 4, 
      textSize: "text-sm",
      containerSize: "w-16 h-16"
    },
    lg: { 
      radius: 40, 
      strokeWidth: 5, 
      textSize: "text-base",
      containerSize: "w-20 h-20"
    }
  };

  const config = sizeConfig[size];
  const normalizedRadius = config.radius;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Color based on score
  const getColor = (score: number) => {
    if (score >= 80) return "stroke-green-500";
    if (score >= 60) return "stroke-yellow-500";
    if (score >= 40) return "stroke-orange-500";
    return "stroke-red-500";
  };

  const getTextColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", config.containerSize, className)}>
      <svg
        className={config.containerSize}
        viewBox={`0 0 ${(normalizedRadius + config.strokeWidth) * 2} ${(normalizedRadius + config.strokeWidth) * 2}`}
      >
        {/* Background circle */}
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={config.strokeWidth}
          r={normalizedRadius}
          cx={normalizedRadius + config.strokeWidth}
          cy={normalizedRadius + config.strokeWidth}
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={config.strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={normalizedRadius + config.strokeWidth}
          cy={normalizedRadius + config.strokeWidth}
          className={cn(getColor(score), "transition-all duration-500 ease-in-out")}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
          }}
        />
      </svg>
      {showText && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold",
          config.textSize,
          getTextColor(score)
        )}>
          {score}%
        </div>
      )}
    </div>
  );
}