import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  MessageSquare,
  Package,
  CreditCard,
  Building,
  Layers
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InviteClientDialog from "@/components/onboarding/invite-client-dialog";
import ClientTour from "@/components/onboarding/client-tour";

// Import components for each tab
import { IssuesTab } from "@/components/client-portal/issues-tab.tsx";
import { ForumTab } from "@/components/client-portal/forum-tab.tsx";
import { MaterialsTab } from "@/components/client-portal/materials-tab.tsx";
import PaymentsTab from "@/components/client-portal/payments-tab.tsx";
import { StagesTab } from "@/components/client-portal/stages-tab.tsx";

export default function ClientPortal() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("stages");
  const [initialStageFilter, setInitialStageFilter] = useState<string | undefined>(undefined);
  const [showTour, setShowTour] = useState(false);

  // Detect showTour param from magic link redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("showTour") === "true") {
      setShowTour(true);
      // Clean up the URL param
      params.delete("showTour");
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  // Get current user for permissions
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/v1/auth/user"],
    retry: false
  });

  // Check if user is a client (for RBAC in materials tab)
  const isClient = currentUser?.role?.toLowerCase() === 'client';
  const assignedProjectId = currentUser?.assignedProjectId;

  // Auto-select assigned project for client users
  useEffect(() => {
    if (isClient && assignedProjectId && !selectedProject) {
      setSelectedProject(assignedProjectId);
    }
  }, [isClient, assignedProjectId, selectedProject]);

  // Parse URL parameters on mount and when URL changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectParam = params.get('projectId') || params.get('project');
    const tabParam = params.get('tab');
    const stageIdParam = params.get('stageId');

    if (projectParam) {
      setSelectedProject(projectParam);
    }

    // Security: Only set tab if user has permission to access it
    if (tabParam) {
      // If trying to access payments tab without permission, redirect to issues
      if (tabParam === 'installments' && !currentUser?.permissions?.clientPortalPayments) {
        setActiveTab('issues');
      } else {
        setActiveTab(tabParam);
      }
    }

    // If stageId is provided, set the initial filter for materials tab
    if (stageIdParam) {
      setInitialStageFilter(stageIdParam);
    }
  }, [currentUser?.permissions]); // Re-run when permissions change
  
  // Also listen to URL changes via popstate (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const projectParam = params.get('projectId') || params.get('project');
      const tabParam = params.get('tab');
      const stageIdParam = params.get('stageId');

      if (projectParam) {
        setSelectedProject(projectParam);
      }

      // Security: Only set tab if user has permission to access it
      if (tabParam) {
        // If trying to access payments tab without permission, redirect to issues
        if (tabParam === 'installments' && !currentUser?.permissions?.clientPortalPayments) {
          setActiveTab('issues');
        } else {
          setActiveTab(tabParam);
        }
      }

      // Handle stageId filter for materials tab
      if (stageIdParam) {
        setInitialStageFilter(stageIdParam);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser?.permissions]);
  
  // Get user projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  // Get client module stats for selected project
  const { data: stats } = useQuery({
    queryKey: [`/api/client-stats?project_id=${selectedProject}`],
    enabled: !!selectedProject,
  });

  // Define all possible tabs - using Proesphere dark theme colors
  const allTabItems = [
    {
      value: "stages",
      label: "Stages",
      icon: Layers,
      description: "Project timeline and milestones",
      color: "text-amber-400",
      requiresPermission: null // Always visible
    },
    {
      value: "issues",
      label: "Issues",
      icon: AlertTriangle,
      description: "Report and track project issues",
      color: "text-[var(--pro-orange)]",
      requiresPermission: null // Always visible
    },
    {
      value: "forum",
      label: "Forum",
      icon: MessageSquare,
      description: "Q&A with project managers",
      color: "text-[var(--pro-blue)]",
      requiresPermission: null // Always visible
    },
    {
      value: "materials",
      label: "Materials",
      icon: Package,
      description: "Collaborative material list",
      color: "text-[var(--pro-mint)]",
      requiresPermission: null // Always visible
    },
    {
      value: "installments",
      label: "Payments",
      icon: CreditCard,
      description: "Payment schedule tracking",
      color: "text-[var(--pro-purple)]",
      requiresPermission: "clientPortalPayments" // Only visible with payment permission
    }
  ];

  // Filter tabs based on user permissions
  const userPermissions = currentUser?.permissions || {};
  const tabItems = allTabItems.filter(tab => 
    !tab.requiresPermission || userPermissions[tab.requiresPermission]
  );

  // Calculate grid columns based on number of visible tabs
  const gridCols = tabItems.length === 5 ? 'grid-cols-5' :
                   tabItems.length === 4 ? 'grid-cols-4' :
                   tabItems.length === 3 ? 'grid-cols-3' :
                   tabItems.length === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className="space-y-6 p-6 bg-[var(--pro-bg)] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--pro-text-primary)]">Client Portal</h1>
          <p className="text-[var(--pro-text-secondary)]">
            Communicate and collaborate on your construction projects
          </p>
        </div>
        
        {/* Project Selector - Hidden for client users who only see their assigned project */}
        {isClient ? (
          // Static project display for clients
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--pro-surface)] rounded-lg border border-[var(--pro-border)]">
            <Building className="h-4 w-4 text-[var(--pro-text-secondary)]" />
            <span className="font-medium text-[var(--pro-text-primary)]">
              {projects.find(p => p.id === selectedProject)?.name || 'Loading project...'}
            </span>
            {projects.find(p => p.id === selectedProject)?.status && (
              <Badge variant="outline" className="ml-2">
                {projects.find(p => p.id === selectedProject)?.status}
              </Badge>
            )}
          </div>
        ) : (
          // Project dropdown + invite button for non-client users
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 sm:flex-none sm:w-80">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-full" data-testid="select-project">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 shrink-0" />
                    <SelectValue placeholder="Select a project" />
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
            </div>
            <div className="shrink-0">
              <InviteClientDialog defaultProjectId={selectedProject} />
            </div>
          </div>
        )}
      </div>

      {!selectedProject ? (
        <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Building className="h-16 w-16 mx-auto text-[var(--pro-text-muted)] mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-[var(--pro-text-primary)]">Select a Project</h3>
              <p className="text-[var(--pro-text-secondary)]">
                Choose a project to access issues, forum, materials, and payment information.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${gridCols}`}>
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2"
                  data-testid={`tab-${tab.value}`}
                  data-tour={`${tab.value}-tab`}
                >
                  <Icon className={`h-4 w-4 ${tab.color}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="stages">
            <StagesTab
              projectId={selectedProject}
              onNavigateToMaterials={(stageId) => {
                setInitialStageFilter(stageId);
                setActiveTab("materials");
              }}
            />
          </TabsContent>

          <TabsContent value="issues">
            <IssuesTab projectId={selectedProject} />
          </TabsContent>

          <TabsContent value="forum">
            <ForumTab projectId={selectedProject} />
          </TabsContent>

          <TabsContent value="materials">
            <MaterialsTab
              projectId={selectedProject}
              initialStageFilter={initialStageFilter}
              isClient={isClient}
            />
          </TabsContent>

          {/* Only render payments tab content if user has permission */}
          {userPermissions.clientPortalPayments && (
            <TabsContent value="installments">
              <PaymentsTab projectId={selectedProject} isClient={isClient} />
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Guided tour for first-time client users */}
      {isClient && selectedProject && (
        <ClientTour forceShow={showTour} />
      )}
    </div>
  );
}