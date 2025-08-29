import { Button } from "@/components/ui/button";
import { Plus, Camera, ClipboardList, UserPlus, FileText, Calendar, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

function QuickActions() {
  const [, setLocation] = useLocation();
  
  console.log("QuickActions component rendering - this should appear!");
  console.log("setLocation function:", typeof setLocation);
  
  // Force re-render test
  console.log("Current timestamp:", Date.now());

  const quickActions = [
    {
      icon: Plus,
      label: "New Project",
      description: "Create project",
      variant: "primary" as const,
      href: "/projects"
    },
    {
      icon: ClipboardList,
      label: "Add Task",
      description: "Create task",
      variant: "secondary" as const,
      href: "/tasks"
    },
    {
      icon: Camera,
      label: "Upload Photo",
      description: "Add photos",
      variant: "secondary" as const,
      href: "/photos"
    },
    {
      icon: FileText,
      label: "Project Log",
      description: "Add entry",
      variant: "secondary" as const,
      href: "/logs"
    },
    {
      icon: Calendar,
      label: "Schedule",
      description: "View calendar",
      variant: "secondary" as const,
      href: "/schedule"
    },
    {
      icon: TrendingUp,
      label: "Project Health",
      description: "Check status",
      variant: "secondary" as const,
      href: "/project-health"
    }
  ];

  console.log("About to render QuickActions, actions count:", actions.length);

  if (!actions || actions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="text-gray-500">Loading actions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
        <p className="text-sm text-muted-foreground mt-1">Common tasks and workflows</p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            const isPrimary = action.variant === "primary";
            
            return (
              <Button
                key={`action-${index}-${action.label}`}
                variant={isPrimary ? "default" : "outline"}
                onClick={() => setLocation(action.href)}
                className={cn(
                  "flex flex-col items-center justify-center h-20 p-4 gap-2",
                  "transition-all duration-200 group",
                  "btn-press",
                  isPrimary 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "hover:bg-muted hover:border-primary/20"
                )}
              >
                <Icon 
                  size={20} 
                  className={cn(
                    "transition-transform duration-200 group-hover:scale-110",
                    isPrimary ? "text-primary-foreground" : "text-primary"
                  )}
                />
                <div className="text-center">
                  <div className={cn(
                    "text-xs font-medium leading-none",
                    isPrimary ? "text-primary-foreground" : "text-foreground"
                  )}>
                    {action.label}
                  </div>
                  <div className={cn(
                    "text-[10px] leading-none mt-0.5 opacity-75",
                    isPrimary ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {action.description}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default QuickActions;
