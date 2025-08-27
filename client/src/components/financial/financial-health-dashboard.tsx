import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Project, Invoice, TimeEntry } from "@shared/schema";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  CreditCard,
  FileText,
  Calculator
} from "lucide-react";

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  outstandingInvoices: number;
  overdueBills: number;
  cashFlow: number;
  budgetVariance: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
};

const getHealthColor = (value: number, type: 'profit' | 'variance' | 'cash') => {
  switch (type) {
    case 'profit':
      if (value >= 20) return 'text-green-600';
      if (value >= 10) return 'text-yellow-600';
      return 'text-red-600';
    case 'variance':
      if (Math.abs(value) <= 5) return 'text-green-600';
      if (Math.abs(value) <= 15) return 'text-yellow-600';
      return 'text-red-600';
    case 'cash':
      if (value > 0) return 'text-green-600';
      if (value > -10000) return 'text-yellow-600';
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

export default function FinancialHealthDashboard() {
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: timeEntries = [], isLoading: timeEntriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries"],
  });

  // Calculate financial summary
  const calculateFinancialSummary = (): FinancialSummary => {
    // Revenue from completed/paid invoices
    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    // Expenses from actual project costs
    const totalExpenses = projects.reduce((sum, project) => sum + (project.actualCost || 0), 0);

    // Net profit
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Outstanding invoices
    const outstandingInvoices = invoices
      .filter(inv => inv.status === 'sent' || inv.status === 'draft')
      .reduce((sum, inv) => sum + inv.total, 0);

    // Overdue invoices
    const today = new Date();
    const overdueBills = invoices
      .filter(inv => inv.status === 'sent' && new Date(inv.dueDate) < today)
      .reduce((sum, inv) => sum + inv.total, 0);

    // Cash flow (simple calculation)
    const cashFlow = totalRevenue - totalExpenses + outstandingInvoices;

    // Budget variance across all projects
    const totalBudget = projects.reduce((sum, project) => sum + (project.budget || 0), 0);
    const budgetVariance = totalBudget > 0 ? ((totalExpenses - totalBudget) / totalBudget) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      outstandingInvoices,
      overdueBills,
      cashFlow,
      budgetVariance
    };
  };

  const isLoading = projectsLoading || invoicesLoading || timeEntriesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const summary = calculateFinancialSummary();

  return (
    <div className="space-y-6" data-testid="financial-health-dashboard">
      {/* Financial Overview Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brand-blue">Financial Health Dashboard</h2>
        <Badge className="bg-brand-teal/10 text-brand-teal border-brand-teal/20">
          Real-time Monitoring
        </Badge>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-green-800" data-testid="total-revenue">
                {formatCurrency(summary.totalRevenue)}
              </p>
              <p className="text-sm text-green-600 mt-1">
                From {invoices.filter(inv => inv.status === 'paid').length} paid invoices
              </p>
            </div>
            <DollarSign className="text-green-600" size={32} />
          </div>
        </Card>

        {/* Total Expenses */}
        <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Total Expenses</p>
              <p className="text-2xl font-bold text-red-800" data-testid="total-expenses">
                {formatCurrency(summary.totalExpenses)}
              </p>
              <p className="text-sm text-red-600 mt-1">
                Across {projects.length} projects
              </p>
            </div>
            <CreditCard className="text-red-600" size={32} />
          </div>
        </Card>

        {/* Net Profit */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Net Profit</p>
              <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-blue-800' : 'text-red-800'}`} data-testid="net-profit">
                {formatCurrency(summary.netProfit)}
              </p>
              <p className={`text-sm mt-1 font-medium ${getHealthColor(summary.profitMargin, 'profit')}`}>
                {summary.profitMargin.toFixed(1)}% margin
              </p>
            </div>
            {summary.netProfit >= 0 ? (
              <TrendingUp className="text-blue-600" size={32} />
            ) : (
              <TrendingDown className="text-red-600" size={32} />
            )}
          </div>
        </Card>

        {/* Cash Flow */}
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Cash Flow</p>
              <p className={`text-2xl font-bold ${summary.cashFlow >= 0 ? 'text-purple-800' : 'text-red-800'}`} data-testid="cash-flow">
                {formatCurrency(summary.cashFlow)}
              </p>
              <p className="text-sm text-purple-600 mt-1">
                {summary.outstandingInvoices > 0 ? 'Including outstanding' : 'Current position'}
              </p>
            </div>
            <Calculator className="text-purple-600" size={32} />
          </div>
        </Card>
      </div>

      {/* Detailed Financial Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outstanding Invoices */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-brand-blue mb-4">Outstanding Invoices</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Outstanding</span>
              <span className="text-xl font-bold text-yellow-600" data-testid="outstanding-invoices">
                {formatCurrency(summary.outstandingInvoices)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Overdue Amount</span>
              <span className={`text-xl font-bold ${summary.overdueBills > 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="overdue-bills">
                {formatCurrency(summary.overdueBills)}
              </span>
            </div>
            {summary.overdueBills > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="text-red-500" size={20} />
                <span className="text-red-700 font-medium">
                  Action Required: {invoices.filter(inv => inv.status === 'sent' && new Date(inv.dueDate) < new Date()).length} overdue invoices
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Budget Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-brand-blue mb-4">Budget Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Budget Variance</span>
              <span className={`text-xl font-bold ${getHealthColor(summary.budgetVariance, 'variance')}`} data-testid="budget-variance">
                {summary.budgetVariance > 0 ? '+' : ''}{summary.budgetVariance.toFixed(1)}%
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Budgeted</span>
                <span>{formatCurrency(projects.reduce((sum, p) => sum + (p.budget || 0), 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Actual</span>
                <span>{formatCurrency(summary.totalExpenses)}</span>
              </div>
              <Progress 
                value={Math.min(100, (summary.totalExpenses / projects.reduce((sum, p) => sum + (p.budget || 0), 0)) * 100)} 
                className="h-3"
              />
            </div>
            {Math.abs(summary.budgetVariance) > 15 && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertTriangle className="text-yellow-500" size={20} />
                <span className="text-yellow-700 font-medium">
                  {summary.budgetVariance > 0 ? 'Over' : 'Under'} budget by {Math.abs(summary.budgetVariance).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Project Financial Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-brand-blue mb-4">Project Financial Breakdown</h3>
        <div className="space-y-4">
          {projects.filter(p => p.budget || p.actualCost).slice(0, 5).map((project) => {
            const budget = project.budget || 0;
            const actual = project.actualCost || 0;
            const variance = budget > 0 ? ((actual - budget) / budget) * 100 : 0;
            
            return (
              <div key={project.id} className="border border-gray-200 rounded-lg p-4" data-testid={`project-financial-${project.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-brand-blue">{project.name}</h4>
                  <Badge className={variance > 10 ? 'bg-red-100 text-red-800' : variance < -10 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {variance > 0 ? '+' : ''}{variance.toFixed(1)}% variance
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Budget</p>
                    <p className="font-semibold">{formatCurrency(budget)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Actual</p>
                    <p className="font-semibold">{formatCurrency(actual)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Remaining</p>
                    <p className={`font-semibold ${budget - actual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(budget - actual)}
                    </p>
                  </div>
                </div>
                {budget > 0 && (
                  <div className="mt-2">
                    <Progress value={Math.min(100, (actual / budget) * 100)} className="h-2" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}