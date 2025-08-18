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
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: Building },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
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

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose}>
      <div className="w-64 bg-white h-full shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 construction-primary rounded-lg flex items-center justify-center">
              <HardHat className="text-white text-lg" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold construction-secondary">ContractorPro</h1>
              <p className="text-sm text-gray-500">Project Management</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <span 
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg font-medium transition-colors cursor-pointer",
                        isActive 
                          ? "construction-primary text-white" 
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                      onClick={onClose}
                    >
                      <Icon size={20} />
                      <span>{item.name}</span>
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
