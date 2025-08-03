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
    <aside className="w-64 bg-[#1B2E4B0D] shadow-lg border-r border-[var(--proesphere-mist)] hidden lg:block">
      <div className="p-6 border-b border-[var(--proesphere-mist)]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--proesphere-deep-blue)] to-[var(--proesphere-teal)] shadow-lg flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-white opacity-30 absolute top-2 left-3"></div>
              <div className="text-white font-bold text-xs">P</div>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--proesphere-deep-blue)]">Proesphere</h1>
            <p className="text-sm text-[var(--proesphere-graphite)] opacity-70">Construction Management</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name} className="relative">
                {isActive && (
                  <div className="absolute left-0 top-0 w-1 h-full bg-[var(--proesphere-teal)] rounded-r-full"></div>
                )}
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg font-medium transition-all duration-200 relative focus:outline-none focus:ring-2 focus:ring-[var(--proesphere-teal)]/40 focus:ring-offset-2",
                    isActive 
                      ? "bg-[var(--proesphere-teal)]/10 text-[var(--proesphere-deep-blue)] border-l-4 border-[var(--proesphere-teal)] ml-1" 
                      : "text-[var(--proesphere-graphite)] hover:bg-[var(--proesphere-teal)]/5 hover:text-[var(--proesphere-deep-blue)]"
                  )}
                >
                  <Icon size={20} className={isActive ? "text-[var(--proesphere-teal)]" : ""} />
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
