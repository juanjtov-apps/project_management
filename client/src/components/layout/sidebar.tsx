import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
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
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
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
  
  // Get current user to check admin access
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    retry: false
  });
  
  // Only show RBAC Admin to root admins
  const isRootAdmin = currentUser?.email?.includes('admin') || currentUser?.email?.includes('chacjjlegacy') || currentUser?.role === 'admin';
  
  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => {
    if (item.name === 'RBAC Admin') {
      return isRootAdmin;
    }
    return true;
  });
  
  // Debug logging to check navigation items
  console.log('Sidebar navigation items:', filteredNavigation.length, filteredNavigation.map(item => item.name));

  return (
    <aside className="w-64 bg-brand-blue/5 shadow-lg border-r border-brand-grey hidden lg:block">
      <div className="p-6 border-b border-brand-grey">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-teal shadow-lg flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-white opacity-30 absolute top-2 left-3"></div>
              <div className="text-white font-bold text-xs">P</div>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-blue">Proesphere</h1>
            <p className="text-sm text-brand-text opacity-70">Construction Management</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name} className="relative">

                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center p-3 rounded-lg font-medium transition-all duration-200 relative focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:ring-offset-2",
                    isActive 
                      ? "bg-brand-teal/5 text-brand-blue border-l-4 border-brand-teal" 
                      : "text-brand-text hover:bg-brand-teal/5 hover:text-brand-blue"
                  )}
                >
                  <Icon size={20} className={isActive ? "text-brand-teal" : "opacity-60"} />
                  <span className={cn(
                    "ml-1.5", // 6px spacing between icon and text
                    isActive ? "font-semibold text-brand-teal" : ""
                  )}>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
