import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, DollarSign, Users, Building, Target, Eye, Plus } from "lucide-react";
import AddRiskDialog from "@/components/project-health/add-risk-dialog";
import ProjectHealthCard from "@/components/project-health/project-health-card";
import type { Project, ProjectHealthMetrics, RiskAssessment } from "@shared/schema";

// Health score color mappings
const getHealthColor = (score: number) => {
  if (score >= 80) return "text-green-600 bg-green-50";
  if (score >= 60) return "text-yellow-600 bg-yellow-50";
  if (score >= 40) return "text-orange-600 bg-orange-50";
  return "text-red-600 bg-red-50";
};

const getHealthIcon = (score: number) => {
  if (score >= 80) return CheckCircle;
  if (score >= 60) return Clock;
  return AlertTriangle;
};

const getRiskColor = (level: string) => {
  switch (level) {
    case "low": return "bg-green-100 text-green-800";
    case "medium": return "bg-yellow-100 text-yellow-800";
    case "high": return "bg-orange-100 text-orange-800";
    case "critical": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

// Health metric cards for individual categories
function HealthMetricCard({ title, score, icon: Icon, description }: {
  title: string;
  score: number;
  icon: any;
  description: string;
}) {
  const HealthIcon = getHealthIcon(score);
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <div className="text-2xl font-bold">{score}%</div>
          <HealthIcon className={`h-5 w-5 ${getHealthColor(score).split(' ')[0]}`} />
        </div>
        <Progress value={score} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      </CardContent>
    </Card>
  );
}

// Risk assessment card component
function RiskCard({ risk }: { risk: RiskAssessment }) {
  const impactScore = risk.impact === "high" ? 5 : risk.impact === "medium" ? 3 : 1;
  const probabilityScore = risk.probability === "high" ? 5 : risk.probability === "medium" ? 3 : 1;
  const riskScore = impactScore * probabilityScore;
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{risk.riskTitle}</CardTitle>
          <Badge className={getRiskColor(risk.impact)}>{risk.impact.toUpperCase()}</Badge>
        </div>
        <CardDescription className="text-xs">{risk.riskType}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-2">{risk.riskDescription}</p>
        <div className="flex justify-between items-center text-xs">
          <span>Probability: <Badge variant="outline">{risk.probability}</Badge></span>
          <span>Score: <Badge variant="outline">{riskScore}/25</Badge></span>
        </div>
        {risk.mitigationPlan && (
          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
            <strong>Mitigation:</strong> {risk.mitigationPlan}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Project health overview card
function ProjectHealthOverview({ project, healthMetrics }: {
  project: Project;
  healthMetrics?: ProjectHealthMetrics;
}) {
  const score = healthMetrics?.overallHealthScore || 0;
  const OverallIcon = getHealthIcon(score);
  
  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>{project.name}</span>
            </CardTitle>
            <CardDescription>{project.location}</CardDescription>
          </div>
          <Badge className={`${getHealthColor(score)} border-0`}>
            <OverallIcon className="h-4 w-4 mr-1" />
            {score}% Health
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand-teal">{project.progress}%</div>
            <div className="text-xs text-gray-500">Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{healthMetrics?.scheduleHealth || 0}%</div>
            <div className="text-xs text-gray-500">Schedule</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{healthMetrics?.budgetHealth || 0}%</div>
            <div className="text-xs text-gray-500">Budget</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{healthMetrics?.qualityHealth || 0}%</div>
            <div className="text-xs text-gray-500">Quality</div>
          </div>
        </div>
        
        {healthMetrics?.riskLevel && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Risk Level: <Badge className={getRiskColor(healthMetrics.riskLevel)}>{healthMetrics.riskLevel.toUpperCase()}</Badge>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProjectHealth() {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const queryClient = useQueryClient();

  // Fetch projects and health data
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: healthMetrics = [], isLoading: healthLoading } = useQuery<ProjectHealthMetrics[]>({
    queryKey: ["/api/project-health-metrics"],
  });

  const { data: riskAssessments = [], isLoading: risksLoading } = useQuery<RiskAssessment[]>({
    queryKey: ["/api/risk-assessments"],
  });

  // Calculate health mutation
  const calculateHealthMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/project-health-metrics/${projectId}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to calculate health metrics');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-health-metrics"] });
    },
  });

  const filteredProjects = selectedProject === "all" 
    ? projects 
    : projects.filter(p => p.id === selectedProject);

  const filteredHealthMetrics = selectedProject === "all"
    ? healthMetrics
    : healthMetrics.filter(h => h.projectId === selectedProject);

  const filteredRisks = selectedProject === "all"
    ? riskAssessments
    : riskAssessments.filter(r => r.projectId === selectedProject);

  const isLoading = projectsLoading || healthLoading || risksLoading;

  if (isLoading) {
    return (
      <div className="max-w-[1440px] mx-auto space-y-8 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto space-y-8 mt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-brand-blue">Project Health Dashboard</h1>
          <p className="text-gray-600">Monitor project health metrics and risk assessments</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => selectedProject !== "all" && calculateHealthMutation.mutate(selectedProject)}
            disabled={selectedProject === "all" || calculateHealthMutation.isPending}
            className="bg-brand-teal hover:bg-brand-teal/90"
          >
            <Target className="h-4 w-4 mr-2" />
            Calculate Health
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Health Overview</TabsTrigger>
          <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
          <TabsTrigger value="risks">Risk Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Project Health Overview Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProjects.map((project) => {
              const projectHealth = filteredHealthMetrics.find(h => h.projectId === project.id);
              return (
                <ProjectHealthCard
                  key={project.id} 
                  project={project} 
                  healthMetrics={projectHealth}
                  onCalculateHealth={(projectId) => calculateHealthMutation.mutate(projectId)}
                  isCalculating={calculateHealthMutation.isPending}
                />
              );
            })}
          </div>

          {/* Health Summary */}
          {filteredHealthMetrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Health Summary</CardTitle>
                <CardDescription>Average health scores across selected projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { key: 'overallHealthScore', label: 'Overall', icon: Target },
                    { key: 'scheduleHealth', label: 'Schedule', icon: Clock },
                    { key: 'budgetHealth', label: 'Budget', icon: DollarSign },
                    { key: 'qualityHealth', label: 'Quality', icon: CheckCircle },
                    { key: 'resourceHealth', label: 'Resources', icon: Users },
                  ].map(({ key, label, icon: Icon }) => {
                    const avg = Math.round(
                      filteredHealthMetrics.reduce((acc, h) => acc + (h[key as keyof ProjectHealthMetrics] as number || 0), 0) / 
                      filteredHealthMetrics.length
                    );
                    return (
                      <div key={key} className="text-center">
                        <Icon className="h-8 w-8 mx-auto mb-2 text-brand-teal" />
                        <div className="text-2xl font-bold">{avg}%</div>
                        <div className="text-sm text-gray-500">{label}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          {/* Detailed Health Metrics */}
          {filteredProjects.map((project) => {
            const projectHealth = filteredHealthMetrics.find(h => h.projectId === project.id);
            if (!projectHealth) return null;

            return (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle>{project.name} - Detailed Health Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <HealthMetricCard
                      title="Schedule Health"
                      score={projectHealth.scheduleHealth}
                      icon={Clock}
                      description="On-time task completion rate"
                    />
                    <HealthMetricCard
                      title="Budget Health"
                      score={projectHealth.budgetHealth}
                      icon={DollarSign}
                      description="Budget utilization efficiency"
                    />
                    <HealthMetricCard
                      title="Quality Health"
                      score={projectHealth.qualityHealth}
                      icon={CheckCircle}
                      description="Quality standards compliance"
                    />
                    <HealthMetricCard
                      title="Resource Health"
                      score={projectHealth.resourceHealth}
                      icon={Users}
                      description="Resource allocation efficiency"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          {/* Risk Management Header */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Risk Assessments</h3>
              <p className="text-gray-600">Identify and manage project risks</p>
            </div>
            <AddRiskDialog 
              projectId={selectedProject !== "all" ? selectedProject : ""}
              projects={projects}
            />
          </div>

          {/* Risk Assessment Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRisks.map((risk) => (
              <RiskCard key={risk.id} risk={risk} />
            ))}
          </div>

          {filteredRisks.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Eye className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Risk Assessments</h3>
                <p className="text-gray-500">No risks have been identified for the selected project(s).</p>
                <AddRiskDialog 
                  projectId={selectedProject !== "all" ? selectedProject : ""}
                  projects={projects}
                  trigger={
                    <Button className="mt-4 bg-brand-teal hover:bg-brand-teal/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Risk Assessment
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}