import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ 
  children, 
  requiredPermission,
  allowedRoles 
}: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    retry: false
  });

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const permissions = currentUser?.permissions || {};
    const userRole = currentUser?.role;
    
    // Check permission if specified
    if (requiredPermission && !permissions[requiredPermission]) {
      setLocation("/dashboard");
      return;
    }
    
    // Check role if specified
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      setLocation("/dashboard");
      return;
    }
  }, [currentUser, requiredPermission, allowedRoles, setLocation]);

  // If user doesn't have permission, don't render (redirect happens in effect)
  const permissions = currentUser?.permissions || {};
  const userRole = currentUser?.role;
  
  const hasPermission = !requiredPermission || permissions[requiredPermission];
  const hasRole = !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(userRole);
  
  if (!hasPermission || !hasRole) {
    return null;
  }

  return <>{children}</>;
}
