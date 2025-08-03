import { Button } from "@/components/ui/button";
import { Plus, Camera, ClipboardList, UserPlus } from "lucide-react";
import { useLocation } from "wouter";

function QuickActions() {
  const [, setLocation] = useLocation();
  
  console.log("QuickActions component rendering - this should appear!");
  console.log("setLocation function:", typeof setLocation);
  
  // Force re-render test
  console.log("Current timestamp:", Date.now());

  const actions = [
    {
      icon: Plus,
      label: "Add Project",
      isPrimary: true,
      onClick: () => {
        console.log("Navigating to projects");
        setLocation("/projects");
      }
    },
    {
      icon: ClipboardList,
      label: "Add Tasks",
      isPrimary: false,
      onClick: () => {
        console.log("Navigating to tasks");
        setLocation("/tasks");
      }
    },
    {
      icon: Camera,
      label: "Upload Photos",
      isPrimary: false,
      onClick: () => {
        console.log("Navigating to photos");
        setLocation("/photos");
      }
    },
    {
      icon: UserPlus,
      label: "Assign Task",
      isPrimary: false,
      onClick: () => {
        console.log("Navigating to subs");
        setLocation("/subs");
      }
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
    <div className="bg-white rounded-lg shadow-sm border border-[var(--proesphere-mist)] w-full">
      <div className="p-6 border-b border-[var(--proesphere-mist)]">
        <h3 className="text-lg font-semibold text-[var(--proesphere-deep-blue)]">Quick Actions</h3>
      </div>
      <div className="p-6 grid grid-cols-2 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          console.log(`Rendering action ${index}:`, action.label);
          return (
            <Button
              key={`action-${index}-${action.label}`}
              variant="outline"
              className={`flex flex-col items-center justify-center gap-3 p-6 h-24 border border-[var(--proesphere-mist)] transition-all duration-200 cursor-pointer ${
                action.isPrimary 
                  ? "hover:bg-[var(--proesphere-coral)] hover:border-[var(--proesphere-coral)] hover:text-white" 
                  : "hover:bg-[var(--proesphere-teal)]/5 hover:border-[var(--proesphere-teal)] hover:text-[var(--proesphere-deep-blue)]"
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("Button clicked:", action.label);
                action.onClick();
              }}
            >
              <Icon 
                className={action.isPrimary ? "text-[var(--proesphere-coral)]" : "text-[var(--proesphere-teal)]"} 
                size={24} 
              />
              <span className="font-medium text-[var(--proesphere-graphite)] text-sm text-center leading-tight group-hover:text-inherit">
                {action.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickActions;
