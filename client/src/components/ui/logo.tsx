import logoFull from "@assets/Final logo_1764221479285.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "icon" | "full";
}

export function Logo({ size = "md", className = "", variant = "icon" }: LogoProps) {
  const iconSizeClasses = {
    sm: "h-10",
    md: "h-12", 
    lg: "h-14"
  };
  
  const fullSizeClasses = {
    sm: "h-10",
    md: "h-12", 
    lg: "h-14"
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