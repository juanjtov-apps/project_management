import { Bell, Menu, LogOut, User as UserIcon, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const userCompany = companies?.find?.(c => c.id === user?.companyId);
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
    <header 
      className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border"
      style={{
        height: 'clamp(56px, 4vh, 64px)',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))'
      }}
    >
      <div className="container flex h-full items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-11 w-11 p-0"
            onClick={onToggleMobileMenu}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Logo size="sm" className="rounded-full shadow-sm" />
              <div className="hidden sm:block">
                <h1 className="text-fluid-lg font-semibold text-foreground">Proesphere</h1>
                <p className="text-xs text-muted-foreground hidden lg:block">{companyName}</p>
              </div>
            </div>
          </div>
        </div>
          
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative h-11 w-11 p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onToggleNotifications}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* User Avatar with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-11 p-0 data-[state=open]:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="User menu"
              >
                <div className="flex items-center gap-2 px-2">
                  <div className="h-8 w-8 rounded-full bg-brand-600 text-white text-sm font-medium flex items-center justify-center">
                    {getUserInitials(user)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-foreground">
                      {user?.firstName || user?.name || user?.email || "User"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {userCompany?.name || 'Proesphere'}
                    </div>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {user?.firstName || user?.name || user?.email || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-danger focus:text-danger">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
