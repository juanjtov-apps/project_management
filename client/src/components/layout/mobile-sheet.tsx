import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Building, 
  CheckSquare, 
  Calendar, 
  Camera, 
  ClipboardList, 
  Users,
  Wrench,
  Shield,
  TrendingUp
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: Building },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Project Health", href: "/project-health", icon: TrendingUp },
  { name: "Schedule", href: "/schedule", icon: Calendar },
  { name: "Photos", href: "/photos", icon: Camera },
  { name: "Project Logs", href: "/logs", icon: ClipboardList },
  { name: "Crew", href: "/crew", icon: Users },
  { name: "Subs", href: "/subs", icon: Wrench },
  { name: "RBAC Admin", href: "/rbac", icon: Shield },
];

interface MobileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MobileSheet({ open, onOpenChange }: MobileSheetProps) {
  const [location] = useLocation();

  // Get current user with permissions
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    retry: false
  });

  // Get companies to display company name
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['/api/companies'],
    retry: false
  });

  const userCompany = companies.find(c => c.id === currentUser?.companyId);
  const companyName = userCompany?.name || 'Proesphere';

  // Role-based navigation filtering using backend permissions
  const permissions = currentUser?.permissions || {};
  
  // Map navigation items to their permission keys
  const navigationPermissions = {
    'Dashboard': 'dashboard',
    'Projects': 'projects', 
    'Tasks': 'tasks',
    'Project Health': 'projectHealth',
    'Schedule': 'schedule',
    'Photos': 'photos',
    'Project Logs': 'logs',
    'Crew': 'crew',
    'Subs': 'subs',
    'RBAC Admin': 'rbacAdmin'
  };
  
  // Filter navigation based on user permissions from backend
  const filteredNavigation = navigation.filter(item => {
    const permissionKey = navigationPermissions[item.name as keyof typeof navigationPermissions];
    return permissions[permissionKey] === true;
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div className="text-left">
              <SheetTitle className="text-fluid-lg font-semibold text-foreground">
                Proesphere
              </SheetTitle>
              <p className="text-sm text-muted-foreground">{companyName}</p>
            </div>
          </div>
        </SheetHeader>
        
        <nav className="flex-1 p-6">
          <ul className="space-y-2">
            {filteredNavigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <div 
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                        isActive 
                          ? "bg-brand-100 text-brand-600 border-l-4 border-brand-600" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      onClick={() => onOpenChange(false)}
                    >
                      <Icon 
                        className={cn(
                          "h-5 w-5 shrink-0",
                          isActive ? "text-brand-600" : "text-muted-foreground"
                        )} 
                      />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}