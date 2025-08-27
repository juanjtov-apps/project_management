import { Camera, CheckCircle, AlertTriangle, Users, Building, Plus, Upload, Edit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  user_id: string;
  company_id: string;
  action_type: string;
  description: string;
  entity_type: string;
  entity_id: string;
  metadata: any;
  created_at: string;
  first_name: string;
  email: string;
}

export default function RecentActivity() {
  // Get real activities from API
  const { data: activities = [], isLoading } = useQuery<ActivityItem[]>({
    queryKey: ['/api/activities'],
    retry: false
  });

  // Map activity types to icons
  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'task_created': return Plus;
      case 'task_completed': return CheckCircle;
      case 'project_created': return Building;
      case 'photo_uploaded': return Camera;
      case 'user_created': return Users;
      case 'task_updated': return Edit;
      default: return CheckCircle;
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  if (isLoading) {
    return (
      <div className="elevated">
        <div className="p-6 border-b border-brand-grey">
          <h3 className="text-lg font-semibold text-brand-blue">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3 pb-4 border-b border-brand-grey/50 last:border-b-0">
                <div className="w-2 h-2 bg-brand-grey rounded-full mt-2 flex-shrink-0 animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-brand-grey/20 rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-brand-grey/20 rounded animate-pulse w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-brand-text opacity-60">No recent activity in your company</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.slice(0, 5).map((activity) => {
              const Icon = getActivityIcon(activity.action_type);
              return (
                <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-brand-grey/50 last:border-b-0 relative">
                  <div className="w-2 h-2 bg-brand-teal rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm text-brand-blue font-medium">
                      {activity.first_name || activity.email || 'User'}
                    </p>
                    <p className="text-sm text-brand-text opacity-80 mt-1">
                      {activity.description}
                    </p>
                    <p className="text-xs text-brand-text opacity-50 mt-1">
                      {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
