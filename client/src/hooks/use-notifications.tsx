import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Notification } from "@shared/schema";

export function useNotifications(userId?: string) {
  const { user } = useAuth();
  const resolvedUserId = userId || (user as any)?.id || "unknown";
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    error
  } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", resolvedUserId],
    queryFn: () => fetch(`/api/notifications?userId=${resolvedUserId}`).then(res => res.json()),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/notifications/${id}/read`, { method: "PATCH", body: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", resolvedUserId] });
    },
    onError: () => {
      // Mark as read may fail if endpoint is not yet implemented
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest("/api/notifications/mark-all-read", { method: "PATCH", body: { userId: resolvedUserId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", resolvedUserId] });
    },
    onError: () => {
      // Mark all as read may fail if endpoint is not yet implemented
    },
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const recentNotifications = notifications.slice(0, 10);

  return {
    notifications,
    recentNotifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notification: {
      userId: string;
      title: string;
      message: string;
      type?: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
    }) => apiRequest("/api/notifications", { method: "POST", body: notification }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });
}
