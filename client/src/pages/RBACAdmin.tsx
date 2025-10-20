import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Users, Shield, Building, UserCheck, Settings, Plus, Edit, Trash2, Eye, Key, AlertCircle, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  resource_type: string;
  action: string;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  company_id: string;
  permissions: string[];
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

interface Company {
  id: string;
  name: string;
  domain?: string;
  status: 'active' | 'suspended' | 'pending';
  settings: {
    type: string;
    subscription_tier: string;
    [key: string]: any;
  };
  created_at: string;
  is_active: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_id: string;
  companyId?: string; // Alias for compatibility
  role_id?: string;
  role?: string; // Backend returns role as string (admin, manager, etc.)
  is_active: boolean;
  isActive?: boolean; // Alias for compatibility
  created_at: string;
  last_login: string;
  last_login_at?: string; // Alias for compatibility
  role_name?: string;
  company_name?: string;
  username?: string;
  password?: string; // For edit form only
}

export default function RBACAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('users');

  // Get current user for RBAC checks
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    retry: false
  });

  // Data fetching
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ['/api/rbac/permissions'],
  });

  // Three-tier access control
  const isRootAdmin = currentUser?.email?.includes('chacjjlegacy') || currentUser?.email === 'admin@proesphere.com';
  const isCompanyAdmin = currentUser?.role === 'admin' || currentUser?.email?.includes('admin');
  const hasRBACAccess = isRootAdmin || isCompanyAdmin;

  const { data: roles = [], isLoading: rolesLoading, error: rolesError } = useQuery<Role[]>({
    queryKey: ['/api/rbac/roles'],
    enabled: hasRBACAccess,
  });

  const { data: companies = [], isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: hasRBACAccess,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<UserProfile[]>({
    queryKey: ['/api/rbac/users'],
    enabled: hasRBACAccess,
  });
  
  if (!hasRBACAccess) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground">RBAC Administration requires admin privileges.</p>
          <p className="text-sm text-muted-foreground mt-2">Contact your system administrator for access.</p>
        </div>
      </div>
    );
  }

  // Filter data based on admin level with field name compatibility
  const currentUserCompanyId = currentUser?.company_id || currentUser?.companyId;
  const filteredCompanies = isRootAdmin ? companies : companies.filter(c => c.id === currentUserCompanyId);
  const filteredUsers = isRootAdmin ? users : users.filter(u => {
    const userCompanyId = u.company_id || u.companyId;
    return userCompanyId === currentUserCompanyId;
  });
  const filteredRoles = isRootAdmin ? roles : roles.filter(r => !r.company_id || r.company_id === currentUserCompanyId);

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (userData: any) => apiRequest('/api/rbac/users', { method: 'POST', body: userData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/users'] });
      toast({ title: 'Success', description: 'User created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // updateUserMutation moved inside UserManagement component where state is available

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/rbac/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/users'] });
      toast({ title: 'Success', description: 'User deleted successfully' });
    },
    onError: (error: any) => {
      console.error('Delete user error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to delete user', variant: 'destructive' });
    }
  });



  const createRoleMutation = useMutation({
    mutationFn: (roleData: any) => apiRequest('/api/rbac/roles', { method: 'POST', body: roleData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/roles'] });
      toast({ title: 'Success', description: 'Role created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/rbac/roles/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/roles'] });
      toast({ title: 'Success', description: 'Role updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/rbac/roles/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/roles'] });
      toast({ title: 'Success', description: 'Role deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const createCompanyMutation = useMutation({
    mutationFn: (companyData: any) => apiRequest('/api/companies', { method: 'POST', body: companyData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      toast({ title: 'Success', description: 'Company created successfully' });
    },
    onError: (error: any) => {
      console.error('Company creation error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create company', variant: 'destructive' });
    }
  });

  // Move updateCompanyMutation to inside CompanyManagement component where state is defined

  // Component functions
  const UserManagement = () => {
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    // Initialize with all companies expanded - will be populated when usersByCompany is computed
    const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
    const [newUser, setNewUser] = useState({
      email: '',
      first_name: '',
      last_name: '',
      company_id: '',
      role_id: '',
      password: ''
    });

    // Toggle user active status
    const toggleUserStatus = useMutation({
      mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
        const endpoint = isActive 
          ? `/api/company-admin/users/${userId}/activate`
          : `/api/company-admin/users/${userId}/suspend`;
        return apiRequest(endpoint, {
          method: 'PUT'
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/rbac/users'] });
        toast({ title: 'Success', description: 'User status updated successfully' });
      },
      onError: (error: any) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    });

    // Update user mutation - now inside component with access to state
    const updateUserMutation = useMutation({
      mutationFn: ({ id, data }: { id: string; data: any }) => {
        // Map role - the backend expects role string, not role_id
        const role = data.role || 
          (data.role_id === '1' ? 'admin' : 
           data.role_id === '2' ? 'project_manager' : 
           data.role_id === '3' ? 'office_manager' : 
           data.role_id === '4' ? 'subcontractor' : 
           data.role_id === '5' ? 'client' : 'crew');
        
        return apiRequest(`/api/company-admin/users/${id}/role`, { 
          method: 'PUT', 
          body: { user_id: id, role } 
        });
      },
      onSuccess: async () => {
        console.log('✅ Mutation succeeded - refetching users');
        toast({ title: 'Success', description: 'User role updated successfully' });
        // Refetch to get latest data - dialog already closed by button handler
        await queryClient.refetchQueries({ queryKey: ['/api/rbac/users'] });
        console.log('✅ Refetch complete');
        // Dialog state managed by button click handler, not here
      },
      onError: (error: any) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        // On error, reopen dialog with same user so they can try again
        setIsEditDialogOpen(true);
      }
    });

    // Group filtered users by company, including companies with no users
    const usersByCompany = React.useMemo(() => {
      const grouped: { [key: string]: UserProfile[] } = {};
      
      // First, initialize all companies with empty arrays
      filteredCompanies.forEach((company: Company) => {
        grouped[company.name] = [];
      });
      
      // Then add users to their respective companies with proper company name mapping
      filteredUsers.forEach((user: UserProfile) => {
        const userCompanyId = user.company_id || user.companyId;
        const company = companies.find(c => c.id === userCompanyId || c.id.toString() === userCompanyId?.toString());
        const companyKey = company?.name || user.company_name || 'Unassigned';
        
        if (!grouped[companyKey]) {
          grouped[companyKey] = [];
        }
        grouped[companyKey].push(user);
      });
      
      return grouped;
    }, [filteredUsers, filteredCompanies, companies]);

    // Auto-expand all companies on first load and preserve state on refetch
    React.useEffect(() => {
      if (Object.keys(usersByCompany).length > 0 && expandedCompanies.size === 0) {
        // Initialize all companies as expanded only if expandedCompanies is empty
        setExpandedCompanies(new Set(Object.keys(usersByCompany)));
      }
    }, [usersByCompany]);

    // Monitor dialog state changes for debugging
    React.useEffect(() => {
      console.log('🔔 Dialog state changed:', {
        isEditDialogOpen,
        hasEditingUser: !!editingUser,
        editingUserId: editingUser?.id
      });
    }, [isEditDialogOpen, editingUser]);

    const toggleCompanyExpansion = (companyName: string) => {
      const newExpanded = new Set(expandedCompanies);
      if (newExpanded.has(companyName)) {
        newExpanded.delete(companyName);
      } else {
        newExpanded.add(companyName);
      }
      setExpandedCompanies(newExpanded);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-semibold">User Management</h3>
            <p className="text-muted-foreground">Manage users across all companies</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                document.getElementById('create-user-button')?.click();
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={newUser.first_name}
                      onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={newUser.last_name}
                      onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
                {isRootAdmin && (
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Select value={newUser.company_id} onValueChange={(value) => setNewUser({ ...newUser, company_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company: Company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {!isRootAdmin && (
                  <div>
                    <Label>Company</Label>
                    <div className="p-2 bg-gray-50 rounded border text-sm text-gray-600">
                      {(() => {
                        // Display current user's company for non-root admins
                        
                        if (companiesLoading) return 'Loading company...';
                        if (!companies.length) return 'No companies available';
                        
                        // Try both company_id and companyId for compatibility
                        const userCompanyId = currentUser?.company_id || currentUser?.companyId;
                        const matchedCompany = companies.find(c => c.id.toString() === userCompanyId?.toString());
                        return matchedCompany?.name || `Company ID ${userCompanyId} not found`;
                      })()}
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUser.role_id} onValueChange={(value) => setNewUser({ ...newUser, role_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        // Removed debug logging
                        
                        if (rolesLoading) {
                          return <SelectItem value="loading" disabled>Loading roles...</SelectItem>;
                        }
                        
                        if (!roles || roles.length === 0) {
                          return <SelectItem value="none" disabled>No roles available</SelectItem>;
                        }
                        
                        const filteredRoles = roles.filter((role: Role) => {
                          // If no company selected, show all roles
                          if (!newUser.company_id || newUser.company_id === '') {
                            return true;
                          }
                          
                          // Show platform roles (company_id 0) and treat all other roles as templates available to any company
                          const isPlatformRole = role.company_id === '0';
                          const isCompanyRole = role.company_id === '1'; // These are role templates
                            // Platform roles and company role templates are available to all companies
                          return isPlatformRole || isCompanyRole || role.is_template;
                        });
                        
                        if (filteredRoles.length === 0) {
                          return <SelectItem value="none" disabled>No roles for selected company</SelectItem>;
                        }
                        
                        return filteredRoles
                          .filter((role: Role) => {
                            // Only root admin can assign Platform Administrator role
                            if (role.name === 'Platform Administrator' && !isRootAdmin) {
                              return false;
                            }
                            return true;
                          })
                          .map((role: Role) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {role.name} {role.company_id === '0' ? '(Platform)' : '(Standard)'}
                            </SelectItem>
                          ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </form>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  id="create-user-button"
                  onClick={() => {
                    // Auto-assign company for non-root admins - ensure it's the actual company ID, not '0'
                    const userCompanyId = currentUser?.company_id || currentUser?.companyId;
                    const effectiveCompanyId = isRootAdmin ? newUser.company_id : userCompanyId?.toString();
                    
                    // Removed debug logging
                    
                    // Validate required fields (company_id is auto-assigned for non-root admins)
                    if (!newUser.email || !newUser.first_name || !newUser.last_name || !effectiveCompanyId || !newUser.role_id) {
                      const missingFields = [];
                      if (!newUser.email) missingFields.push('Email');
                      if (!newUser.first_name) missingFields.push('First Name');
                      if (!newUser.last_name) missingFields.push('Last Name');
                      if (!effectiveCompanyId) missingFields.push('Company');
                      if (!newUser.role_id) missingFields.push('Role');
                      
                      toast({ 
                        title: 'Error', 
                        description: `Please fill in: ${missingFields.join(', ')}`, 
                        variant: 'destructive' 
                      });
                      return;
                    }
                    
                    // Map frontend fields to backend expected format
                    const userPayload = {
                      email: newUser.email,
                      username: newUser.email, // Use email as username
                      name: `${newUser.first_name} ${newUser.last_name}`.trim(), // Combine first and last name
                      first_name: newUser.first_name,
                      last_name: newUser.last_name,
                      company_id: effectiveCompanyId,
                      role_id: newUser.role_id,
                      password: newUser.password || 'defaultpassword123' // Ensure password is included
                    };
                    
                    // Creating user with validated data
                    createUserMutation.mutate(userPayload);
                    setIsCreateDialogOpen(false);
                    setNewUser({ email: '', first_name: '', last_name: '', company_id: '', role_id: '', password: '' });
                  }}
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog 
            open={isEditDialogOpen}
          >
            <DialogContent className="max-w-md" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_first_name">First Name</Label>
                    <Input
                      id="edit_first_name"
                      value={editingUser?.first_name || ''}
                      onChange={(e) => setEditingUser(prev => prev ? {...prev, first_name: e.target.value} : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_last_name">Last Name</Label>
                    <Input
                      id="edit_last_name"
                      value={editingUser?.last_name || ''}
                      onChange={(e) => setEditingUser(prev => prev ? {...prev, last_name: e.target.value} : null)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit_email">Email</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={editingUser?.email || ''}
                    onChange={(e) => setEditingUser(prev => prev ? {...prev, email: e.target.value} : null)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_company">Company</Label>
                  <Select 
                    value={editingUser?.company_id?.toString() || ''} 
                    onValueChange={(value) => setEditingUser(prev => prev ? {...prev, company_id: value} : null)}
                    disabled={true}
                  >
                    <SelectTrigger className="opacity-60">
                      <SelectValue placeholder="Company (read-only)" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCompanies.map((company: Company) => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Users cannot change companies</p>
                </div>
                <div>
                  <Label htmlFor="edit_password">New Password (Optional)</Label>
                  <Input
                    id="edit_password"
                    type="password"
                    placeholder="Leave empty to keep current password"
                    value={editingUser?.password || ''}
                    onChange={(e) => setEditingUser(prev => prev ? {...prev, password: e.target.value} : null)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Only change if user needs a new password</p>
                </div>
                <div>
                  <Label htmlFor="edit_role">Role</Label>
                  <Select 
                    value={editingUser?.role_id?.toString() || ''} 
                    onValueChange={(value) => setEditingUser(prev => prev ? {...prev, role_id: value} : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles && roles.length > 0 ? (
                        roles
                          .filter((role: Role) => {
                            // Show platform roles and all company role templates
                            const isPlatformRole = role.company_id === '0';
                            const isCompanyTemplate = role.company_id === '1';
                            return isPlatformRole || isCompanyTemplate || role.is_template;
                          })
                          .map((role: Role) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {role.name} {role.company_id === '0' ? '(Platform)' : '(Standard)'}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="none" disabled>No roles available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_active"
                    checked={editingUser?.is_active || false}
                    onCheckedChange={(checked) => setEditingUser(prev => prev ? {...prev, is_active: checked} : null)}
                  />
                  <Label htmlFor="edit_is_active">Active User</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingUser(null);
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (editingUser) {
                      console.log('✅ Update User clicked - closing dialog immediately');
                      // Close dialog IMMEDIATELY before mutation to avoid state conflicts
                      setIsEditDialogOpen(false);
                      
                      // Map fields properly for backend
                      const updatePayload = {
                        email: editingUser.email,
                        username: editingUser.email, // Use email as username
                        name: `${editingUser.first_name || ''} ${editingUser.last_name || ''}`.trim(),
                        first_name: editingUser.first_name,
                        last_name: editingUser.last_name,
                        company_id: editingUser.company_id,
                        role_id: editingUser.role_id,
                        is_active: editingUser.is_active,
                        password: editingUser.password // Include password if provided
                      };
                      
                      updateUserMutation.mutate({
                        id: editingUser.id, 
                        data: updatePayload
                      });
                      
                      // Clear editing state AFTER mutation is submitted
                      setEditingUser(null);
                    }
                  }}
                  disabled={updateUserMutation.isPending || !editingUser?.email?.trim()}
                >
                  {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {usersLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">Loading users...</div>
              </CardContent>
            </Card>
          ) : users && Array.isArray(users) && Object.keys(usersByCompany).length > 0 ? (
            // For company admins, show a flat list. For root admins, show collapsible by company
            isRootAdmin ? (
              // Root admin view: collapsible companies
              Object.entries(usersByCompany).map(([companyName, companyUsers]) => (
                <Card key={companyName} className="overflow-hidden">
                  <Collapsible
                    open={expandedCompanies.has(companyName)}
                    onOpenChange={() => toggleCompanyExpansion(companyName)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center">
                              {expandedCompanies.has(companyName) ? (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <Building className="w-5 h-5 text-primary" />
                            <div>
                              <CardTitle className="text-lg">{companyName}</CardTitle>
                              <CardDescription>
                                {companyUsers.length} user{companyUsers.length !== 1 ? 's' : ''}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline">{companyUsers.length}</Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-0">
                      <div className="divide-y">
                        {companyUsers.map((user: UserProfile) => (
                          <div key={user.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">
                                  {user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username}
                                </div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                <div className="flex items-center space-x-2 mt-1">
                                  {user.role_name && (
                                    <Badge variant="outline" className="text-xs">
                                      {user.role_name}
                                    </Badge>
                                  )}
                                  <Badge variant={user.is_active || user.isActive ? 'default' : 'destructive'} className="text-xs">
                                    {user.is_active || user.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const currentStatus = user.is_active || user.isActive;
                                  toggleUserStatus.mutate({
                                    userId: user.id,
                                    isActive: !currentStatus
                                  });
                                }}
                                disabled={toggleUserStatus.isPending}
                                className="flex items-center space-x-1"
                              >
                                {user.is_active || user.isActive ? (
                                  <ToggleRight className="w-4 h-4 text-green-600" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                                )}
                                <span className="text-xs">
                                  {toggleUserStatus.isPending ? 'Updating...' : (user.is_active || user.isActive ? 'Deactivate' : 'Activate')}
                                </span>
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                type="button"
                                data-testid={`button-edit-${user.id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  
                                  // Debug logging
                                  console.log('🔍 Edit button clicked for user:', {
                                    id: user.id,
                                    email: user.email,
                                    role: user.role,
                                    role_id: user.role_id
                                  });
                                  
                                  // Properly map user data for editing, parsing name into first/last
                                  const nameParts = (user.name || '').split(' ');
                                  // Map role to role_id with complete mapping
                                  let roleId = user.role_id?.toString();
                                  if (!roleId && user.role) {
                                    const roleMap: Record<string, string> = {
                                      'admin': '1',
                                      'project_manager': '2',
                                      'office_manager': '3',
                                      'subcontractor': '4',
                                      'client': '5',
                                      'manager': '2', // Legacy mapping
                                      'crew': '3' // Legacy mapping
                                    };
                                    roleId = roleMap[user.role] || '1';
                                  }
                                  
                                  const mappedUser = {
                                    ...user,
                                    first_name: user.first_name || nameParts[0] || '',
                                    last_name: user.last_name || nameParts.slice(1).join(' ') || '',
                                    company_id: user.company_id?.toString() || '1',
                                    role_id: roleId || '1',
                                    is_active: user.is_active !== undefined ? user.is_active : (user.isActive !== undefined ? user.isActive : true)
                                  };
                                  
                                  console.log('✅ Mapped user for editing:', {
                                    id: mappedUser.id,
                                    email: mappedUser.email,
                                    role_id: mappedUser.role_id
                                  });
                                  
                                  // Set both states directly - React batches updates automatically
                                  console.log('🎯 Setting editingUser and opening dialog...');
                                  console.log('   Current isEditDialogOpen:', isEditDialogOpen);
                                  setEditingUser(mappedUser);
                                  setIsEditDialogOpen(true);
                                  console.log('   After setState - should be true now');
                                  
                                  // Verify state was set in next tick
                                  setTimeout(() => {
                                    console.log('   Verification after 100ms - isEditDialogOpen should be true');
                                  }, 100);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent aria-describedby={undefined}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete user "{user.name || user.email}"? This action cannot be undone and will remove all associated data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteUserMutation.mutate(user.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                      disabled={deleteUserMutation.isPending}
                                    >
                                      {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
            ) : (
              // Company admin view: flat list without collapsible
              Object.entries(usersByCompany).map(([companyName, companyUsers]) => (
                <Card key={companyName} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Building className="w-5 h-5 text-primary" />
                        <div>
                          <CardTitle className="text-lg">{companyName}</CardTitle>
                          <CardDescription>
                            {companyUsers.length} user{companyUsers.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline">{companyUsers.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {companyUsers.map((user: UserProfile) => (
                        <div key={user.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username}
                              </div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                              <div className="flex items-center space-x-2 mt-1">
                                {user.role_name && (
                                  <Badge variant="outline" className="text-xs">
                                    {user.role_name}
                                  </Badge>
                                )}
                                <Badge variant={user.is_active || user.isActive ? 'default' : 'destructive'} className="text-xs">
                                  {user.is_active || user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const currentStatus = user.is_active || user.isActive;
                                toggleUserStatus.mutate({
                                  userId: user.id,
                                  isActive: !currentStatus
                                });
                              }}
                              disabled={toggleUserStatus.isPending}
                              className="flex items-center space-x-1"
                              data-testid={`button-toggle-status-${user.id}`}
                            >
                              {user.is_active || user.isActive ? (
                                <ToggleRight className="w-4 h-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className="text-xs">
                                {toggleUserStatus.isPending ? 'Updating...' : (user.is_active || user.isActive ? 'Deactivate' : 'Activate')}
                              </span>
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Debug logging
                                console.log('🔍 Edit button clicked for user:', {
                                  id: user.id,
                                  email: user.email,
                                  role: user.role,
                                  role_id: user.role_id
                                });
                                
                                // Properly map user data for editing, parsing name into first/last
                                const nameParts = (user.name || '').split(' ');
                                // Map role to role_id with complete mapping
                                let roleId = user.role_id?.toString();
                                if (!roleId && user.role) {
                                  const roleMap: Record<string, string> = {
                                    'admin': '1',
                                    'project_manager': '2',
                                    'office_manager': '3',
                                    'subcontractor': '4',
                                    'client': '5',
                                    'manager': '2', // Legacy mapping
                                    'crew': '3' // Legacy mapping
                                  };
                                  roleId = roleMap[user.role] || '1';
                                }
                                
                                const mappedUser = {
                                  ...user,
                                  first_name: user.first_name || nameParts[0] || '',
                                  last_name: user.last_name || nameParts.slice(1).join(' ') || '',
                                  company_id: user.company_id?.toString() || '1',
                                  role_id: roleId || '1',
                                  is_active: user.is_active !== undefined ? user.is_active : (user.isActive !== undefined ? user.isActive : true)
                                };
                                
                                console.log('✅ Mapped user for editing:', {
                                  id: mappedUser.id,
                                  email: mappedUser.email,
                                  role_id: mappedUser.role_id
                                });
                                
                                // Set both states directly - React batches updates automatically
                                console.log('🎯 Setting editingUser and opening dialog...');
                                console.log('   Current isEditDialogOpen:', isEditDialogOpen);
                                setEditingUser(mappedUser);
                                setIsEditDialogOpen(true);
                                console.log('   After setState - should be true now');
                                
                                // Verify state was set in next tick
                                setTimeout(() => {
                                  console.log('   Verification after 100ms - isEditDialogOpen should be true');
                                }, 100);
                              }}
                              data-testid={`button-edit-${user.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700"
                                  data-testid={`button-delete-${user.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent aria-describedby={undefined}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete user "{user.name || user.email}"? This action cannot be undone and will remove all associated data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteUserMutation.mutate(user.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={deleteUserMutation.isPending}
                                  >
                                    {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">No users found</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  const RoleManagement = () => {
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [newRole, setNewRole] = useState({
      name: '',
      description: '',
      company_id: '',
      is_template: false
    });

    const permissionsByCategory = permissions.reduce((acc: any, permission: Permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-semibold">Role Management</h3>
            <p className="text-muted-foreground">Manage roles and permissions</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role_name">Role Name</Label>
                    <Input
                      id="role_name"
                      value={newRole.name}
                      onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Select value={newRole.company_id} onValueChange={(value) => setNewRole({ ...newRole, company_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company: Company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_template"
                    checked={newRole.is_template}
                    onCheckedChange={(checked) => setNewRole({ ...newRole, is_template: checked as boolean })}
                  />
                  <Label htmlFor="is_template">Template Role (can be used across companies)</Label>
                </div>
                
                <div>
                  <Label>Permissions</Label>
                  <div className="mt-2 space-y-4 max-h-60 overflow-y-auto border rounded-md p-4">
                    {Object.entries(permissionsByCategory).map(([category, perms]: [string, any]) => (
                      <div key={category}>
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">
                          {category}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {perms.map((permission: Permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={permission.id}
                                checked={selectedPermissions.includes(permission.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPermissions([...selectedPermissions, permission.id]);
                                  } else {
                                    setSelectedPermissions(selectedPermissions.filter(id => id !== permission.id));
                                  }
                                }}
                              />
                              <Label htmlFor={permission.id} className="text-sm">
                                {permission.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <Separator className="mt-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    createRoleMutation.mutate({ ...newRole, permissions: selectedPermissions });
                    setIsCreateDialogOpen(false);
                    setNewRole({ name: '', description: '', company_id: '', is_template: false });
                    setSelectedPermissions([]);
                  }}
                  disabled={createRoleMutation.isPending}
                >
                  Create Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rolesLoading ? (
            <Card>
              <CardContent className="p-6">
                <p>Loading roles...</p>
              </CardContent>
            </Card>
          ) : roles && Array.isArray(roles) && roles.length > 0 ? (
            roles.map((role: Role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {role.name}
                        {role.is_template && <Badge variant="secondary">Template</Badge>}
                      </CardTitle>
                      <CardDescription>{role.description}</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingRole(role);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteRoleMutation.mutate(role.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Permissions ({role.permissions?.length || 0})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions?.slice(0, 5).map((permId: string) => {
                        const perm = permissions.find((p: Permission) => p.id === permId);
                        return perm ? (
                          <Badge key={permId} variant="outline" className="text-xs">
                            {perm.name}
                          </Badge>
                        ) : null;
                      })}
                      {role.permissions?.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permissions.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6">
                <p>No roles found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  const CompanyManagement = () => {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditCompanyDialogOpen, setIsEditCompanyDialogOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
    const [isViewUsersDialogOpen, setIsViewUsersDialogOpen] = useState(false);
    const [showOnlyWithUsers, setShowOnlyWithUsers] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
    const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
    const [newCompany, setNewCompany] = useState({
      name: '',
      domain: '',
      status: 'active',
      settings: { type: 'customer', subscription_tier: 'basic' }
    });

    // Calculate user counts per company
    const userCountsByCompany = React.useMemo(() => {
      const counts: { [key: string]: number } = {};
      if (users && Array.isArray(users)) {
        users.forEach((user: UserProfile) => {
          // Try multiple field variations for company identification
          const companyName = user.company_name || user.company_name;
          const companyId = user.company_id || user.company_id;
          
          if (companyName) {
            counts[companyName] = (counts[companyName] || 0) + 1;
          }
          
          // Also count by company ID for backup matching
          if (companyId && companies) {
            const company = companies.find((c: Company) => c.id.toString() === companyId.toString());
            if (company) {
              counts[company.name] = (counts[company.name] || 0) + 1;
            }
          }
        });
      }
      return counts;
    }, [users, companies]);

    // Filter companies based on user preference
    const filteredCompanies = React.useMemo(() => {
      if (showOnlyWithUsers) {
        return companies.filter((company: Company) => 
          (userCountsByCompany[company.name] || 0) > 0
        );
      }
      return companies;
    }, [companies, userCountsByCompany, showOnlyWithUsers]);

    // Company update mutation - now has access to local state
    const updateCompanyMutation = useMutation({
      mutationFn: ({ id, data }: { id: string; data: any }) => 
        apiRequest(`/api/rbac/companies/${id}`, { method: 'PATCH', body: data }),
      onSuccess: (updatedCompany) => {
        // Invalidate and refetch the companies list
        queryClient.invalidateQueries({ queryKey: ['/api/rbac/companies'] });
        
        // Close the edit dialog and clear state
        setIsEditCompanyDialogOpen(false);
        setEditingCompany(null);
        
        toast({ title: 'Success', description: 'Company updated successfully' });
      },
      onError: (error: any) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    });

    // Company delete mutation
    const deleteCompanyMutation = useMutation({
      mutationFn: (id: string) => apiRequest(`/api/companies/${id}`, { method: 'DELETE' }),
      onSuccess: () => {
        // Invalidate BOTH endpoints to ensure UI updates
        queryClient.invalidateQueries({ queryKey: ['/api/rbac/companies'] });
        queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
        toast({ title: 'Success', description: 'Company deleted successfully' });
        // Close the delete confirmation dialog
        setIsDeleteConfirmDialogOpen(false);
        setCompanyToDelete(null);
      },
      onError: (error: any) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        // Close the delete confirmation dialog on error too
        setIsDeleteConfirmDialogOpen(false);
        setCompanyToDelete(null);
      }
    });

    // Fetch users for selected company
    const { data: companyUsers = [], isLoading: companyUsersLoading } = useQuery<any[]>({
      queryKey: [`/api/rbac/companies/${selectedCompanyId}/users`],
      enabled: !!selectedCompanyId && isViewUsersDialogOpen,
      staleTime: 0, // Force fresh data
      refetchOnMount: true
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-semibold">Company Management</h3>
            <p className="text-muted-foreground">Manage companies and tenants</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-only-with-users"
                checked={showOnlyWithUsers}
                onCheckedChange={setShowOnlyWithUsers}
              />
              <Label htmlFor="show-only-with-users" className="text-sm">
                Only show companies with users
              </Label>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="domain">Domain (optional)</Label>
                  <Input
                    id="domain"
                    value={newCompany.domain}
                    placeholder="company.example.com"
                    onChange={(e) => setNewCompany({ ...newCompany, domain: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Company Type</Label>
                  <Select value={newCompany.settings.type} onValueChange={(value) => setNewCompany({ 
                    ...newCompany, 
                    settings: { ...newCompany.settings, type: value }
                  })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform">Platform Owner</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subscription">Subscription Tier</Label>
                  <Select value={newCompany.settings.subscription_tier} onValueChange={(value) => setNewCompany({ 
                    ...newCompany, 
                    settings: { ...newCompany.settings, subscription_tier: value }
                  })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={newCompany.status} onValueChange={(value) => setNewCompany({ ...newCompany, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (!newCompany.name.trim()) {
                      toast({ title: 'Error', description: 'Company name is required', variant: 'destructive' });
                      return;
                    }
                    
                    // Generate unique domain if not provided or empty
                    const companyToCreate = { ...newCompany };
                    if (!companyToCreate.domain || companyToCreate.domain.trim() === '') {
                      // Generate unique domain from company name + timestamp
                      const timestamp = Date.now().toString().slice(-8);
                      const nameSlug = companyToCreate.name.toLowerCase()
                        .replace(/[^a-z0-9]/g, '')
                        .slice(0, 12);
                      companyToCreate.domain = `${nameSlug}-${timestamp}.com`;
                    }
                    
                    createCompanyMutation.mutate(companyToCreate);
                    setIsCreateDialogOpen(false);
                    setNewCompany({ 
                      name: '', 
                      domain: '', 
                      status: 'active', 
                      settings: { type: 'customer', subscription_tier: 'basic' } 
                    });
                  }}
                  disabled={createCompanyMutation.isPending}
                >
                  {createCompanyMutation.isPending ? 'Creating...' : 'Create Company'}
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit Company Dialog */}
        <Dialog open={isEditCompanyDialogOpen} onOpenChange={setIsEditCompanyDialogOpen}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Edit Company</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_company_name">Company Name</Label>
                <Input
                  id="edit_company_name"
                  value={editingCompany?.name || ''}
                  onChange={(e) => setEditingCompany(prev => prev ? {...prev, name: e.target.value} : null)}
                />
              </div>
              <div>
                <Label htmlFor="edit_domain">Domain</Label>
                <Input
                  id="edit_domain"
                  value={editingCompany?.domain || ''}
                  onChange={(e) => setEditingCompany(prev => prev ? {...prev, domain: e.target.value} : null)}
                />
              </div>
              <div>
                <Label htmlFor="edit_status">Status</Label>
                <Select 
                  value={editingCompany?.status || 'active'} 
                  onValueChange={(value) => setEditingCompany(prev => prev ? {...prev, status: value as 'active' | 'suspended' | 'pending'} : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_type">Company Type</Label>
                <Select 
                  value={editingCompany?.settings?.type || ''} 
                  onValueChange={(value) => setEditingCompany(prev => prev ? {
                    ...prev, 
                    settings: { ...prev.settings, type: value }
                  } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">Platform Owner</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_subscription">Subscription Tier</Label>
                <Select 
                  value={editingCompany?.settings?.subscription_tier || ''} 
                  onValueChange={(value) => setEditingCompany(prev => prev ? {
                    ...prev, 
                    settings: { ...prev.settings, subscription_tier: value }
                  } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_is_active"
                  checked={editingCompany?.is_active || false}
                  onCheckedChange={(checked) => setEditingCompany(prev => prev ? {...prev, is_active: checked} : null)}
                />
                <Label htmlFor="edit_is_active">Active Company</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsEditCompanyDialogOpen(false);
                setEditingCompany(null);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editingCompany) {
                    updateCompanyMutation.mutate({ 
                      id: editingCompany.id, 
                      data: {
                        name: editingCompany.name,
                        domain: editingCompany.domain,
                        status: editingCompany.status,
                        settings: editingCompany.settings
                      }
                    });
                    // Don't close dialog here - let onSuccess handle it
                  }
                }}
                disabled={updateCompanyMutation.isPending || !editingCompany?.name?.trim()}
              >
                {updateCompanyMutation.isPending ? 'Updating...' : 'Update Company'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Users Dialog */}
        <Dialog open={isViewUsersDialogOpen} onOpenChange={setIsViewUsersDialogOpen}>
          <DialogContent className="max-w-4xl" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Company Users</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {companyUsersLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : companyUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found for this company
                </div>
              ) : (
                <div className="space-y-3">
                  {companyUsers.map((user: any) => (
                    <Card key={user.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {user.name?.[0] || user.email?.[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.name || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{user.role_name || 'No role'}</Badge>
                            <Badge variant={user.is_active ? 'default' : 'secondary'}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewUsersDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteConfirmDialogOpen} onOpenChange={setIsDeleteConfirmDialogOpen}>
          <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Delete Company
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <Building className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{companyToDelete?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {companyToDelete?.domain && `Domain: ${companyToDelete.domain}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Type: {companyToDelete?.settings?.type} • {companyToDelete?.settings?.subscription_tier}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Users: {companyToDelete ? (userCountsByCompany[companyToDelete.name] || 0) : 0}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-destructive">Warning</div>
                    <div className="text-destructive/80">
                      All projects, tasks, users, and associated data will be permanently removed.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDeleteConfirmDialogOpen(false);
                  setCompanyToDelete(null);
                }}
                disabled={deleteCompanyMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (companyToDelete) {
                    deleteCompanyMutation.mutate(companyToDelete.id.toString());
                  }
                }}
                disabled={deleteCompanyMutation.isPending}
                className="min-w-20"
              >
                {deleteCompanyMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </div>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Company
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companiesLoading ? (
            <Card>
              <CardContent className="p-6">
                <p>Loading companies...</p>
              </CardContent>
            </Card>
          ) : (
            filteredCompanies.map((company: Company) => (
              <Card key={company.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{company.name}</CardTitle>
                      <CardDescription>
                        {company.settings?.type || 'Unknown'} • {company.settings?.subscription_tier || 'Unknown'}
                      </CardDescription>
                    </div>
                    <Badge variant={company.status === 'active' ? 'default' : 'destructive'}>
                      {company.status === 'active' ? 'Active' : company.status || 'Unknown'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(company.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm font-medium">
                        {userCountsByCompany[company.name] || 0} users
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingCompany(company);
                          setIsEditCompanyDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedCompanyId(Number(company.id));
                          setIsViewUsersDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Users
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => {
                          setCompanyToDelete(company);
                          setIsDeleteConfirmDialogOpen(true);
                        }}
                        disabled={deleteCompanyMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  const PermissionsOverview = () => {
    const permissionsByCategory = permissions.reduce((acc: any, permission: Permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-semibold">Permissions Overview</h3>
          <p className="text-muted-foreground">View all available permissions in the system</p>
        </div>

        <div className="grid gap-6">
          {Object.entries(permissionsByCategory).map(([category, perms]: [string, any]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  {category.charAt(0).toUpperCase() + category.slice(1)} Permissions
                </CardTitle>
                <CardDescription>
                  {perms.length} permissions in this category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {perms.map((permission: Permission) => (
                    <div key={permission.id} className="border rounded-lg p-3">
                      <div className="font-medium text-sm">{permission.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {permission.description}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {permission.resource_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {permission.action}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8" />
          RBAC Administration
        </h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive role-based access control management system
        </p>
      </div>

      {(permissionsLoading || rolesLoading || companiesLoading || usersLoading) && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Loading RBAC data...
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isRootAdmin ? 'grid-cols-4' : 'grid-cols-1'}`}>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          {isRootAdmin && (
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Roles
            </TabsTrigger>
          )}
          {isRootAdmin && (
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Companies
            </TabsTrigger>
          )}
          {isRootAdmin && (
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Permissions
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        {isRootAdmin && (
          <TabsContent value="roles" className="mt-6">
            <RoleManagement />
          </TabsContent>
        )}

        {isRootAdmin && (
          <TabsContent value="companies" className="mt-6">
            <CompanyManagement />
          </TabsContent>
        )}

        {isRootAdmin && (
          <TabsContent value="permissions" className="mt-6">
            <PermissionsOverview />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}