import { Bell, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Notification, User } from "@shared/schema";

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onToggleNotifications: () => void;
}

export default function Header({ onToggleMobileMenu, onToggleNotifications }: HeaderProps) {
  const { user } = useAuth() as { user: User | undefined };
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", "sample-user-id"],
  });

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;
  
  const getUserInitials = (user: User | undefined) => {
    if (!user) return "U";
    const name = user.firstName || user.name || user.email || "User";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <header className="bg-white border-b border-[var(--proesphere-mist)] px-6 py-4">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2"
              onClick={onToggleMobileMenu}
            >
              <Menu className="text-[var(--proesphere-graphite)]" size={20} />
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-[var(--proesphere-deep-blue)]">Dashboard</h2>
              <p className="text-base text-[var(--proesphere-graphite)] opacity-60">Manage your construction projects with precision and efficiency.</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 relative hover:bg-[var(--proesphere-teal)]/5"
                onClick={onToggleNotifications}
              >
                <Bell className="text-[var(--proesphere-graphite)]" size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--proesphere-coral)] text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </div>
            
            {/* User Profile */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[var(--proesphere-deep-blue)] to-[var(--proesphere-teal)] rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">{getUserInitials(user)}</span>
                </div>
                <span className="hidden md:block font-medium text-[var(--proesphere-deep-blue)]">{user?.firstName || user?.name || 'Root'}</span>
              </div>
              <button className="flex items-center space-x-1 text-[var(--proesphere-graphite)] opacity-60 hover:text-[var(--proesphere-coral)] hover:underline text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--proesphere-teal)]/40 focus:ring-offset-2 rounded px-1">
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
