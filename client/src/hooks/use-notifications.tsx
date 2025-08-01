import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

export function useNotifications(userId: string = "sample-user-id") {
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    error
  } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: () => fetch(`/api/notifications?userId=${userId}`).then(res => res.json()),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/notifications/${id}/read`, { method: "PATCH", body: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
    onError: (error) => {
      console.log("Mark as read error (expected for now):", error);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest("/api/notifications/mark-all-read", { method: "PATCH", body: { userId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
    onError: (error) => {
      console.log("Mark all as read error (expected for now):", error);
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
