import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: (failureCount, error: any) => {
      // Don't retry 401 errors (not authenticated)
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
    refetchOnMount: true,
    staleTime: 0,
    refetchOnWindowFocus: false,
    networkMode: 'always'
  });

  // Consider user authenticated if we have user data, even during loading states
  const isAuthenticated = !!user && !error;

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}