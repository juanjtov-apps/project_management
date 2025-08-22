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
  HardHat,
  X,
  Wrench,
  Shield,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

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

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const [location] = useLocation();

  // Get current user to show company name
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
  const companyName = userCompany?.name || currentUser?.companyName || 'Proesphere';

  // Three-tier access control - only show RBAC Admin to admin users
  const isRootAdmin = currentUser?.email?.includes('chacjjlegacy') || currentUser?.email === 'admin@proesphere.com';
  const isCompanyAdmin = currentUser?.role === 'admin' || currentUser?.email?.includes('admin');
  const hasRBACAccess = isRootAdmin || isCompanyAdmin;
  
  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => {
    if (item.name === 'RBAC Admin') {
      return hasRBACAccess;
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose}>
      <div className="w-64 bg-white h-full shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-brand-grey flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-teal shadow-lg flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-white opacity-30 absolute top-2 left-3"></div>
                <div className="text-white font-bold text-xs">P</div>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-brand-blue">{companyName}</h1>
              <p className="text-sm text-brand-text opacity-70">Construction Management</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} className="text-brand-text" />
          </Button>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {filteredNavigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <span 
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg font-medium transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:ring-offset-2",
                        isActive 
                          ? "bg-brand-teal/5 text-brand-blue border-l-4 border-brand-teal font-semibold" 
                          : "text-brand-text hover:bg-brand-teal/5 hover:text-brand-blue"
                      )}
                      onClick={onClose}
                    >
                      <Icon size={20} className={isActive ? "text-brand-teal" : "opacity-60"} />
                      <span className={isActive ? "font-semibold text-brand-blue" : "text-brand-text"}>{item.name}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
