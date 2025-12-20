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
import { useState, useEffect } from "react";
import type { Notification, User } from "@shared/schema";
import OrganizationSelector from "@/components/organization-selector";

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onToggleNotifications: () => void;
  pageTitle?: string;
}

export default function Header({ onToggleMobileMenu, onToggleNotifications, pageTitle = "Dashboard" }: HeaderProps) {
  const { user } = useAuth() as { user: User | undefined };

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const handleDialogOpen = () => setIsDialogOpen(true);
    const handleDialogClose = () => setIsDialogOpen(false);

    window.addEventListener('dialog:open', handleDialogOpen);
    window.addEventListener('dialog:close', handleDialogClose);

    const checkDialogs = () => {
      const hasOpenDialog = document.querySelector('[role="dialog"][data-state="open"]') !== null;
      setIsDialogOpen(hasOpenDialog);
    };

    const observer = new MutationObserver(checkDialogs);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] });

    checkDialogs();

    return () => {
      window.removeEventListener('dialog:open', handleDialogOpen);
      window.removeEventListener('dialog:close', handleDialogClose);
      observer.disconnect();
    };
  }, []);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/pm-notifications/unread-count"],
    refetchInterval: isDialogOpen ? false : 15000,
    refetchOnWindowFocus: !isDialogOpen,
  });

  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/v1/auth/user'],
    retry: false,
  });

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
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/login";
    }
  };

  return (
    <header
      className="relative z-40 border-b"
      style={{
        height: '56px',
        backgroundColor: '#0F1115',
        borderColor: '#2D333B',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))'
      }}
    >
      <div className="flex h-full items-center justify-between gap-3 max-w-screen-2xl mx-auto px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden min-w-[48px] min-h-[48px] p-0 flex-shrink-0 text-[#9CA3AF] hover:text-white hover:bg-[#1F242C]"
            onClick={onToggleMobileMenu}
            aria-label="Open navigation menu"
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            {currentUser?.organization?.name ? (
              <span className="text-lg hidden md:block font-semibold" style={{ color: '#4ADE80' }}>
                {currentUser.organization.name}
              </span>
            ) : (
              <h1 className="text-lg font-semibold text-white truncate">{pageTitle}</h1>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {currentUser && (currentUser.isRootAdmin || currentUser.isRoot) && (
            <div className="hidden md:block">
              <OrganizationSelector currentUser={currentUser} />
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="min-w-[48px] min-h-[48px] p-0 text-[#9CA3AF] hover:text-white hover:bg-[#1F242C] focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': '#4ADE80' } as any}
            aria-label="Search"
            data-testid="button-search"
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative min-w-[48px] min-h-[48px] p-0 text-[#9CA3AF] hover:text-white hover:bg-[#1F242C] focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': '#4ADE80' } as any}
            onClick={onToggleNotifications}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            data-testid="button-notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1"
                style={{ backgroundColor: '#EF4444' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="min-h-[48px] p-0 px-2 text-[#9CA3AF] hover:text-white hover:bg-[#1F242C] data-[state=open]:bg-[#1F242C] focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#4ADE80' } as any}
                aria-label="User menu"
                data-testid="button-user-menu"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-full text-sm font-medium flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#4ADE80', color: '#0F1115' }}
                  >
                    {getUserInitials(user)}
                  </div>
                  <div className="hidden md:block text-left min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {user?.firstName || user?.name || "User"}
                    </div>
                    <div className="text-xs capitalize truncate" style={{ color: '#9CA3AF' }}>
                      {user?.role?.replace(/_/g, ' ') || 'User'}
                    </div>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 border"
              style={{
                backgroundColor: '#161B22',
                borderColor: '#2D333B',
                color: '#FFFFFF'
              }}
            >
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-white">
                    {user?.firstName || user?.name || user?.email || "User"}
                  </p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator style={{ backgroundColor: '#2D333B' }} />
              <DropdownMenuItem
                disabled
                className="text-[#9CA3AF] focus:bg-[#1F242C] focus:text-white"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled
                className="text-[#9CA3AF] focus:bg-[#1F242C] focus:text-white"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator style={{ backgroundColor: '#2D333B' }} />
              <DropdownMenuItem
                onClick={handleLogout}
                className="focus:bg-[#1F242C]"
                style={{ color: '#EF4444' }}
              >
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
