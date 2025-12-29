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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Users, Shield, Building, UserCheck, Settings, Plus, Edit, Trash2, Eye, Key, AlertCircle, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, MoreVertical, Home, FolderKanban, ListTodo } from 'lucide-react';

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
  name?: string; // For complex roles table
  roleName?: string; // camelCase version of role_name
  role_name?: string; // For simple roles table
  displayName?: string; // camelCase version of display_name
  display_name?: string;
  description?: string;
  company_id?: string;
  permissions?: string[];
  is_template?: boolean;
  created_at?: string;
  updated_at?: string;
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
  firstName?: string; // camelCase alias
  last_name?: string;
  lastName?: string; // camelCase alias
  company_id: string;
  companyId?: string; // Alias for compatibility
  role_id?: string;
  roleId?: string; // camelCase alias
  role?: string; // Backend returns role as string (admin, manager, etc.)
  is_active: boolean;
  isActive?: boolean; // Alias for compatibility
  created_at: string;
  createdAt?: string; // camelCase alias
  last_login: string;
  last_login_at?: string; // Alias for compatibility
  lastLoginAt?: string; // camelCase alias
  role_name?: string;
  roleName?: string; // camelCase alias
  company_name?: string;
  companyName?: string; // camelCase alias for company_name
  username?: string;
  password?: string; // For edit form only
}

