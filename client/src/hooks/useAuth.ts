import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function useAuth() {
  const [startupDelay, setStartupDelay] = useState(true);
  
  // Add a small delay on initial page load to let backend fully start
  useEffect(() => {
    const timer = setTimeout(() => {
      setStartupDelay(false);
    }, 2000); // 2 second delay for backend startup
    
    return () => clearTimeout(timer);
  }, []);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    // Don't start the query until after startup delay
    enabled: !startupDelay,
    retry: (failureCount, error: any) => {
      // Don't retry 401 errors (not authenticated)  
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        return false;
      }
      // Don't retry startup connection failures
      if (error?.message?.includes('STARTUP_CONNECTION_FAILED') || error?.message?.includes('Backend connection failed')) {
        return false;
      }
      // No retries for auth checks to prevent loops
      return false;
    },
    refetchOnMount: true,
    staleTime: 0,
    refetchOnWindowFocus: false,
    networkMode: 'always',
    // Add error handling to prevent unhandled rejections
    throwOnError: false,
    // Add retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(2000 * Math.pow(2, attemptIndex), 10000),
  });

  // Show loading during startup delay or actual loading
  const actuallyLoading = startupDelay || isLoading;
  
  // Consider user authenticated if we have user data and no authentication-related errors
  const isAuthenticated = !!user && !error;

  return {
    user,
    isLoading: actuallyLoading,
    isAuthenticated,
    error, // Expose error for debugging
  };
}