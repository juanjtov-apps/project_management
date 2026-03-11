import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  BarChart3,
  AlertTriangle,
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
  { name: "Dashboard", i18nKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Work", i18nKey: "nav.work", href: "/work", icon: Briefcase },
  { name: "Project Health", i18nKey: "nav.projectHealth", href: "/project-health", icon: TrendingUp },
  { name: "Schedule", i18nKey: "nav.schedule", href: "/schedule", icon: Calendar },
  { name: "Photos", i18nKey: "nav.photos", href: "/photos", icon: Camera },
  { name: "Project Logs", i18nKey: "nav.projectLogs", href: "/logs", icon: ClipboardList },
  { name: "Client Portal", i18nKey: "nav.clientPortal", href: "/client-portal", icon: CircleUserRound },
  { name: "Subs", i18nKey: "nav.subs", href: "/subs", icon: HardHat },
  { name: "RBAC Admin", i18nKey: "nav.rbacAdmin", href: "/rbac", icon: Shield },
  { name: "Waitlist", i18nKey: "nav.waitlist", href: "/waitlist-admin", icon: Users, rootOnly: true },
  { name: "Analytics", i18nKey: "nav.analytics", href: "/platform-analytics", icon: BarChart3, rootOnly: true },
  { name: "Agent Logs", i18nKey: "nav.agentLogs", href: "/agent-troubleshooting", icon: AlertTriangle, rootOnly: true },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps = {}) {
  const [location] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation('common');
  
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/v1/auth/user'],
    retry: false
  });
  
  const permissions = currentUser?.permissions || {};
  const isRootAdmin = currentUser?.isRoot === true || currentUser?.is_root === true;

  // Agent error badge for root admins
  const lastViewed = typeof window !== 'undefined' ? localStorage.getItem('agent-logs-last-viewed') : null;
  const sinceParam = lastViewed ? `?since=${encodeURIComponent(lastViewed)}` : '';
  const { data: errorCountData } = useQuery<{ count: number }>({
    queryKey: [`/api/v1/admin/agent-troubleshooting/unread-error-count${sinceParam}`],
    enabled: isRootAdmin,
    refetchInterval: 30000,
  });
  const agentErrorCount = errorCountData?.count ?? 0;

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
        className="flex items-center justify-center px-2 border-b overflow-hidden"
        style={{ borderColor: '#2D333B', height: '56px' }}
      >
        {isExpanded ? (
          <img src={logoImage} alt="Proesphere" className="h-10 w-auto object-contain shadow-lg" />
        ) : (
          <div className="flex items-center justify-center w-full h-10">
            <img
              src={logoImage}
              alt="Proesphere"
              className="h-10 w-auto object-contain"
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
              <li key={t(item.i18nKey)}>
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
                          onClick={() => {
                            if (item.name === "Agent Logs") {
                              localStorage.setItem('agent-logs-last-viewed', new Date().toISOString());
                            }
                            onMobileClose?.();
                          }}
                          data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {isActive && (
                            <div 
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                              style={{ backgroundColor: '#4ADE80' }}
                            />
                          )}
                          <div className="relative shrink-0">
                            <Icon
                              className={cn(
                                "h-5 w-5 transition-colors",
                                isActive ? "text-[#4ADE80]" : ""
                              )}
                            />
                            {item.name === "Agent Logs" && agentErrorCount > 0 && (
                              <span
                                className="absolute -top-1.5 -right-1.5 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5"
                                style={{ backgroundColor: '#EF4444' }}
                              >
                                {agentErrorCount > 99 ? '99+' : agentErrorCount}
                              </span>
                            )}
                          </div>
                          {isExpanded && (
                            <span className={cn(
                              "text-sm font-medium whitespace-nowrap transition-opacity duration-200",
                              isActive ? "text-[#4ADE80]" : ""
                            )}>
                              {t(item.i18nKey)}
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
                        {t(item.i18nKey)}
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
              <li key={t(item.i18nKey)}>
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
                    <span className="truncate">{t(item.i18nKey)}</span>
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
            <SheetTitle>{t('nav.navigationMenu')}</SheetTitle>
          </SheetHeader>
          <MobileNavigationContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