export default function RBACAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('users');

  // Get current user for RBAC checks
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/v1/auth/user'],
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
    retry: 2,
    staleTime: 30000, // Cache for 30 seconds
  });
  
  // Helper function to get role name safely (handles both name and role_name)
  const getRoleName = (role: Role): string => {
    return role.name || role.roleName || role.role_name || '';
  };

  // Debug logging for roles
  React.useEffect(() => {
    console.log('🔍 Roles Query State:', {
      rolesLoading,
      rolesError: rolesError ? String(rolesError) : null,
      rolesCount: roles?.length || 0,
      hasRBACAccess,
      roles: roles
    });
    
    if (rolesError) {
      console.error('❌ Roles query error:', rolesError);
      console.error('❌ Error details:', JSON.stringify(rolesError, null, 2));
    }
    if (roles && roles.length > 0) {
      console.log(`✅ Loaded ${roles.length} roles:`, roles.map(r => ({ 
        id: r.id, 
        name: getRoleName(r), 
        company_id: r.company_id,
        is_template: r.is_template,
      })));
    } else if (!rolesLoading && roles.length === 0) {
      console.warn('⚠️ No roles found - check backend endpoint /api/v1/rbac/roles');
      console.warn('⚠️ hasRBACAccess:', hasRBACAccess);
      console.warn('⚠️ rolesLoading:', rolesLoading);
      console.warn('⚠️ rolesError:', rolesError);
    }
  }, [roles, rolesLoading, rolesError, hasRBACAccess]);

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
  // Use string comparison to handle type mismatches between string and number IDs
  const currentUserCompanyId = String(currentUser?.company_id || currentUser?.companyId || '');
  const filteredCompanies = isRootAdmin ? companies : companies.filter(c => String(c.id) === currentUserCompanyId);
  const filteredUsers = isRootAdmin ? users : users.filter(u => {
    const userCompanyId = String(u.company_id || u.companyId || '');
    return userCompanyId === currentUserCompanyId;
  });
  const filteredRoles = isRootAdmin ? roles : roles.filter(r => !r.company_id || String(r.company_id) === currentUserCompanyId);

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

  // Update user mutation - at RBACAdmin level since Edit User Dialog is rendered here
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      const updateData: any = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        is_active: data.is_active,
        company_id: data.company_id,
      };
      
      if (data.role_id) {
        updateData.role_id = data.role_id;
      }
      
      if (data.role) {
        updateData.role = data.role;
      } else if (data.role_id) {
        const roleMap: Record<string, string> = {
          '1': 'admin',
          '2': 'project_manager',
          '3': 'office_manager',
          '4': 'subcontractor',
          '5': 'client',
          '6': 'crew'
        };
        updateData.role = roleMap[data.role_id] || 'crew';
      }
      
      if (data.password && data.password.trim() !== '') {
        updateData.password = data.password;
      }
      
      return apiRequest(`/api/rbac/users/${id}`, { 
        method: 'PATCH', 
        body: updateData
      });
    },
    onSuccess: async () => {
      toast({ title: 'Success', description: 'User updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/users'] });
    }
  });

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

  // ========================================================================
  // EDIT USER DIALOG STATE - Lifted to RBACAdmin level to persist across
  // UserManagement remounts (which happen when query data changes)
  // ========================================================================
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editDialogKey, setEditDialogKey] = useState(0);
  const editSessionRef = React.useRef(0);
  const editCloseTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const editBlockCloseUntilRef = React.useRef(0);

  // Component functions
  const UserManagement = () => {
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    // NOTE: Edit dialog state has been LIFTED to RBACAdmin level (above) to prevent
    // state loss when UserManagement remounts due to query data changes
    // Initialize with all companies expanded - will be populated when usersByCompany is computed
    const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
    const [newUser, setNewUser] = useState({
      email: '',
      first_name: '',
      last_name: '',
      company_id: '',
      role_id: '',
      password: '',
      confirm_password: ''
    });

    // Password validation helper
    const validatePassword = (password: string) => {
      return {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasDigit: /\d/.test(password),
      };
    };
    
    const passwordChecks = validatePassword(newUser.password);
    const isPasswordValid = Object.values(passwordChecks).every(Boolean);
    const passwordsMatch = newUser.password === newUser.confirm_password && newUser.confirm_password.length > 0;
    
    // Form validation - use currentUserCompanyId from outer scope
    const isFormValid = 
      newUser.email && 
      newUser.first_name && 
      newUser.last_name && 
      newUser.role_id && 
      currentUserCompanyId &&
      isPasswordValid &&
      passwordsMatch;

    // Toggle user active status
    const toggleUserStatus = useMutation({
      mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
        const endpoint = isActive 
          ? `/api/company-admin/users/${userId}/activate`
          : `/api/company-admin/users/${userId}/suspend`;
        const response = await apiRequest(endpoint, {
          method: 'PUT'
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to update user status');
        }
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/rbac/users'] });
        toast({ title: 'Success', description: 'User status updated successfully' });
      },
      onError: (error: any) => {
        console.error('Toggle user status error:', error);
        toast({ title: 'Error', description: error.message || 'Failed to update user status', variant: 'destructive' });
      }
    });

    // NOTE: updateUserMutation moved back to RBACAdmin level since Edit User Dialog
    // is now rendered at that level

    // Group filtered users by company, including companies with no users
    const usersByCompany = React.useMemo(() => {
      const grouped: { [key: string]: UserProfile[] } = {};
      
      // First, initialize all companies with empty arrays
      filteredCompanies.forEach((company: Company) => {
        grouped[company.name] = [];
      });
      
      // Then add users to their respective companies with proper company name mapping
      filteredUsers.forEach((user: UserProfile) => {
        const userCompanyId = String(user.company_id || user.companyId || '');
        const company = companies.find(c => String(c.id) === userCompanyId);
        // Check both snake_case and camelCase variants for company_name
        const userCompanyName = user.company_name || user.companyName;
        const companyKey = company?.name || userCompanyName || 'Unassigned';
        
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
                  <div className="mt-2 text-xs space-y-1">
                    <p className={passwordChecks.minLength ? "text-green-600" : "text-gray-400"}>
                      {passwordChecks.minLength ? "✓" : "○"} At least 8 characters
                    </p>
                    <p className={passwordChecks.hasUppercase ? "text-green-600" : "text-gray-400"}>
                      {passwordChecks.hasUppercase ? "✓" : "○"} One uppercase letter
                    </p>
                    <p className={passwordChecks.hasLowercase ? "text-green-600" : "text-gray-400"}>
                      {passwordChecks.hasLowercase ? "✓" : "○"} One lowercase letter
                    </p>
                    <p className={passwordChecks.hasDigit ? "text-green-600" : "text-gray-400"}>
                      {passwordChecks.hasDigit ? "✓" : "○"} One digit
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm_password">Confirm Password *</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={newUser.confirm_password}
                    onChange={(e) => setNewUser({ ...newUser, confirm_password: e.target.value })}
                    placeholder="Re-enter password"
                  />
                  {newUser.confirm_password && (
                    <p className={`mt-1 text-xs ${passwordsMatch ? "text-green-600" : "text-red-500"}`}>
                      {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>
                {/* Company is auto-assigned - no selection needed */}
                <div>
                  <Label>Company</Label>
                  <div className="p-2 bg-gray-50 rounded border text-sm text-gray-600">
                    {(() => {
                      // Display current user's company (auto-assigned)
                      if (companiesLoading) return 'Loading company...';
                      if (!companies.length) return 'No companies available';
                      
                      // Try both company_id and companyId for compatibility
                      const userCompanyId = currentUser?.company_id || currentUser?.companyId;
                      const matchedCompany = companies.find(c => c.id.toString() === userCompanyId?.toString());
                      return matchedCompany?.name || `Company ID ${userCompanyId} not found`;
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isRootAdmin ? 'Users will be assigned to your company' : 'User will be assigned to your company'}
                  </p>
                </div>
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select value={newUser.role_id} onValueChange={(value) => setNewUser({ ...newUser, role_id: value })}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        if (rolesLoading) {
                          return <SelectItem value="loading" disabled>Loading roles...</SelectItem>;
                        }
                        
                        if (!roles || roles.length === 0) {
                          return <SelectItem value="none" disabled>No roles available</SelectItem>;
                        }
                        
                        // DEBUG: Log all roles and filter details
                        console.log('🔍 Create User - All roles:', roles);
                        console.log('🔍 Create User - Current company ID:', currentUserCompanyId);
                        console.log('🔍 Create User - Roles count:', roles.length);
                        
                        // Show ALL roles for now - we can filter later if needed
                        // This ensures roles are visible while we debug
                        const rolesToShow = roles;
                        
                        if (rolesToShow.length === 0) {
                          return <SelectItem value="none" disabled>No roles available</SelectItem>;
                        }
                        
                        return rolesToShow
                          .filter((role: Role) => {
                            // Only root admin can assign Platform Administrator role
                            if (getRoleName(role) === 'Platform Administrator' && !isRootAdmin) {
                              return false;
                            }
                            return true;
                          })
                          .map((role: Role) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {getRoleName(role) || role.displayName || role.display_name} {String(role.company_id) === '0' ? '(Platform)' : '(Standard)'}
                            </SelectItem>
                          ));
                      })()}
                    </SelectContent>
                  </Select>
                  {!newUser.role_id && (
                    <p className="text-xs text-red-500 mt-1">Role is required</p>
                  )}
                </div>
              </form>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  id="create-user-button"
                  onClick={() => {
                    // Auto-assign company - always use current user's company
                    const companyId = currentUser?.company_id || currentUser?.companyId;
                    const effectiveCompanyId = companyId?.toString() || '';
                    
                    // Parse role_id safely - ensure it's a valid number
                    const roleIdNum = parseInt(newUser.role_id, 10);
                    if (isNaN(roleIdNum)) {
                      toast({ title: 'Error', description: 'Please select a valid role', variant: 'destructive' });
                      return;
                    }
                    
                    if (!effectiveCompanyId) {
                      toast({ title: 'Error', description: 'Company ID not available', variant: 'destructive' });
                      return;
                    }
                    
                    // Map frontend fields to backend expected format
                    const userPayload = {
                      email: newUser.email.trim(),
                      first_name: newUser.first_name.trim(),
                      last_name: newUser.last_name.trim(),
                      company_id: effectiveCompanyId,
                      role_id: roleIdNum,
                      password: newUser.password,
                      is_active: true
                    };
                    
                    console.log('[Create User] Sending payload:', userPayload);
                    
                    // Creating user with validated data
                    createUserMutation.mutate(userPayload, {
                      onSuccess: () => {
                        setIsCreateDialogOpen(false);
                        setNewUser({ email: '', first_name: '', last_name: '', company_id: '', role_id: '', password: '', confirm_password: '' });
                      }
                    });
                  }}
                  disabled={!isFormValid || createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* NOTE: Edit User Dialog has been moved to RBACAdmin level to prevent 
              flicker caused by UserManagement remounting */}
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
              // Root admin view: collapsible companies with native mobile pattern
              Object.entries(usersByCompany).map(([companyName, companyUsers]) => (
                <Card key={companyName} className="overflow-hidden rounded-2xl bg-[var(--pro-surface)] border-[var(--pro-border)]">
                  <Collapsible
                    open={expandedCompanies.has(companyName)}
                    onOpenChange={() => toggleCompanyExpansion(companyName)}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between hover:bg-[var(--pro-surface-highlight)] transition-colors">
                        <div className="flex items-center gap-3">
                          <Building className="w-5 h-5 text-[var(--pro-mint)]" />
                          <div className="text-left">
                            <h3 className="text-sm font-semibold text-[var(--pro-text-primary)]">{companyName}</h3>
                            <p className="text-xs text-[var(--pro-text-secondary)]">
                              {companyUsers.length} user{companyUsers.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-medium bg-[var(--pro-surface-highlight)] text-[var(--pro-text-secondary)] rounded-full">
                            {companyUsers.length}
                          </span>
                          <ChevronRight
                            className={`w-5 h-5 text-[var(--pro-text-secondary)] transition-transform duration-200 ${
                              expandedCompanies.has(companyName) ? 'rotate-90' : ''
                            }`}
                          />
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="divide-y divide-[var(--pro-border)]">
                        {companyUsers.map((user: UserProfile) => {
                          // Get user initials
                          const displayName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email;
                          const initials = displayName
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase();
                          const isActive = user.is_active || user.isActive;

                          return (
                            <div
                              key={user.id}
                              className="min-h-[64px] px-4 py-3 flex items-center gap-3 hover:bg-[var(--pro-surface-highlight)] active:bg-[var(--pro-surface-highlight)] transition-colors"
                            >
                              {/* Initials Avatar with Status Dot */}
                              <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-[var(--pro-mint)]/20 flex items-center justify-center">
                                  <span className="text-sm font-semibold text-[var(--pro-mint)]">{initials}</span>
                                </div>
                                {/* Status Dot */}
                                <span
                                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--pro-surface)] ${
                                    isActive ? 'bg-[var(--pro-mint)]' : 'bg-[var(--pro-text-secondary)]'
                                  }`}
                                />
                              </div>

                              {/* User Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-[var(--pro-text-primary)] truncate">
                                    {displayName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-5 px-1.5 bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] text-[var(--pro-text-secondary)]"
                                  >
                                    {user.role_name || user.roleName || user.role || 'No role'}
                                  </Badge>
                                </div>
                              </div>

                              {/* Right Chevron (drill-down indicator) */}
                              <ChevronRight className="w-5 h-5 text-[var(--pro-text-secondary)] flex-shrink-0" />

                              {/* Kebab Menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-[var(--pro-surface-highlight)] -mr-2"
                                    aria-label="User actions"
                                  >
                                    <MoreVertical className="w-5 h-5 text-[var(--pro-text-secondary)]" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-[var(--pro-surface)] border-[var(--pro-border)]">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const currentStatus = user.is_active || user.isActive;
                                      toggleUserStatus.mutate({
                                        userId: user.id,
                                        isActive: !currentStatus
                                      });
                                    }}
                                    className="min-h-[44px] text-[var(--pro-text-primary)]"
                                  >
                                    {isActive ? (
                                      <>
                                        <ToggleLeft className="w-4 h-4 mr-2" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <ToggleRight className="w-4 h-4 mr-2 text-[var(--pro-mint)]" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();

                                      if (editCloseTimerRef.current) {
                                        clearTimeout(editCloseTimerRef.current);
                                        editCloseTimerRef.current = null;
                                      }
                                      editSessionRef.current += 1;

                                      const nameParts = (user.name || '').split(' ');
                                      let roleId = user.role_id?.toString();
                                      if (!roleId && user.role && roles && roles.length > 0) {
                                        const roleNameMap: Record<string, string> = {
                                          'admin': 'Admin',
                                          'project_manager': 'Project Manager',
                                          'office_manager': 'Office Manager',
                                          'subcontractor': 'Subcontractor',
                                          'client': 'Client',
                                          'crew': 'Crew'
                                        };
                                        const userRole = user.role ?? '';
                                        const targetRoleName = roleNameMap[userRole] || userRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                                        const matchingRole = roles.find((r: Role) => {
                                          const roleName = getRoleName(r).toLowerCase();
                                          return roleName === targetRoleName.toLowerCase() ||
                                                 roleName === userRole.toLowerCase();
                                        });
                                        if (matchingRole) {
                                          roleId = matchingRole.id.toString();
                                        } else {
                                          const roleMap: Record<string, string> = {
                                            'admin': '1',
                                            'project_manager': '2',
                                            'office_manager': '3',
                                            'subcontractor': '4',
                                            'client': '5',
                                            'crew': '6'
                                          };
                                          roleId = roleMap[userRole] || '';
                                        }
                                      }

                                      const mappedUser = {
                                        ...user,
                                        first_name: user.first_name || user.firstName || nameParts[0] || '',
                                        last_name: user.last_name || user.lastName || nameParts.slice(1).join(' ') || '',
                                        company_id: (user.company_id || user.companyId)?.toString() || '',
                                        role_id: roleId || '',
                                        role: user.role || '',
                                        role_name: user.role_name || user.roleName || '',
                                        is_active: user.is_active !== undefined ? user.is_active : (user.isActive !== undefined ? user.isActive : true),
                                        email: user.email || '',
                                        password: ''
                                      };

                                      setEditingUser(mappedUser);
                                      setIsEditUserDialogOpen(true);
                                    }}
                                    className="min-h-[44px] text-[var(--pro-blue)]"
                                    data-testid={`button-edit-${user.id}`}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit User
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-[var(--pro-border)]" />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="min-h-[44px] text-[var(--pro-red)]"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete User
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-[var(--pro-surface)] border-[var(--pro-border)]" aria-describedby={undefined}>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-[var(--pro-text-primary)]">Delete User</AlertDialogTitle>
                                        <AlertDialogDescription className="text-[var(--pro-text-secondary)]">
                                          Are you sure you want to delete user "{displayName}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="min-h-[44px]">Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteUserMutation.mutate(user.id)}
                                          className="min-h-[44px] bg-[var(--pro-red)] hover:bg-[var(--pro-red)]/90"
                                          disabled={deleteUserMutation.isPending}
                                        >
                                          {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          );
                        })}
                      </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
            ) : (
              // Company admin view: flat list with native mobile pattern
              Object.entries(usersByCompany).map(([companyName, companyUsers]) => (
                <Card key={companyName} className="overflow-hidden rounded-2xl bg-[var(--pro-surface)] border-[var(--pro-border)]">
                  <div className="min-h-[56px] px-4 py-3 flex items-center justify-between border-b border-[var(--pro-border)]">
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-[var(--pro-mint)]" />
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--pro-text-primary)]">{companyName}</h3>
                        <p className="text-xs text-[var(--pro-text-secondary)]">
                          {companyUsers.length} user{companyUsers.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-medium bg-[var(--pro-surface-highlight)] text-[var(--pro-text-secondary)] rounded-full">
                      {companyUsers.length}
                    </span>
                  </div>
                  <div className="divide-y divide-[var(--pro-border)]">
                    {companyUsers.map((user: UserProfile) => {
                      // Get user initials
                      const displayName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email;
                      const initials = displayName
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();
                      const isActive = user.is_active || user.isActive;

                      return (
                        <div
                          key={user.id}
                          className="min-h-[64px] px-4 py-3 flex items-center gap-3 hover:bg-[var(--pro-surface-highlight)] active:bg-[var(--pro-surface-highlight)] transition-colors"
                        >
                          {/* Initials Avatar with Status Dot */}
                          <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-[var(--pro-mint)]/20 flex items-center justify-center">
                              <span className="text-sm font-semibold text-[var(--pro-mint)]">{initials}</span>
                            </div>
                            {/* Status Dot */}
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--pro-surface)] ${
                                isActive ? 'bg-[var(--pro-mint)]' : 'bg-[var(--pro-text-secondary)]'
                              }`}
                            />
                          </div>

                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[var(--pro-text-primary)] truncate">
                                {displayName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 px-1.5 bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] text-[var(--pro-text-secondary)]"
                              >
                                {user.role_name || user.roleName || user.role || 'No role'}
                              </Badge>
                            </div>
                          </div>

                          {/* Right Chevron (drill-down indicator) */}
                          <ChevronRight className="w-5 h-5 text-[var(--pro-text-secondary)] flex-shrink-0" />

                          {/* Kebab Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-[var(--pro-surface-highlight)] -mr-2"
                                aria-label="User actions"
                                data-testid={`button-menu-${user.id}`}
                              >
                                <MoreVertical className="w-5 h-5 text-[var(--pro-text-secondary)]" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-[var(--pro-surface)] border-[var(--pro-border)]">
                              <DropdownMenuItem
                                onClick={() => {
                                  const currentStatus = user.is_active || user.isActive;
                                  toggleUserStatus.mutate({
                                    userId: user.id,
                                    isActive: !currentStatus
                                  });
                                }}
                                className="min-h-[44px] text-[var(--pro-text-primary)]"
                                data-testid={`button-toggle-status-${user.id}`}
                              >
                                {isActive ? (
                                  <>
                                    <ToggleLeft className="w-4 h-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="w-4 h-4 mr-2 text-[var(--pro-mint)]" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();

                                  if (editCloseTimerRef.current) {
                                    clearTimeout(editCloseTimerRef.current);
                                    editCloseTimerRef.current = null;
                                  }
                                  editSessionRef.current += 1;

                                  const nameParts = (user.name || '').split(' ');
                                  let roleId = user.role_id?.toString();
                                  if (!roleId && user.role && roles && roles.length > 0) {
                                    const roleNameMap: Record<string, string> = {
                                      'admin': 'Admin',
                                      'project_manager': 'Project Manager',
                                      'office_manager': 'Office Manager',
                                      'subcontractor': 'Subcontractor',
                                      'client': 'Client',
                                      'crew': 'Crew'
                                    };
                                    const userRole = user.role ?? '';
                                    const targetRoleName = roleNameMap[userRole] || userRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                                    const matchingRole = roles.find((r: Role) => {
                                      const roleName = getRoleName(r).toLowerCase();
                                      return roleName === targetRoleName.toLowerCase() ||
                                             roleName === userRole.toLowerCase();
                                    });
                                    if (matchingRole) {
                                      roleId = matchingRole.id.toString();
                                    } else {
                                      const roleMap: Record<string, string> = {
                                        'admin': '1',
                                        'project_manager': '2',
                                        'office_manager': '3',
                                        'subcontractor': '4',
                                        'client': '5',
                                        'crew': '6'
                                      };
                                      roleId = roleMap[userRole] || '';
                                    }
                                  }

                                  const mappedUser = {
                                    ...user,
                                    first_name: user.first_name || user.firstName || nameParts[0] || '',
                                    last_name: user.last_name || user.lastName || nameParts.slice(1).join(' ') || '',
                                    company_id: (user.company_id || user.companyId)?.toString() || '',
                                    role_id: roleId || '',
                                    role: user.role || '',
                                    role_name: user.role_name || user.roleName || '',
                                    is_active: user.is_active !== undefined ? user.is_active : (user.isActive !== undefined ? user.isActive : true),
                                    email: user.email || '',
                                    password: ''
                                  };

                                  setEditingUser(mappedUser);
                                  setIsEditUserDialogOpen(true);
                                }}
                                className="min-h-[44px] text-[var(--pro-blue)]"
                                data-testid={`button-edit-${user.id}`}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-[var(--pro-border)]" />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="min-h-[44px] text-[var(--pro-red)]"
                                    data-testid={`button-delete-${user.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-[var(--pro-surface)] border-[var(--pro-border)]" aria-describedby={undefined}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-[var(--pro-text-primary)]">Delete User</AlertDialogTitle>
                                    <AlertDialogDescription className="text-[var(--pro-text-secondary)]">
                                      Are you sure you want to delete user "{displayName}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="min-h-[44px]">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteUserMutation.mutate(user.id)}
                                      className="min-h-[44px] bg-[var(--pro-red)] hover:bg-[var(--pro-red)]/90"
                                      disabled={deleteUserMutation.isPending}
                                    >
                                      {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
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
    const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
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
                      <SelectTrigger id="company">
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
            roles.map((role: Role) => {
              const rolePermissions = role.permissions ?? [];

              return (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getRoleName(role) || role.displayName || role.display_name}
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
                          setIsEditUserDialogOpen(true);
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
                      Permissions ({rolePermissions.length})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rolePermissions.slice(0, 5).map((permId: string) => {
                        const perm = permissions.find((p: Permission) => p.id === permId);
                        return perm ? (
                          <Badge key={permId} variant="outline" className="text-xs">
                            {perm.name}
                          </Badge>
                        ) : null;
                      })}
                      {rolePermissions.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{rolePermissions.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })
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
          const companyName = user.company_name || user.companyName;
          const companyId = user.company_id || user.companyId;
          
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
                    <SelectTrigger id="type">
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
                    <SelectTrigger id="subscription">
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
                    <SelectTrigger id="status">
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
                  <SelectTrigger id="edit_status">
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
                  <SelectTrigger id="edit_type">
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
                  <SelectTrigger id="edit_subscription">
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
                            <Badge variant="outline">{user.role_name || user.roleName || user.role || 'No role'}</Badge>
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

  // ========================================================================
  // EDIT USER DIALOG - Rendered at RBACAdmin level (NOT inside UserManagement)
  // This prevents the dialog from unmounting/remounting when UserManagement
  // re-renders, which was causing visual flickering.
  // ========================================================================
  const editUserDialog = (
    <Dialog 
      open={isEditUserDialogOpen}
      onOpenChange={(open) => {
        const now = Date.now();
        const blockedUntil = editBlockCloseUntilRef.current;
        
        // Block close if we're in the critical period after update
        if (!open && now < blockedUntil) {
          return;
        }
        
        // Allow closing manually (via cancel button or X)
        if (!open && !updateUserMutation.isPending) {
          setIsEditUserDialogOpen(false);
          setEditingUser(null);
        }
      }}
      modal={true}
    >
      <DialogContent className="max-w-md" aria-describedby={undefined} onInteractOutside={(e) => {
        // Prevent closing by clicking outside during mutation
        if (updateUserMutation.isPending) {
          e.preventDefault();
        }
      }}>
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
                onChange={(e) => setEditingUser(editingUser ? {...editingUser, first_name: e.target.value} : null)}
              />
            </div>
            <div>
              <Label htmlFor="edit_last_name">Last Name</Label>
              <Input
                id="edit_last_name"
                value={editingUser?.last_name || ''}
                onChange={(e) => setEditingUser(editingUser ? {...editingUser, last_name: e.target.value} : null)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="edit_email">Email</Label>
            <Input
              id="edit_email"
              type="email"
              value={editingUser?.email || ''}
              onChange={(e) => setEditingUser(editingUser ? {...editingUser, email: e.target.value} : null)}
            />
          </div>
          <div>
            <Label htmlFor="edit_company">Company</Label>
            <Select 
              value={editingUser?.company_id?.toString() || ''} 
              onValueChange={(value) => setEditingUser(editingUser ? {...editingUser, company_id: value} : null)}
              disabled={true}
            >
              <SelectTrigger id="edit_company" className="opacity-60">
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
              onChange={(e) => setEditingUser(editingUser ? {...editingUser, password: e.target.value} : null)}
            />
            <p className="text-xs text-muted-foreground mt-1">Only change if user needs a new password</p>
          </div>
          <div>
            <Label htmlFor="edit_role">Role</Label>
            <Select 
              value={editingUser?.role_id?.toString() || ''} 
              onValueChange={(value) => setEditingUser(editingUser ? {...editingUser, role_id: value} : null)}
            >
              <SelectTrigger id="edit_role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {rolesLoading ? (
                  <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                ) : roles && roles.length > 0 ? (
                  (() => {
                    // DEBUG: Log all roles and filter details
                    console.log('🔍 Edit User - All roles:', roles);
                    console.log('🔍 Edit User - Current company ID:', currentUserCompanyId);
                    console.log('🔍 Edit User - Roles count:', roles.length);
                    
                    // Show ALL roles for now - we can filter later if needed
                    const rolesToShow = roles;
                    
                    if (rolesToShow.length === 0) {
                      return <SelectItem value="none" disabled>No roles available</SelectItem>;
                    }
                    
                    return rolesToShow.map((role: Role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {getRoleName(role) || role.displayName || role.display_name} {String(role.company_id) === '0' ? '(Platform)' : '(Standard)'}
                      </SelectItem>
                    ));
                  })()
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
              onCheckedChange={(checked) => setEditingUser(editingUser ? {...editingUser, is_active: checked} : null)}
            />
            <Label htmlFor="edit_is_active">Active User</Label>
          </div>
        </div>
        <DialogFooter>
          <Button 
            type="button"
            variant="outline" 
            onClick={() => {
              setIsEditUserDialogOpen(false);
              setEditingUser(null);
            }}
            data-testid="button-cancel-edit"
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={async () => {
              if (editingUser) {
                const updatePayload: any = {
                  email: editingUser.email,
                  username: editingUser.email,
                  name: `${editingUser.first_name || ''} ${editingUser.last_name || ''}`.trim(),
                  first_name: editingUser.first_name,
                  last_name: editingUser.last_name,
                  company_id: editingUser.company_id,
                  role_id: editingUser.role_id,
                  is_active: editingUser.is_active,
                };
                if (editingUser.password && editingUser.password.trim() !== '') {
                  updatePayload.password = editingUser.password;
                }
                
                try {
                  await updateUserMutation.mutateAsync({
                    id: editingUser.id, 
                    data: updatePayload
                  });
                  
                  // Block trailing close events for a short period
                  const blockDurationMs = 1200;
                  editBlockCloseUntilRef.current = Date.now() + blockDurationMs;
                  
                  // Update cache immediately
                  const roleId = editingUser.role_id;
                  const roleName = roleId === '1' ? 'Admin' : 
                                 roleId === '2' ? 'Project Manager' : 
                                 roleId === '3' ? 'Office Manager' : 
                                 roleId === '4' ? 'Subcontractor' : 
                                 roleId === '5' ? 'Client' : 'Crew';
                  const role = roleId === '1' ? 'admin' : 
                              roleId === '2' ? 'project_manager' : 
                              roleId === '3' ? 'office_manager' : 
                              roleId === '4' ? 'subcontractor' : 
                              roleId === '5' ? 'client' : 'crew';
                  
                  queryClient.setQueryData(['/api/rbac/users'], (old: any) => {
                    if (!old) return old;
                    return old.map((user: any) => 
                      user.id === editingUser.id 
                        ? { ...user, role_id: roleId, role: role, role_name: roleName }
                        : user
                    );
                  });
                  
                  setIsEditUserDialogOpen(false);
                  setEditingUser(null);
                  editCloseTimerRef.current = null;
                  
                } catch (error) {
                  console.error('Update failed:', error);
                }
              }
            }}
            disabled={updateUserMutation.isPending || !editingUser?.email?.trim()}
            data-testid="button-update-user"
          >
            {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Segmented control options for tabs
  const tabOptions = isRootAdmin
    ? [
        { value: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
        { value: 'roles', label: 'Roles', icon: <UserCheck className="w-4 h-4" /> },
        { value: 'companies', label: 'Companies', icon: <Building className="w-4 h-4" /> },
        { value: 'permissions', label: 'Permissions', icon: <Key className="w-4 h-4" /> },
      ]
    : [
        { value: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
      ];

  // Bottom navigation items
  const bottomNavItems = [
    { value: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { value: 'projects', label: 'Projects', icon: <FolderKanban className="w-5 h-5" /> },
    { value: 'tasks', label: 'Tasks', icon: <ListTodo className="w-5 h-5" /> },
    { value: 'admin', label: 'Admin', icon: <Shield className="w-5 h-5" /> },
  ];

  const [activeNavItem, setActiveNavItem] = useState('admin');

  const handleNavChange = (value: string) => {
    if (value === 'home') {
      window.location.href = '/';
    } else if (value === 'projects') {
      window.location.href = '/projects';
    } else if (value === 'tasks') {
      window.location.href = '/tasks';
    } else {
      setActiveNavItem(value);
    }
  };

  return (
    <div className="bg-[var(--pro-bg-deep)] min-h-screen pb-20">
      {/* Edit User Dialog - rendered at RBACAdmin level to prevent flicker */}
      {editUserDialog}

      {/* Sticky Header - Compact single-row layout */}
      <header className="sticky top-0 z-40 bg-[var(--pro-surface)] border-b border-[var(--pro-border)] pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--pro-mint)]" />
            <h1 className="text-lg font-semibold text-[var(--pro-text-primary)]">
              RBAC Admin
            </h1>
          </div>
        </div>

        {/* iOS-style Segmented Control */}
        <div className="px-4 pb-3">
          <SegmentedControl
            options={tabOptions}
            value={activeTab}
            onChange={setActiveTab}
            className="w-full"
            data-testid="rbac-tabs"
          />
        </div>
      </header>

      {/* Loading Alert */}
      {(permissionsLoading || rolesLoading || companiesLoading || usersLoading) && (
        <Alert className="mx-4 mt-4 bg-[var(--pro-surface)] border-[var(--pro-border)]">
          <AlertCircle className="h-4 w-4 text-[var(--pro-blue)]" />
          <AlertDescription className="text-[var(--pro-text-primary)]">
            Loading RBAC data...
          </AlertDescription>
        </Alert>
      )}

      {/* Content Area */}
      <main className="p-4">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'roles' && isRootAdmin && <RoleManagement />}
        {activeTab === 'companies' && isRootAdmin && <CompanyManagement />}
        {activeTab === 'permissions' && isRootAdmin && <PermissionsOverview />}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation
        items={bottomNavItems}
        value={activeNavItem}
        onChange={handleNavChange}
        data-testid="bottom-nav"
      />
    </div>
  );
}