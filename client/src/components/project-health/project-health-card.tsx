import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building, Clock, DollarSign, CheckCircle, Users, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import HealthScoreRing from "./health-score-ring";
import type { Project, ProjectHealthMetrics } from "@shared/schema";

interface ProjectHealthCardProps {
  project: Project;
  healthMetrics?: ProjectHealthMetrics;
  onCalculateHealth?: (projectId: string) => void;
  isCalculating?: boolean;
}

export default function ProjectHealthCard({
  project,
  healthMetrics,
  onCalculateHealth,
  isCalculating = false
}: ProjectHealthCardProps) {
  const overallScore = healthMetrics?.overallHealthScore || 0;
  
  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
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

  const healthItems = [
    {
      label: "Schedule",
      score: healthMetrics?.scheduleHealth || 0,
      icon: Clock,
      description: "On-time delivery"
    },
    {
      label: "Budget",
      score: healthMetrics?.budgetHealth || 0,
      icon: DollarSign,
      description: "Cost efficiency"
    },
    {
      label: "Quality",
      score: healthMetrics?.qualityHealth || 0,
      icon: CheckCircle,
      description: "Quality standards"
    },
    {
      label: "Resources",
      score: healthMetrics?.resourceHealth || 0,
      icon: Users,
      description: "Resource allocation"
    }
  ];

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building className="h-6 w-6 text-brand-teal" />
            <div>
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <p className="text-sm text-gray-500">{project.location}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <HealthScoreRing score={overallScore} size="md" />
            {onCalculateHealth && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCalculateHealth(project.id)}
                disabled={isCalculating}
                className="text-xs"
              >
                {isCalculating ? "Calculating..." : "Refresh"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Project Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span>Project Progress</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        {/* Health Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {healthItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="text-center p-3 bg-gray-50 rounded-lg">
                <Icon className="h-5 w-5 mx-auto mb-1 text-brand-teal" />
                <div className={`text-lg font-bold ${getHealthColor(item.score)}`}>
                  {item.score}%
                </div>
                <div className="text-xs text-gray-500">{item.label}</div>
              </div>
            );
          })}
        </div>

        {/* Risk Level Alert */}
        {healthMetrics?.riskLevel && (
          <Alert className={overallScore < 60 ? "border-orange-200 bg-orange-50" : ""}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Risk Level:</span>
              <Badge className={getRiskColor(healthMetrics.riskLevel)}>
                {healthMetrics.riskLevel.toUpperCase()}
              </Badge>
            </AlertDescription>
          </Alert>
        )}

        {/* Health Trends (if available) */}
        {healthMetrics && (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
            <span>Last Updated: {new Date(healthMetrics.calculatedAt).toLocaleDateString()}</span>
            <div className="flex items-center space-x-1">
              {overallScore >= 70 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={overallScore >= 70 ? "text-green-600" : "text-red-600"}>
                {overallScore >= 70 ? "Improving" : "Declining"}
              </span>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!healthMetrics && (
          <div className="text-center py-4 text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No health data available</p>
            {onCalculateHealth && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCalculateHealth(project.id)}
                disabled={isCalculating}
                className="mt-2"
              >
                Calculate Health Score
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}