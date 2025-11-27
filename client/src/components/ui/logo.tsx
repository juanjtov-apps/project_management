import logoFull from "@assets/final logo_1764221763825.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "icon" | "full";
}

export function Logo({ size = "md", className = "", variant = "icon" }: LogoProps) {
  const iconSizeClasses = {
    sm: "h-14",
    md: "h-16", 
    lg: "h-20"
  };
  
  const fullSizeClasses = {
    sm: "h-14",
    md: "h-16", 
    lg: "h-20"
  };

  if (variant === "full") {
    return (
      <img 
        src={logoFull} 
        alt="Proesphere" 
        className={`${fullSizeClasses[size]} w-auto ${className}`}
      />
    );
  }

  return (
    <div className={`${iconSizeClasses[size]} overflow-hidden ${className}`}>
      <img 
        src={logoFull} 
        alt="Proesphere" 
        className="h-full w-auto object-cover object-left"
        style={{ maxWidth: '200%' }}
      />
    </div>
  );
}