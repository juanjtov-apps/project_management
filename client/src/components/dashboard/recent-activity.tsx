import { Camera, CheckCircle, AlertTriangle, Users, Building, Plus, Upload, Edit } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { formatRelativeTime } from "@/lib/statusColors";

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
  const { t } = useTranslation('dashboard');
  const { data: activities = [], isLoading } = useQuery<ActivityItem[]>({
    queryKey: ['/api/activities'],
    retry: false
  });

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

  const groupActivitiesByDay = (activities: ActivityItem[]) => {
    const groups: { [key: string]: ActivityItem[] } = {};
    
    activities.forEach(activity => {
      try {
        const date = parseISO(activity.created_at);
        let dayLabel;
        
        if (isToday(date)) {
          dayLabel = t('recentActivity.today');
        } else if (isYesterday(date)) {
          dayLabel = t('recentActivity.yesterday');
        } else {
          dayLabel = format(date, 'MMMM d, yyyy');
        }
        
        if (!groups[dayLabel]) {
          groups[dayLabel] = [];
        }
        groups[dayLabel].push(activity);
      } catch {
        const recentlyLabel = t('recentActivity.recently');
        if (!groups[recentlyLabel]) {
          groups[recentlyLabel] = [];
        }
        groups[recentlyLabel].push(activity);
      }
    });
    
    return groups;
  };

  // 8D: Memoize grouped activities to avoid re-computing on every render
  const groupedActivities = useMemo(
    () => groupActivitiesByDay(activities),
    [activities]
  );

  if (isLoading) {
    return (
      <div 
        className="rounded-xl"
        style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
      >
        <div className="p-5 border-b" style={{ borderColor: '#2D333B' }}>
          <h3 className="text-lg font-semibold text-white">{t('recentActivity.title')}</h3>
        </div>
        <div className="p-5">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3 pb-4 border-b last:border-b-0" style={{ borderColor: '#2D333B' }}>
                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 animate-pulse" style={{ backgroundColor: '#2D333B' }}></div>
                <div className="flex-1">
                  <div className="h-4 rounded animate-pulse mb-2" style={{ backgroundColor: '#1F242C' }}></div>
                  <div className="h-3 rounded animate-pulse w-3/4" style={{ backgroundColor: '#1F242C' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-xl"
      style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
      data-testid="recent-activity"
    >
      <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: '#2D333B' }}>
        <h3 className="text-lg font-semibold text-white">{t('recentActivity.title')}</h3>
        <button 
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: '#4ADE80' }}
          data-testid="view-all-activity"
        >
          {t('recentActivity.viewAll')}
        </button>
      </div>
      <div className="p-5">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <p style={{ color: '#9CA3AF' }}>{t('recentActivity.empty')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([dayLabel, dayActivities]) => (
              <div key={dayLabel} className="space-y-3">
                <div className="sticky top-0 py-2 -mx-5 px-5" style={{ backgroundColor: '#161B22' }}>
                  <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>{dayLabel}</h4>
                </div>
                <div className="space-y-2">
                  {dayActivities.slice(0, 5).map((activity) => {
                    const Icon = getActivityIcon(activity.action_type);
                    return (
                      <button
                        key={activity.id}
                        className="w-full flex items-start space-x-3 p-3 rounded-lg transition-colors text-left hover:bg-[#1F242C]"
                        onClick={() => {
                          // TODO: Navigate to entity detail view
                        }}
                        data-testid={`activity-item-${activity.id}`}
                      >
                        <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: '#4ADE80' }}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-white">
                            {activity.first_name || activity.email || 'User'}
                          </p>
                          <p className="text-sm mt-1 truncate" style={{ color: '#9CA3AF' }}>
                            {activity.description}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs" style={{ color: '#6B7280' }}>
                              {formatRelativeTime(activity.created_at)}
                            </p>
                            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: '#4ADE80' }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
