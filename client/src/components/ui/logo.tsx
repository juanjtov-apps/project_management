import logoIcon from "@/assets/proesphere-logo.png";
import logoFull from "@/assets/proesphere-hd-logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "icon" | "full";
}

export function Logo({ size = "md", className = "", variant = "icon" }: LogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10", 
    lg: "h-12 w-12"
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
    <img 
      src={logoIcon} 
      alt="Proesphere Logo" 
      className={`${sizeClasses[size]} ${className}`}
    />
  );
}