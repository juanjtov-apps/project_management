import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnMount: true,
    staleTime: 0,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}