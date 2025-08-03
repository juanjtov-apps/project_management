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
      isPrimary: false,
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
    <div className="elevated w-full">
      <div className="p-6 border-b border-brand-grey">
        <h3 className="text-lg font-semibold text-brand-blue">Quick Actions</h3>
      </div>
      <div className="p-6 grid grid-cols-2 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          console.log(`Rendering action ${index}:`, action.label);
          return (
            <Button
              key={`action-${index}-${action.label}`}
              variant="outline"
              className={`elevated flex flex-col items-center py-6 gap-2 h-24 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:ring-offset-2 ${
                action.isPrimary 
                  ? "text-brand-coral hover:bg-brand-coral hover:border-brand-coral hover:text-white" 
                  : "text-brand-blue hover:bg-brand-teal/10 hover:border-brand-teal"
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("Button clicked:", action.label);
                action.onClick();
              }}
            >
              <Icon 
                className={action.isPrimary ? "text-brand-coral group-hover:text-inherit" : "text-brand-teal group-hover:text-brand-teal"} 
                size={24} 
              />
              <span className="font-medium text-inherit text-sm text-center leading-tight">
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
