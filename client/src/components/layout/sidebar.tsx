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
  Wrench,
  Shield
} from "lucide-react";

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

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 hidden lg:block">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 construction-primary rounded-lg flex items-center justify-center">
            <HardHat className="text-white text-lg" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold construction-secondary">Tower Flow</h1>
            <p className="text-sm text-gray-500">Project Management</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg font-medium transition-colors",
                    isActive 
                      ? "construction-primary text-white" 
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Icon size={20} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
