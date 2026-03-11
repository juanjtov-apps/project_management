import { useState } from "react";
import { useTranslation } from "react-i18next";
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

// Feature flag: Risk assessments backend is not yet implemented
// Set to true when /api/v1/risk-assessments endpoint is available
const RISK_ASSESSMENTS_ENABLED = false;

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
  const { t } = useTranslation('admin');
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
          <span>{t('projectHealth.probability')}: <Badge variant="outline">{risk.probability}</Badge></span>
          <span>{t('projectHealth.score')}: <Badge variant="outline">{riskScore}/25</Badge></span>
        </div>
        {risk.mitigationPlan && (
          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
            <strong>{t('projectHealth.mitigation')}:</strong> {risk.mitigationPlan}
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
  const { t } = useTranslation('admin');
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
            <div className="text-xs text-gray-500">{t('projectHealth.progress')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{healthMetrics?.scheduleHealth || 0}%</div>
            <div className="text-xs text-gray-500">{t('projectHealth.schedule')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{healthMetrics?.budgetHealth || 0}%</div>
            <div className="text-xs text-gray-500">{t('projectHealth.budget')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{healthMetrics?.qualityHealth || 0}%</div>
            <div className="text-xs text-gray-500">{t('projectHealth.quality')}</div>
          </div>
        </div>
        
        {healthMetrics?.riskLevel && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('projectHealth.riskLevel')}: <Badge className={getRiskColor(healthMetrics.riskLevel)}>{healthMetrics.riskLevel.toUpperCase()}</Badge>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProjectHealth() {
  const { t } = useTranslation('admin');
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
          <h1 className="text-3xl font-bold text-brand-blue">{t('projectHealth.title')}</h1>
          <p className="text-gray-600">{t('projectHealth.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('projectHealth.allProjects')}</SelectItem>
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
            {t('projectHealth.calculateHealth')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t('projectHealth.healthOverview')}</TabsTrigger>
          <TabsTrigger value="metrics">{t('projectHealth.detailedMetrics')}</TabsTrigger>
          <TabsTrigger value="risks">{t('projectHealth.riskAssessment')}</TabsTrigger>
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
                <CardTitle>{t('projectHealth.healthSummary')}</CardTitle>
                <CardDescription>{t('projectHealth.healthSummaryDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { key: 'overallHealthScore', label: t('projectHealth.overall'), icon: Target },
                    { key: 'scheduleHealth', label: t('projectHealth.schedule'), icon: Clock },
                    { key: 'budgetHealth', label: t('projectHealth.budget'), icon: DollarSign },
                    { key: 'qualityHealth', label: t('projectHealth.quality'), icon: CheckCircle },
                    { key: 'resourceHealth', label: t('projectHealth.resources'), icon: Users },
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
                      title={t('projectHealth.scheduleHealth')}
                      score={projectHealth.scheduleHealth}
                      icon={Clock}
                      description={t('projectHealth.scheduleHealthDesc')}
                    />
                    <HealthMetricCard
                      title={t('projectHealth.budgetHealth')}
                      score={projectHealth.budgetHealth}
                      icon={DollarSign}
                      description={t('projectHealth.budgetHealthDesc')}
                    />
                    <HealthMetricCard
                      title={t('projectHealth.qualityHealth')}
                      score={projectHealth.qualityHealth}
                      icon={CheckCircle}
                      description={t('projectHealth.qualityHealthDesc')}
                    />
                    <HealthMetricCard
                      title={t('projectHealth.resourceHealth')}
                      score={projectHealth.resourceHealth}
                      icon={Users}
                      description={t('projectHealth.resourceHealthDesc')}
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
              <h3 className="text-lg font-semibold">{t('projectHealth.riskAssessments')}</h3>
              <p className="text-gray-600">{t('projectHealth.riskAssessmentsDesc')}</p>
            </div>
            {RISK_ASSESSMENTS_ENABLED && (
              <AddRiskDialog
                projectId={selectedProject !== "all" ? selectedProject : ""}
                projects={projects}
              />
            )}
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('projectHealth.noRisks')}</h3>
                <p className="text-gray-500">
                  {RISK_ASSESSMENTS_ENABLED
                    ? t('projectHealth.noRisksDesc')
                    : t('projectHealth.riskComingSoon')}
                </p>
                {RISK_ASSESSMENTS_ENABLED && (
                  <AddRiskDialog
                    projectId={selectedProject !== "all" ? selectedProject : ""}
                    projects={projects}
                    trigger={
                      <Button className="mt-4 bg-brand-teal hover:bg-brand-teal/90">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('projectHealth.addFirstRisk')}
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}