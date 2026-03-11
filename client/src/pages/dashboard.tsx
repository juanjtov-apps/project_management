import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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


export default function Dashboard() {
  const { t } = useTranslation('dashboard');
  const [isMobileFABOpen, setIsMobileFABOpen] = useState(false);

  return (
    <div
      className="overflow-hidden h-full"
      data-testid="dashboard"
      style={{ backgroundColor: '#0F1115' }}
    >
      <div className="overflow-auto h-full">
        <div className="mx-auto max-w-screen-xl px-6 md:px-8 space-y-8 py-6">
          <StatsCards />

          <Tabs defaultValue="overview" className="w-full">
            <div
              className="relative z-30 border-b px-2 py-2 -mx-6 md:-mx-8 mb-8"
              style={{
                backgroundColor: '#0F1115',
                borderColor: '#2D333B'
              }}
            >
              <TabsList
                className="w-full grid grid-cols-2 p-1 rounded-xl"
                style={{ backgroundColor: '#161B22' }}
              >
                <TabsTrigger
                  value="overview"
                  className="min-h-[48px] text-[#9CA3AF] data-[state=active]:text-white data-[state=active]:bg-[#1F242C] rounded-lg transition-all"
                  aria-label="Project Overview"
                  data-testid="tab-overview"
                >
                  {t('tabs.projectOverview')}
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="min-h-[48px] text-[#9CA3AF] data-[state=active]:text-white data-[state=active]:bg-[#1F242C] rounded-lg transition-all"
                  aria-label={t('tabs.taskManagement')}
                  data-testid="tab-tasks"
                >
                  {t('tabs.taskManagement')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-8">
              <MultiProjectOverview />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <RecentActivity />
                </div>
                <div className="hidden lg:block">
                  <QuickActions />
                </div>
              </div>
              <ActiveProjects />
            </TabsContent>

            <TabsContent value="tasks" className="space-y-8">
              <ExpiredUpcomingTasks />
              <TodaysTasks />
            </TabsContent>

          </Tabs>

          <Sheet open={isMobileFABOpen} onOpenChange={setIsMobileFABOpen}>
            <SheetTrigger asChild>
              <Button
                className="fixed bottom-6 right-6 lg:hidden w-14 h-14 rounded-full shadow-2xl hover:shadow-xl z-50"
                style={{
                  bottom: 'calc(24px + env(safe-area-inset-bottom))',
                  right: 'calc(24px + env(safe-area-inset-right))',
                  backgroundColor: '#4ADE80',
                  color: '#0F1115'
                }}
                aria-label="Quick Actions"
                data-testid="mobile-fab"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-auto max-h-[80vh] border-t"
              style={{
                backgroundColor: '#161B22',
                borderColor: '#2D333B'
              }}
              aria-describedby={undefined}
            >
              <SheetHeader>
                <SheetTitle className="text-white">{t('quickActions.title')}</SheetTitle>
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
