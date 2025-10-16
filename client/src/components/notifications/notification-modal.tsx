import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, MessageSquare, Bell } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PMNotification {
  id: string;
  project_id: string;
  recipient_user_id: string;
  type: string;
  source_kind: string;
  source_id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  route_path: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "issue_created":
      return <AlertTriangle className="text-amber-600" size={16} />;
    case "message_posted":
      return <MessageSquare className="text-blue-600" size={16} />;
    default:
      return <Bell className="text-gray-500" size={16} />;
  }
};

export default function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch PM notifications
  const { data: notificationsData, isLoading } = useQuery<{ items: PMNotification[], next_cursor: string | null }>({
    queryKey: ["/api/pm-notifications"],
    enabled: isOpen,
  });

  const notifications = notificationsData?.items || [];

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("/api/pm-notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pm-notifications/unread-count"] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/pm-notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pm-notifications/unread-count"] });
    },
  });

  const handleNotificationClick = async (notification: PMNotification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsReadMutation.mutateAsync(notification.id);
    }
    
    // Close modal
    onClose();
    
    // Check if we're already on the client portal
    const currentPath = window.location.pathname;
    const targetPath = notification.route_path.split('?')[0];
    
    if (currentPath === targetPath) {
      // We're already on the client portal, manually update URL and trigger state update
      window.history.pushState({}, '', notification.route_path);
      // Dispatch a custom event to notify the client portal page
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      // Navigate to different page
      setLocation(notification.route_path);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose} data-testid="notification-modal-overlay">
      <div className="max-w-md mx-auto mt-20 bg-white rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="notification-modal-content">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold construction-secondary" data-testid="notification-modal-title">Notifications</h3>
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="notification-modal-close">
            <X size={20} />
          </Button>
        </div>
        
        <div className="p-6 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading notifications...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No notifications</div>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors ${
                    !notification.is_read ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="w-8 h-8 bg-opacity-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm construction-secondary font-medium">{notification.title}</p>
                    {notification.body && <p className="text-sm text-gray-600">{notification.body}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="p-6 border-t border-gray-200">
            <Button 
              className="w-full construction-primary text-white hover:opacity-90"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="notification-mark-all-read"
            >
              {markAllReadMutation.isPending ? "Marking as read..." : "Mark All as Read"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
