import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function useAuth() {
  const [startupDelay, setStartupDelay] = useState(true);
  
  // Add a small delay on initial page load to let backend fully start
  useEffect(() => {
    const timer = setTimeout(() => {
      setStartupDelay(false);
    }, 1000); // Reduced delay since backend is working
    
    return () => clearTimeout(timer);
  }, []);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    // Don't start the query until after startup delay
    enabled: !startupDelay, // Re-enable auth check
    retry: false, // Disable all retries for auth to prevent cascading failures
    refetchOnMount: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
    networkMode: 'always',
    // Add error handling to prevent unhandled rejections
    throwOnError: false,
  });

  // Skip loading screen since backend is working - let users access login immediately
  const actuallyLoading = false;
  
  // Consider user authenticated if we have user data and no auth errors
  const isAuthenticated = !!user && !error;

  return {
    user,
    isLoading: actuallyLoading,
    isAuthenticated,
    error, // Expose error for debugging
  };
}