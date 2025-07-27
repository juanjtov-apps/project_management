import { Camera, CheckCircle, AlertTriangle } from "lucide-react";

const activityItems = [
  {
    id: 1,
    icon: Camera,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100",
    user: "Sarah Chen",
    action: "uploaded 5 photos to",
    project: "Downtown Office Complex",
    timestamp: "2 hours ago"
  },
  {
    id: 2,
    icon: CheckCircle,
    iconColor: "text-green-600",
    iconBg: "bg-green-100",
    user: "Team Alpha",
    action: "completed task",
    project: "Electrical Installation - Floor 3",
    timestamp: "4 hours ago"
  },
  {
    id: 3,
    icon: AlertTriangle,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100",
    user: "Mike Rodriguez",
    action: "reported schedule delay for",
    project: "Residential Complex A",
    timestamp: "6 hours ago"
  }
];

export default function RecentActivity() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold construction-secondary">Recent Activity</h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {activityItems.map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-b-0">
                <div className={`w-8 h-8 ${activity.iconBg} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                  <Icon className={activity.iconColor} size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm construction-secondary">
                    <span className="font-medium">{activity.user}</span> {activity.action}{" "}
                    <span className="font-medium text-blue-600">{activity.project}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
