import logoFull from "@/assets/proesphere-hd-logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "icon" | "full";
}

export function Logo({ size = "md", className = "", variant = "icon" }: LogoProps) {
  const iconSizeClasses = {
    sm: "h-7",
    md: "h-8", 
    lg: "h-10"
  };
  
  const fullSizeClasses = {
    sm: "h-6",
    md: "h-8", 
    lg: "h-10"
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