import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  const [isMobileFABOpen, setIsMobileFABOpen] = useState(false);
  
  return (
    <div className="overflow-hidden h-full" data-testid="dashboard">
      <div className="overflow-auto h-full">
        <div className="mx-auto max-w-screen-lg px-6 md:px-8 space-y-8 mt-6">
      {/* Quick Stats */}
      <StatsCards />

      <Tabs defaultValue="overview" className="w-full">
        <div className="sticky top-16 z-30 bg-white border-b border-slate-200 px-2 py-2 -mx-6 md:-mx-8 mb-8">
          <TabsList className="w-full grid grid-cols-4 p-1 bg-slate-50 rounded-lg">
            <TabsTrigger 
              value="overview" 
              className="min-h-[48px] data-[state=active]:bg-white data-[state=active]:shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200" 
              style={{color: 'var(--brand-blue)'}}
              aria-label="Project Overview"
            >
              Project Overview
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="min-h-[48px] data-[state=active]:bg-white data-[state=active]:shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200" 
              style={{color: 'var(--brand-blue)'}}
              aria-label="Task Management"
            >
              Task Management
            </TabsTrigger>
            <TabsTrigger 
              value="communications" 
              className="min-h-[48px] data-[state=active]:bg-white data-[state=active]:shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200" 
              style={{color: 'var(--brand-blue)'}}
              aria-label="Communications"
            >
              Communications
            </TabsTrigger>
            <TabsTrigger 
              value="financial" 
              className="min-h-[48px] data-[state=active]:bg-white data-[state=active]:shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200" 
              style={{color: 'var(--brand-blue)'}}
              aria-label="Financial Health"
            >
              Financial Health
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-8">
          {/* Multi-Project Overview Dashboard */}
          <MultiProjectOverview />

          {/* Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <RecentActivity />
            </div>
            <div className="hidden lg:block">
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

      {/* Mobile FAB for Quick Actions */}
      <Sheet open={isMobileFABOpen} onOpenChange={setIsMobileFABOpen}>
        <SheetTrigger asChild>
          <Button
            className="fixed bottom-6 right-6 lg:hidden w-14 h-14 rounded-full shadow-lg hover:shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground focus-ring z-50"
            style={{
              bottom: 'calc(24px + env(safe-area-inset-bottom))',
              right: 'calc(24px + env(safe-area-inset-right))'
            }}
            aria-label="Quick Actions"
            data-testid="mobile-fab"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] focus-ring" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>Quick Actions</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <QuickActions />
          </div>
        </SheetContent>
      </Sheet>
        </div>
      </div>
    </div>
  );
}
