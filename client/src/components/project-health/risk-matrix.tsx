import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RiskAssessment } from "@shared/schema";

interface RiskMatrixProps {
  risks: RiskAssessment[];
}

export default function RiskMatrix({ risks }: RiskMatrixProps) {
  // Risk matrix configuration (5x5 grid)
  const probabilityLevels = ["Very Low", "Low", "Medium", "High", "Very High"];
  const impactLevels = ["Very Low", "Low", "Medium", "High", "Very High"];
  
  // Color mapping for risk levels
  const getRiskColor = (probability: number, impact: number) => {
    const score = probability * impact;
    if (score >= 20) return "bg-red-600";
    if (score >= 15) return "bg-red-400";
    if (score >= 10) return "bg-orange-400";
    if (score >= 6) return "bg-yellow-400";
    return "bg-green-400";
  };
  
  // Get risk count for each cell
  const getRiskCount = (probIndex: number, impactIndex: number) => {
    const probLevel = probabilityLevels[probIndex].toLowerCase().replace("very ", "");
    const impactLevel = impactLevels[impactIndex].toLowerCase().replace("very ", "");
    
    return risks.filter(risk => {
      const riskProb = risk.probability.toLowerCase();
      const riskImpact = risk.impact.toLowerCase();
      return riskProb === probLevel && riskImpact === impactLevel;
    }).length;
  };
  
  // Get risks for tooltip
  const getRisksForCell = (probIndex: number, impactIndex: number) => {
    const probLevel = probabilityLevels[probIndex].toLowerCase().replace("very ", "");
    const impactLevel = impactLevels[impactIndex].toLowerCase().replace("very ", "");
    
    return risks.filter(risk => {
      const riskProb = risk.probability.toLowerCase();
      const riskImpact = risk.impact.toLowerCase();
      return riskProb === probLevel && riskImpact === impactLevel;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Assessment Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-1 text-xs">
          {/* Headers */}
          <div></div>
          {impactLevels.map((level, index) => (
            <div key={index} className="text-center font-medium p-2 bg-gray-100 rounded">
              {level}
            </div>
          ))}
          
          {/* Matrix cells */}
          {probabilityLevels.map((probLevel, probIndex) => (
            <div key={probIndex} className="contents">
              <div className="flex items-center justify-center font-medium p-2 bg-gray-100 rounded">
                {probLevel}
              </div>
              {impactLevels.map((impactLevel, impactIndex) => {
                const riskCount = getRiskCount(probIndex, impactIndex);
                const cellRisks = getRisksForCell(probIndex, impactIndex);
                const colorClass = getRiskColor(probIndex + 1, impactIndex + 1);
                
                return (
                  <div
                    key={impactIndex}
                    className={`relative p-2 rounded text-white text-center font-medium ${colorClass} 
                      hover:opacity-80 transition-opacity cursor-pointer group`}
                    title={cellRisks.map(r => r.riskTitle).join(", ")}
                  >
                    {riskCount > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-white text-black"
                      >
                        {riskCount}
                      </Badge>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {riskCount}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-400 rounded"></div>
            <span>Low Risk</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-400 rounded"></div>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-400 rounded"></div>
            <span>High Risk</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-400 rounded"></div>
            <span>Critical Risk</span>
          </div>
        </div>
        
        {/* Risk summary */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {risks.filter(r => r.riskScore <= 6).length}
            </div>
            <div className="text-xs text-gray-500">Low Risk</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {risks.filter(r => r.riskScore >= 7 && r.riskScore <= 12).length}
            </div>
            <div className="text-xs text-gray-500">Medium Risk</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {risks.filter(r => r.riskScore >= 13 && r.riskScore <= 19).length}
            </div>
            <div className="text-xs text-gray-500">High Risk</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {risks.filter(r => r.riskScore >= 20).length}
            </div>
            <div className="text-xs text-gray-500">Critical Risk</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}