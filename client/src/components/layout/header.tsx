import { Bell, Menu, LogOut, User as UserIcon, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

  // Get companies to display company name instead of "Dashboard"
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['/api/companies'],
    retry: false
  });

  const userCompany = companies.find(c => c.id === user?.companyId);
  const companyName = userCompany?.name || 'Proesphere';

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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      // Force redirect anyway
      window.location.href = "/login";
    }
  };

  return (
    <header className="app-bar safe-area-padding">
      <div className="max-w-[1440px] mx-auto h-full">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden touch-target"
              onClick={onToggleMobileMenu}
            >
              <Menu className="text-foreground" size={20} />
            </Button>
            <div className="flex justify-center w-full lg:justify-start">
              <div className="text-lg md:text-xl font-semibold text-foreground">
                <span className="text-brand-500">Proesphere</span>
                <span className="hidden md:inline text-muted-foreground text-sm ml-2">• {companyName}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 md:space-x-6">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="touch-target relative"
              onClick={onToggleNotifications}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
            
            {/* User Profile - Desktop */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">{getUserInitials(user)}</span>
                </div>
                <span className="font-medium text-foreground">{user?.firstName || user?.name || 'Root'}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut size={16} className="mr-1" />
                <span className="hidden lg:inline">Sign Out</span>
              </Button>
            </div>
            
            {/* User Profile - Mobile Dropdown */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="touch-target p-0"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">{getUserInitials(user)}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="font-medium text-sm">{user?.firstName || user?.name || 'Root'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <p className="text-xs text-muted-foreground">{companyName}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <UserIcon size={16} className="mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings size={16} className="mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut size={16} className="mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
