import { Button } from "@/components/ui/button";
import { Plus, Camera, ClipboardList, UserPlus } from "lucide-react";
import { useLocation } from "wouter";

export default function QuickActions() {
  const [, setLocation] = useLocation();

  const actions = [
    {
      icon: Plus,
      label: "New Project",
      onClick: () => setLocation("/projects")
    },
    {
      icon: Camera,
      label: "Upload Photos",
      onClick: () => setLocation("/photos")
    },
    {
      icon: ClipboardList,
      label: "Create Log",
      onClick: () => setLocation("/logs")
    },
    {
      icon: UserPlus,
      label: "Assign Task",
      onClick: () => setLocation("/tasks")
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold construction-secondary">Quick Actions</h3>
      </div>
      <div className="p-6 space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant="outline"
              className="w-full flex items-center space-x-3 p-3 h-auto border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all"
              onClick={action.onClick}
            >
              <Icon className="text-blue-600" size={20} />
              <span className="font-medium construction-secondary">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
