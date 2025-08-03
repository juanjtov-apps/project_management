import StatsCards from "@/components/dashboard/stats-cards";
import RecentActivity from "@/components/dashboard/recent-activity";
import QuickActions from "@/components/dashboard/quick-actions";
import ActiveProjects from "@/components/dashboard/active-projects";
import TodaysTasks from "@/components/dashboard/todays-tasks";

export default function Dashboard() {
  console.log("Dashboard component rendering");
  
  return (
    <div className="max-w-[1440px] mx-auto space-y-8 mt-6">
      {/* Quick Stats */}
      <StatsCards />

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Active Projects & Tasks */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <ActiveProjects />
        <TodaysTasks />
      </div>
    </div>
  );
}
