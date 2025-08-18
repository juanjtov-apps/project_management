import { Camera, CheckCircle, AlertTriangle, Users, Building } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ActivityItem {
  id: number;
  icon: any;
  user: string;
  action: string;
  timestamp: string;
  type: string;
}

export default function RecentActivity() {
  // Get current user to determine activity scope
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    retry: false
  });
  
  // Get company data for root admin
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['/api/companies'],
    enabled: !!currentUser
  });
  
  // Get users data for root admin
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/rbac/users'],
    enabled: !!currentUser
  });

  const isRootAdmin = currentUser?.email?.includes('chacjjlegacy') || currentUser?.email === 'admin@proesphere.com';
  
  // Generate relevant activity items based on user role
  const getActivityItems = (): ActivityItem[] => {
    if (isRootAdmin) {
      // Root admin sees platform-wide activities
      return [
        {
          id: 1,
          icon: Building,
          user: "Company Added",
          action: `New company "${companies[companies.length - 1]?.name || 'Recent Company'}" added to platform`,
          timestamp: "2h ago",
          type: "company"
        },
        {
          id: 2,
          icon: Users,
          user: "User Registered",
          action: `${users[users.length - 1]?.name || users[users.length - 1]?.email || 'New user'} joined the platform`,
          timestamp: "4h ago",
          type: "user"
        }
      ];
    } else {
      // Company users see company-specific activities
      const companyName = currentUser?.companyId ? companies.find(c => c.id.toString() === currentUser.companyId.toString())?.name || 'your company' : 'your company';
      return [
        {
          id: 1,
          icon: CheckCircle,
          user: "Task Progress",
          action: `Project tasks updated in ${companyName}`,
          timestamp: "3h ago",
          type: "task"
        },
        {
          id: 2,
          icon: Camera,
          user: "Documentation",
          action: `New project photos uploaded for ${companyName} projects`,
          timestamp: "1d ago",
          type: "photo"
        }
      ];
    }
  };

  const activityItems = getActivityItems();

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
