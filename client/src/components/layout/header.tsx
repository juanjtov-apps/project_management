import { Bell, Menu, LogOut, User as UserIcon, Settings, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  pageTitle?: string;
}

export default function Header({ onToggleMobileMenu, onToggleNotifications, pageTitle = "Dashboard" }: HeaderProps) {
  const { user } = useAuth() as { user: User | undefined };
  
  // Use new PM notifications endpoint for unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/pm-notifications/unread-count"],
    refetchInterval: 15000, // Poll every 15 seconds
  });

  // Get companies to display company name - only for platform admins
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['/api/companies'],
    retry: false,
    enabled: false, // Disable since this requires platform admin access
  });

  // Use company name from user data or default to Proesphere
  const companyName = 'Proesphere';

  const unreadCount = unreadData?.count || 0;
  
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
      className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-2"
      style={{
        height: '56px',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))'
      }}
    >
      <div className="flex h-full items-center justify-between gap-3 max-w-screen-2xl mx-auto">
        {/* Left: Mobile menu + Breadcrumb/Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden min-w-[48px] min-h-[48px] p-0 flex-shrink-0"
            onClick={onToggleMobileMenu}
            aria-label="Open navigation menu"
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-slate-500 hidden md:block">Dashboard</span>
            <ChevronRight className="h-4 w-4 text-slate-400 hidden md:block" />
            <h1 className="text-lg font-semibold text-slate-900 truncate">{pageTitle}</h1>
          </div>
        </div>
          
        {/* Right: Search + Notifications + User */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Search Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="min-w-[48px] min-h-[48px] p-0 focus:outline-none focus:ring-4 focus:ring-slate-200"
            aria-label="Search"
            data-testid="button-search"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative min-w-[48px] min-h-[48px] p-0 focus:outline-none focus:ring-4 focus:ring-slate-200"
            onClick={onToggleNotifications}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            data-testid="button-notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-danger text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* User Avatar with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="min-h-[48px] p-0 px-2 data-[state=open]:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200"
                aria-label="User menu"
                data-testid="button-user-menu"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-medium flex items-center justify-center flex-shrink-0">
                    {getUserInitials(user)}
                  </div>
                  <div className="hidden md:block text-left min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {user?.firstName || user?.name || "User"}
                    </div>
                    <div className="text-xs text-slate-500 capitalize truncate">
                      {user?.role?.replace(/_/g, ' ') || 'User'}
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
