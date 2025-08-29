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
    <div className="max-w-[1440px] mx-auto space-y-8 mt-6" data-testid="dashboard">
      {/* Quick Stats */}
      <StatsCards />

      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto snap-x snap-mandatory whitespace-nowrap md:overflow-x-visible">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-4 p-1 bg-muted rounded-lg" style={{backgroundColor: 'hsl(210, 15%, 95%)', border: '1px solid hsl(210, 15%, 85%)'}}>
            <TabsTrigger 
              value="overview" 
              className="whitespace-nowrap snap-center data-[state=active]:bg-white data-[state=active]:shadow-sm relative data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary focus-ring min-h-[44px]" 
              style={{color: 'var(--brand-blue)'}}
            >
              Project Overview
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="whitespace-nowrap snap-center data-[state=active]:bg-white data-[state=active]:shadow-sm relative data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary focus-ring min-h-[44px]" 
              style={{color: 'var(--brand-blue)'}}
            >
              Task Management
            </TabsTrigger>
            <TabsTrigger 
              value="communications" 
              className="whitespace-nowrap snap-center data-[state=active]:bg-white data-[state=active]:shadow-sm relative data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary focus-ring min-h-[44px]" 
              style={{color: 'var(--brand-blue)'}}
            >
              Communications
            </TabsTrigger>
            <TabsTrigger 
              value="financial" 
              className="whitespace-nowrap snap-center data-[state=active]:bg-white data-[state=active]:shadow-sm relative data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary focus-ring min-h-[44px]" 
              style={{color: 'var(--brand-blue)'}}
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
  );
}
