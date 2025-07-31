import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoleManagement } from '@/components/rbac/RoleManagement';
import { 
  Shield, 
  Building2, 
  Users, 
  Settings,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';

interface Company {
  id: number;
  name: string;
  domain: string;
  status: 'active' | 'suspended' | 'pending';
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface RBACStats {
  totalCompanies: number;
  activeUsers: number;
  totalRoles: number;
  recentActivity: number;
}

export function RBACAdmin() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch companies (platform admin view)
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['/rbac/companies'],
  });

  // Mock stats for now - in real implementation, these would come from API
  const stats: RBACStats = {
    totalCompanies: companies.length,
    activeUsers: 0, // Would be calculated from API
    totalRoles: 0, // Would be calculated from API
    recentActivity: 0, // Would be calculated from API
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900';
      case 'suspended':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">RBAC Administration</h1>
          <p className="text-muted-foreground">
            Manage companies, roles, and user permissions across the platform
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Shield className="h-4 w-4 mr-2" />
          Platform Admin
        </Badge>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">
              Across the platform
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              +2% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRoles}</div>
            <p className="text-xs text-muted-foreground">
              Across all companies
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity}</div>
            <p className="text-xs text-muted-foreground">
              In the last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="roles">Role Management</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Companies Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Companies
                </CardTitle>
                <CardDescription>
                  Recent companies and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {companiesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : companies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No companies found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {companies.slice(0, 5).map((company: Company) => (
                      <div key={company.id} className="flex items-center justify-between p-3 rounded border">
                        <div>
                          <h4 className="font-medium">{company.name}</h4>
                          <p className="text-sm text-muted-foreground">{company.domain}</p>
                        </div>
                        <Badge className={getStatusColor(company.status)}>
                          {company.status}
                        </Badge>
                      </div>
                    ))}
                    {companies.length > 5 && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setActiveTab('companies')}
                      >
                        View All Companies
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common administrative tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Building2 className="h-4 w-4 mr-2" />
                  Create New Company
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Platform Users
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Review Role Templates
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Export Audit Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                All Companies
              </CardTitle>
              <CardDescription>
                Manage all companies on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {companiesLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No companies found
                </div>
              ) : (
                <div className="space-y-3">
                  {companies.map((company: Company) => (
                    <div key={company.id} className="flex items-center justify-between p-4 rounded border">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium">{company.name}</h4>
                            <p className="text-sm text-muted-foreground">{company.domain}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(company.status)}>
                          {company.status}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(company.created_at).toLocaleDateString()}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCompanyId(company.id);
                            setActiveTab('roles');
                          }}
                        >
                          Manage Roles
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          {/* Company Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Company</CardTitle>
              <CardDescription>
                Choose a company to manage roles and users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedCompanyId?.toString() || ''}
                onValueChange={(value) => setSelectedCompanyId(parseInt(value))}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company: Company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Role Management Component */}
          {selectedCompanyId && (
            <RoleManagement companyId={selectedCompanyId} />
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Audit Logs
              </CardTitle>
              <CardDescription>
                Platform-wide audit trail and security events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Audit log functionality will be implemented here</p>
                <p className="text-sm">This will show security events, role changes, and user activities</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default RBACAdmin;