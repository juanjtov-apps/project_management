import { Camera, CheckCircle, AlertTriangle } from "lucide-react";

const activityItems = [
  {
    id: 1,
    icon: CheckCircle,
    user: "Task Completed",
    action: "Foundation inspection completed",
    timestamp: "2h ago",
    type: "completed"
  },
  {
    id: 2,
    icon: Camera,
    user: "New Team Member",
    action: "Sarah Johnson joined the team",
    timestamp: "4h ago",
    type: "member"
  },
  {
    id: 3,
    icon: AlertTriangle,
    user: "Schedule Update",
    action: "Project deadline extended by 2 days",
    timestamp: "1d ago",
    type: "schedule"
  },
  {
    id: 4,
    icon: CheckCircle,
    user: "Task Completed",
    action: "Electrical work phase completed",
    timestamp: "2d ago",
    type: "completed"
  },
  {
    id: 5,
    icon: Camera,
    user: "Photo Upload",
    action: "Site progress photos uploaded",
    timestamp: "3d ago",
    type: "photo"
  }
];

export default function RecentActivity() {
  return (
    <div className="elevated">
      <div className="p-6 border-b border-brand-grey">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-blue">Recent Activity</h3>
          <button className="text-sm text-brand-coral hover:text-brand-coral/80 font-medium focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:ring-offset-2 rounded px-1">
            View all
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {activityItems.slice(0, 5).map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-brand-grey/50 last:border-b-0 relative">
                <div className="w-2 h-2 bg-brand-teal rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm text-brand-blue font-medium">
                    {activity.user}
                  </p>
                  <p className="text-sm text-brand-text opacity-80 mt-1">
                    {activity.action}
                  </p>
                  <p className="text-xs text-brand-text opacity-50 mt-1">{activity.timestamp}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
