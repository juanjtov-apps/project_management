import logoImage from "@/assets/proesphere-logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className = "" }: LogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10", 
    lg: "h-12 w-12"
  };

  return (
    <img 
      src={logoImage} 
      alt="Proesphere Logo" 
      className={`${sizeClasses[size]} ${className}`}
    />
  );
}