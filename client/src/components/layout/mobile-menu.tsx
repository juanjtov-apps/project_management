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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600 to-brand-500 shadow-lg flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-white opacity-30 absolute top-2 left-3"></div>
                <div className="text-white font-bold text-xs">P</div>
              </div>
            </div>
            <div>
              <SheetTitle className="text-lg font-bold text-foreground">{companyName}</SheetTitle>
              <p className="text-sm text-muted-foreground">Construction Management</p>
            </div>
          </div>
        </SheetHeader>
        
        <nav className="p-4 flex-1">
          <ul className="space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <span 
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg font-medium transition-all duration-200 cursor-pointer touch-target",
                        isActive 
                          ? "bg-primary/10 text-primary border-l-4 border-primary font-semibold" 
                          : "text-foreground hover:bg-primary/5 hover:text-primary"
                      )}
                      onClick={onClose}
                    >
                      <Icon size={20} className={isActive ? "text-primary" : "text-muted-foreground"} />
                      <span className={isActive ? "font-semibold text-primary" : "text-foreground"}>{item.name}</span>
                    </span>
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
