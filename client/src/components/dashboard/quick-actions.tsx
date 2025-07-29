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
      onClick: () => {
        console.log("Navigating to projects");
        setLocation("/projects");
      }
    },
    {
      icon: ClipboardList,
      label: "Add Tasks",
      onClick: () => {
        console.log("Navigating to tasks");
        setLocation("/tasks");
      }
    },
    {
      icon: Camera,
      label: "Upload Photos",
      onClick: () => {
        console.log("Navigating to photos");
        setLocation("/photos");
      }
    },
    {
      icon: UserPlus,
      label: "Assign Task",
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
      </div>
      <div className="p-6 space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          console.log(`Rendering action ${index}:`, action.label);
          return (
            <Button
              key={action.label}
              variant="outline"
              className="w-full flex items-center justify-start space-x-3 p-4 h-auto border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all text-left min-h-[60px]"
              onClick={() => {
                console.log("Button clicked:", action.label);
                action.onClick();
              }}
            >
              <Icon className="text-blue-600 flex-shrink-0" size={20} />
              <span className="font-medium text-gray-700">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickActions;
