import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function useAuth() {
  const [startupDelay, setStartupDelay] = useState(true);
  
  // Add a small delay on initial page load to let backend fully start
  useEffect(() => {
    const timer = setTimeout(() => {
      setStartupDelay(false);
    }, 500); // Reduced delay for production
    
    return () => clearTimeout(timer);
  }, []);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    // Don't start the query until after startup delay
    enabled: !startupDelay,
    retry: false, // Disable all retries for auth to prevent cascading failures
    refetchOnMount: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
    networkMode: 'always',
    // Add error handling to prevent unhandled rejections
    throwOnError: false,
  });

  // Show loading during startup delay OR while auth query is in progress
  const actuallyLoading = startupDelay || isLoading;
  
  // Consider user authenticated if we have user data and no auth errors
  const isAuthenticated = !!user && !error;

  return {
    user,
    isLoading: actuallyLoading,
    isAuthenticated,
    error, // Expose error for debugging
  };
}