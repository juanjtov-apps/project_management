import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onToggleNotifications: () => void;
}

export default function Header({ onToggleMobileMenu, onToggleNotifications }: HeaderProps) {
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", "sample-user-id"],
  });

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-2"
            onClick={onToggleMobileMenu}
          >
            <Menu className="text-gray-600" size={20} />
          </Button>
          <div>
            <h2 className="text-2xl font-bold construction-secondary">Dashboard</h2>
            <p className="text-gray-500">Welcome back, <span className="font-medium">Mike Johnson</span></p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 relative"
              onClick={onToggleNotifications}
            >
              <Bell className="text-gray-600" size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </div>
          
          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 construction-primary rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">MJ</span>
            </div>
            <span className="hidden md:block font-medium construction-secondary">Mike Johnson</span>
          </div>
        </div>
      </div>
    </header>
  );
}
