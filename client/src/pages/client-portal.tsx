import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertTriangle, 
  MessageSquare, 
  Package, 
  CreditCard, 
  Bell,
  Building 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Import components for each tab
import { IssuesTab } from "@/components/client-portal/issues-tab.tsx";
import { ForumTab } from "@/components/client-portal/forum-tab.tsx";
import { MaterialsTab } from "@/components/client-portal/materials-tab.tsx";
import { InstallmentsTab } from "@/components/client-portal/installments-tab.tsx";
import { NotificationsTab } from "@/components/client-portal/notifications-tab.tsx";

export default function ClientPortal() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  
  // Get user projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  // Get client module stats for selected project
  const { data: stats } = useQuery({
    queryKey: [`/api/client-stats?project_id=${selectedProject}`],
    enabled: !!selectedProject,
  });

  const tabItems = [
    {
      value: "issues",
      label: "Issues",
      icon: AlertTriangle,
      description: "Report and track project issues",
      color: "text-amber-600"
    },
    {
      value: "forum",
      label: "Forum",
      icon: MessageSquare,
      description: "Q&A with project managers",
      color: "text-blue-600"
    },
    {
      value: "materials",
      label: "Materials",
      icon: Package,
      description: "Collaborative material list",
      color: "text-green-600"
    },
    {
      value: "installments",
      label: "Payments",
      icon: CreditCard,
      description: "Payment schedule tracking",
      color: "text-purple-600"
    },
    {
      value: "notifications",
      label: "Notifications",
      icon: Bell,
      description: "Notification preferences",
      color: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Portal</h1>
          <p className="text-muted-foreground">
            Communicate and collaborate on your construction projects
          </p>
        </div>
        
        {/* Project Selector */}
        <div className="w-80">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full" data-testid="select-project">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
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
      </div>

      {!selectedProject ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Building className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Select a Project</h3>
              <p className="text-muted-foreground">
                Choose a project to access issues, forum, materials, and payment information.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="issues" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value} 
                  className="flex items-center gap-2"
                  data-testid={`tab-${tab.value}`}
                >
                  <Icon className={`h-4 w-4 ${tab.color}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="issues">
            <IssuesTab projectId={selectedProject} />
          </TabsContent>

          <TabsContent value="forum">
            <ForumTab projectId={selectedProject} />
          </TabsContent>

          <TabsContent value="materials">
            <MaterialsTab projectId={selectedProject} />
          </TabsContent>

          <TabsContent value="installments">
            <InstallmentsTab projectId={selectedProject} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsTab projectId={selectedProject} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}