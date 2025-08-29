import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/ui/logo";
import { 
  LayoutDashboard, 
  Building, 
  CheckSquare, 
  Calendar, 
  Camera, 
  ClipboardList, 
  Users,
  HardHat,
  Wrench,
  Shield,
  TrendingUp
} from "lucide-react";

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

export default function Sidebar() {
  const [location] = useLocation();
  
  // Get current user with permissions
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    retry: false
  });
  
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
  
  console.log('Sidebar navigation items:', filteredNavigation.length, filteredNavigation.map(item => item.name));

  return (
    <aside className="w-64 bg-surface/50 border-r border-border hidden lg:block backdrop-blur-sm">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <Logo size="md" className="shadow-lg" />
          <div>
            <h1 className="text-fluid-lg font-semibold text-foreground">Proesphere</h1>
            <p className="text-xs text-muted-foreground">Construction Management</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-6">
        <ul className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                    "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive 
                      ? "bg-brand-100 text-brand-600 border-l-4 border-brand-600 font-semibold" 
                      : "text-muted-foreground hover:text-foreground"
                  )}>
                    <Icon 
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isActive ? "text-brand-600" : "text-muted-foreground group-hover:text-foreground"
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
    </aside>
  );
}
