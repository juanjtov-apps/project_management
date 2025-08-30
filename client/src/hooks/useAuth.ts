import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: (failureCount, error: any) => {
      // Don't retry 401 errors (not authenticated) or any HTTP status errors
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        return false;
      }
      // Only retry actual network failures, and limit to 2 attempts
      return failureCount < 1;
    },
    refetchOnMount: true,
    staleTime: 0,
    refetchOnWindowFocus: false,
    networkMode: 'always',
    // Add error handling to prevent unhandled rejections
    throwOnError: false,
    // Add retry delay to prevent overwhelming the backend
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Consider user authenticated if we have user data and no 401-type errors
  const isAuthenticated = !!user && !error;

  return {
    user,
    isLoading,
    isAuthenticated,
    error, // Expose error for debugging
  };
}