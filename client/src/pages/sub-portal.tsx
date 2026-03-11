import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  CalendarDays,
  DollarSign,
  UserCircle,
  Building,
  HardHat,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

import { TasksTab } from "@/components/sub-portal/tasks-tab";
import { ScheduleTab } from "@/components/sub-portal/schedule-tab";
import { PaymentsTab } from "@/components/sub-portal/payments-tab";
import { ProfileTab } from "@/components/sub-portal/profile-tab";

interface SubProject {
  id: string;
  name: string;
  status: string;
  address?: string;
}

export default function SubPortal() {
  const { t } = useTranslation('subPortal');
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("tasks");
  const { user } = useAuth();

  // Parse URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectParam = params.get("projectId") || params.get("project");
    const tabParam = params.get("tab");

    if (projectParam) {
      setSelectedProject(projectParam);
    }

    if (tabParam && ["tasks", "schedule", "payments", "profile"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // Listen for popstate (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const projectParam = params.get("projectId") || params.get("project");
      const tabParam = params.get("tab");

      if (projectParam) {
        setSelectedProject(projectParam);
      }
      if (tabParam && ["tasks", "schedule", "payments", "profile"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Fetch subcontractor's projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<SubProject[]>({
    queryKey: ["/api/v1/sub/my-projects"],
    queryFn: async () => {
      const res = await fetch("/api/v1/sub/my-projects", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  // Auto-select project if only one
  useEffect(() => {
    if (projects.length === 1 && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  const subcontractorId = (user as { subcontractorId?: string } | null)?.subcontractorId;

  const tabItems = [
    {
      value: "tasks",
      label: t('tabs.tasks'),
      icon: ClipboardList,
      color: "text-[var(--pro-blue)]",
    },
    {
      value: "schedule",
      label: t('tabs.schedule'),
      icon: CalendarDays,
      color: "text-amber-400",
    },
    {
      value: "payments",
      label: t('tabs.payments'),
      icon: DollarSign,
      color: "text-[var(--pro-mint)]",
    },
    {
      value: "profile",
      label: t('tabs.profile'),
      icon: UserCircle,
      color: "text-[var(--pro-purple)]",
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-[var(--pro-bg)] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HardHat className="h-6 w-6 sm:h-7 sm:w-7 text-[var(--pro-mint)]" />
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--pro-text-primary)]">
              {t('title')}
            </h1>
          </div>
          <p className="text-[var(--pro-text-secondary)] mt-1">
            {t('subtitle')}
          </p>
        </div>

        {/* Project Selector */}
        <div className="min-w-0 flex-1 sm:flex-none sm:w-80">
          {projectsLoading ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--pro-surface)] rounded-lg border border-[var(--pro-border)]">
              <Building className="h-4 w-4 text-[var(--pro-text-secondary)] animate-pulse" />
              <span className="text-[var(--pro-text-secondary)]">{t('loadingProjects')}</span>
            </div>
          ) : projects.length === 1 ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--pro-surface)] rounded-lg border border-[var(--pro-border)]">
              <Building className="h-4 w-4 text-[var(--pro-text-secondary)]" />
              <span className="font-medium text-[var(--pro-text-primary)]">
                {projects[0].name}
              </span>
              {projects[0].status && (
                <Badge variant="outline" className="ml-2">
                  {projects[0].status}
                </Badge>
              )}
            </div>
          ) : (
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 shrink-0" />
                  <SelectValue placeholder={t('selectProject')} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{project.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {project.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {!selectedProject ? (
        <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <HardHat className="h-16 w-16 mx-auto text-[var(--pro-text-muted)] mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-[var(--pro-text-primary)]">
                {t('selectProject')}
              </h3>
              <p className="text-[var(--pro-text-secondary)]">
                {t('selectProjectDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  data-tour={`sub-${tab.value}-tab`}
                  className="flex items-center gap-2 min-h-[44px]"
                >
                  <Icon className={`h-4 w-4 ${tab.color}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="tasks">
            <TasksTab projectId={selectedProject} />
          </TabsContent>

          <TabsContent value="schedule">
            <ScheduleTab projectId={selectedProject} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsTab projectId={selectedProject} />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileTab subcontractorId={subcontractorId || ""} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
