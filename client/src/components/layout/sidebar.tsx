import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/ui/logo";
import logoImage from "../../assets/proesphere-hd-logo.png";
import {
  LayoutDashboard,
  Briefcase,
  Building,
  CheckSquare,
  Calendar,
  Camera,
  ClipboardList,
  Shield,
  TrendingUp,
  CircleUserRound,
  Users,
  HardHat,
  BarChart3
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Work", href: "/work", icon: Briefcase },
  { name: "Project Health", href: "/project-health", icon: TrendingUp },
  { name: "Schedule", href: "/schedule", icon: Calendar },
  { name: "Photos", href: "/photos", icon: Camera },
  { name: "Project Logs", href: "/logs", icon: ClipboardList },
  { name: "Client Portal", href: "/client-portal", icon: CircleUserRound },
  { name: "Subs", href: "/subs", icon: HardHat },
  { name: "RBAC Admin", href: "/rbac", icon: Shield },
  { name: "Waitlist", href: "/waitlist-admin", icon: Users, rootOnly: true },
  { name: "Analytics", href: "/platform-analytics", icon: BarChart3, rootOnly: true },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps = {}) {
  const [location] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/v1/auth/user'],
    retry: false
  });
  
  const permissions = currentUser?.permissions || {};
  const isRootAdmin = currentUser?.isRoot === true || currentUser?.is_root === true;

  const navigationPermissions: Record<string, string> = {
    'Dashboard': 'dashboard',
    'Work': 'projects',
    'Project Health': 'projectHealth',
    'Schedule': 'schedule',
    'Photos': 'photos',
    'Project Logs': 'logs',
    'Client Portal': 'clientPortal',
    'Subs': 'subs',
    'RBAC Admin': 'rbacAdmin'
  };

  const filteredNavigation = navigation.filter(item => {
    // Root-only items require root admin access
    if ((item as any).rootOnly) {
      return isRootAdmin;
    }
    // Regular items check permissions
    const permissionKey = navigationPermissions[item.name];
    return permissions[permissionKey] === true;
  });

  const NavigationRail = () => (
    <div 
      className="flex flex-col h-full"
      style={{
        backgroundColor: '#0F1115',
        width: isExpanded ? '220px' : '52px',
        transition: 'width 0.28s cubic-bezier(0.25,1,0.5,1)',
      }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div 
        className="flex items-center justify-center py-3 px-2 border-b" 
        style={{ borderColor: '#2D333B', minHeight: '70px' }}
      >
        {isExpanded ? (
          <Logo variant="full" size="sm" className="shadow-lg" />
        ) : (
          <div className="flex items-center justify-center w-full h-12">
            <img 
              src={logoImage} 
              alt="Proesphere" 
              className="h-12 w-auto object-contain"
            />
          </div>
        )}
      </div>
      
      <nav className="flex-1 py-4 overflow-hidden">
        <ul className="flex flex-col gap-1 px-2">
          {filteredNavigation.map((item) => {
            const isActive = location === item.href || 
              (item.href === "/work" && (location === "/projects" || location === "/tasks"));
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href={item.href}>
                        <div 
                          className={cn(
                            "relative flex items-center gap-3 h-11 rounded-lg transition-all duration-200 cursor-pointer group",
                            isExpanded ? "px-3" : "justify-center",
                            isActive 
                              ? "text-[#4ADE80]" 
                              : "text-[#9CA3AF] hover:text-white hover:bg-[#1F242C]"
                          )}
                          onClick={() => onMobileClose?.()}
                          data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {isActive && (
                            <div 
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                              style={{ backgroundColor: '#4ADE80' }}
                            />
                          )}
                          <Icon 
                            className={cn(
                              "h-5 w-5 shrink-0 transition-colors",
                              isActive ? "text-[#4ADE80]" : ""
                            )} 
                          />
                          {isExpanded && (
                            <span className={cn(
                              "text-sm font-medium whitespace-nowrap transition-opacity duration-200",
                              isActive ? "text-[#4ADE80]" : ""
                            )}>
                              {item.name}
                            </span>
                          )}
                        </div>
                      </Link>
                    </TooltipTrigger>
                    {!isExpanded && (
                      <TooltipContent 
                        side="right" 
                        className="text-white border-0"
                        style={{ backgroundColor: '#1F242C' }}
                      >
                        {item.name}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );

  const MobileNavigationContent = () => (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0F1115' }}>
      <div className="p-4 border-b" style={{ borderColor: '#2D333B' }}>
        <Logo variant="full" size="lg" className="shadow-lg" />
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location === item.href || 
              (item.href === "/work" && (location === "/projects" || location === "/tasks"));
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <div 
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group min-h-[48px]",
                      isActive 
                        ? "text-[#4ADE80] border-l-4"
                        : "text-[#9CA3AF] hover:text-white"
                    )}
                    style={{ 
                      backgroundColor: isActive ? '#1F242C' : 'transparent',
                      borderLeftColor: isActive ? '#4ADE80' : 'transparent'
                    }}
                    onClick={() => onMobileClose?.()}
                  >
                    <Icon 
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isActive ? "text-[#4ADE80]" : "text-[#9CA3AF] group-hover:text-white"
                      )} 
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      <aside 
        className="hidden lg:flex flex-col border-r"
        style={{
          backgroundColor: '#0F1115',
          borderColor: '#2D333B',
          width: isExpanded ? '220px' : '52px',
          boxShadow: isExpanded ? '4px 0 30px rgba(0,0,0,0.35)' : 'none',
          transition: 'width 0.28s cubic-bezier(0.25,1,0.5,1), box-shadow 0.28s cubic-bezier(0.25,1,0.5,1)',
        }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <NavigationRail />
      </aside>

      <Sheet open={isMobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent 
          side="left" 
          className="w-80 p-0 border-0"
          style={{ backgroundColor: '#0F1115' }}
          aria-describedby={undefined}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <MobileNavigationContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
