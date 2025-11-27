import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/ui/logo";
import { 
  LayoutDashboard, 
  Briefcase,
  Building, 
  CheckSquare, 
  Calendar, 
  Camera, 
  ClipboardList, 
  Wrench,
  Shield,
  TrendingUp,
  MessageSquare
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
  { name: "Client Portal", href: "/client-portal", icon: MessageSquare },
  { name: "Subs", href: "/subs", icon: Wrench },
  { name: "RBAC Admin", href: "/rbac", icon: Shield },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps = {}) {
  const [location] = useLocation();
  
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/v1/auth/user'],
    retry: false
  });
  
  const permissions = currentUser?.permissions || {};
  
  const navigationPermissions = {
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
    const permissionKey = navigationPermissions[item.name as keyof typeof navigationPermissions];
    return permissions[permissionKey] === true;
  });

  const NavigationRail = () => (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full" style={{ backgroundColor: '#0F1115' }}>
        <div className="flex items-center justify-center py-4 border-b" style={{ borderColor: '#2D333B' }}>
          <Logo size="sm" className="shadow-lg" />
        </div>
        
        <nav className="flex-1 py-4">
          <ul className="flex flex-col items-center gap-1">
            {filteredNavigation.map((item) => {
              const isActive = location === item.href || 
                (item.href === "/work" && (location === "/projects" || location === "/tasks"));
              const Icon = item.icon;
              
              return (
                <li key={item.name}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href={item.href}>
                        <div 
                          className={cn(
                            "relative w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer group",
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
                              "h-5 w-5 transition-colors",
                              isActive ? "text-[#4ADE80]" : ""
                            )} 
                          />
                        </div>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      className="text-white border-0"
                      style={{ backgroundColor: '#1F242C' }}
                    >
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </TooltipProvider>
  );

  const MobileNavigationContent = () => (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0F1115' }}>
      <div className="p-6 border-b" style={{ borderColor: '#2D333B' }}>
        <div className="flex items-center gap-3">
          <Logo size="md" className="shadow-lg" />
          <div>
            <h1 className="text-lg font-semibold text-white">Proesphere</h1>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Construction Management</p>
          </div>
        </div>
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
        className="w-[60px] hidden lg:flex flex-col border-r"
        style={{ 
          backgroundColor: '#0F1115',
          borderColor: '#2D333B'
        }}
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
