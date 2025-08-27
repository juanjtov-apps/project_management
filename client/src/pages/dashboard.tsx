import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsCards from "@/components/dashboard/stats-cards";
import RecentActivity from "@/components/dashboard/recent-activity";
import QuickActions from "@/components/dashboard/quick-actions";
import ActiveProjects from "@/components/dashboard/active-projects";
import TodaysTasks from "@/components/dashboard/todays-tasks";
import ExpiredUpcomingTasks from "@/components/dashboard/expired-upcoming-tasks";
import MultiProjectOverview from "@/components/dashboard/multi-project-overview";
import CommunicationFeed from "@/components/communications/communication-feed";
import FinancialHealthDashboard from "@/components/financial/financial-health-dashboard";

export default function Dashboard() {
  console.log("Dashboard component rendering");
  
  return (
    <div className="max-w-[1440px] mx-auto space-y-8 mt-6" data-testid="dashboard">
      {/* Quick Stats */}
      <StatsCards />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Project Overview</TabsTrigger>
          <TabsTrigger value="tasks">Task Management</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="financial">Financial Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* Multi-Project Overview Dashboard */}
          <MultiProjectOverview />

          {/* Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <RecentActivity />
            </div>
            <div>
              <QuickActions />
            </div>
          </div>

          {/* Active Projects */}
          <ActiveProjects />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-8">
          {/* Critical Task Management for General Contractors */}
          <ExpiredUpcomingTasks />

          {/* Today's Tasks */}
          <TodaysTasks />
        </TabsContent>

        <TabsContent value="communications" className="space-y-8">
          {/* Integrated Communication System */}
          <CommunicationFeed />
        </TabsContent>

        <TabsContent value="financial" className="space-y-8">
          {/* Financial Health Monitoring */}
          <FinancialHealthDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
