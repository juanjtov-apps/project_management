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
import { Users, Shield, Building, UserCheck, UserCheck2, UserX, Settings, Plus, Edit, Trash2, Eye, Key, AlertCircle, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, MoreVertical, Home, FolderKanban, ListTodo, Palette, Mail, Send, KeyRound } from 'lucide-react';
import CompanyBrandingForm from '@/components/onboarding/company-branding-form';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  resource_type: string;
  action: string;
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
  assigned_project_id?: string; // For client role users
  assignedProjectId?: string; // camelCase alias
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
  // Root admin check - uses database is_root field (set during user creation)
  // Backend validates this in is_root_admin() function in auth.py
  const isRootAdmin = currentUser?.isRoot === true || currentUser?.is_root === true;
  // Company admin check - based on role field only (matches backend is_user_admin() logic)
  const isCompanyAdmin = currentUser?.role === 'admin';
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

  const { data: companies = [], isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: hasRBACAccess,
  });

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<UserProfile[]>({
    queryKey: ['/api/rbac/users'],
    enabled: hasRBACAccess,
  });

  // Fetch projects for client role assignment
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects'],
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
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);
  const currentUserCompanyId = String(currentUser?.company_id || currentUser?.companyId || '');
  const filteredCompanies = isRootAdmin ? companies : companies.filter(c => String(c.id) === currentUserCompanyId);
  const filteredUsers = (isRootAdmin ? users : users.filter(u => {
    const userCompanyId = String(u.company_id || u.companyId || '');
    return userCompanyId === currentUserCompanyId;
  })).filter(u => showInactiveUsers || u.is_active || u.isActive);
  const filteredRoles = isRootAdmin ? roles : roles.filter(r => !r.company_id || String(r.company_id) === currentUserCompanyId);

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest('/api/rbac/users', { method: 'POST', body: userData });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/users'] });
      if (data?.emailSent === true) {
        toast({ title: 'Client Invited', description: `Invitation email sent to ${data.email || 'client'}` });
      } else if (data?.emailSent === false) {
        toast({ title: 'Client Created', description: 'User created but invitation email failed to send. You can re-send from Client Portal.', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'User created successfully' });
      }
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
          '2': 'office_manager',
          '3': 'project_manager',
          '4': 'client',
          '5': 'crew',
          '6': 'subcontractor'
        };
        updateData.role = roleMap[data.role_id] || 'crew';
      }
      
      if (data.password && data.password.trim() !== '') {
        updateData.password = data.password;
      }

      // Include assigned_project_id for client users
      if (data.assigned_project_id !== undefined) {
        updateData.assigned_project_id = data.assigned_project_id;
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
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      apiRequest(`/api/rbac/users/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
    onSuccess: (_data, { id: deletedUserId }) => {
      queryClient.setQueryData(['/api/rbac/users'], (old: any) => {
        if (!old) return old;
        return old.filter((user: any) => user.id !== deletedUserId);
      });
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
  // EDIT USER DIALOG STATE - At RBACAdmin level to persist across re-renders
  // ========================================================================
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // ========================================================================
  // USER MANAGEMENT STATE - Lifted to RBACAdmin level so UserManagement can
  // be a plain render function (not a component) to avoid unmount/remount
  // ========================================================================
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [newUser, setNewUser] = useState({
    email: '',
    first_name: '',
    last_name: '',
    company_id: '',
    role_id: '',
    password: '',
    confirm_password: '',
    assigned_project_id: ''
  });

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
    onSuccess: (_data, { userId, isActive }) => {
      queryClient.setQueryData(['/api/rbac/users'], (old: any) => {
        if (!old) return old;
        return old.map((user: any) =>
          user.id === userId ? { ...user, is_active: isActive } : user
        );
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/users'] });
      toast({ title: 'Success', description: `User ${isActive ? 'activated' : 'deactivated'} successfully` });
    },
    onError: (error: any) => {
      console.error('Toggle user status error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to update user status', variant: 'destructive' });
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

  // Plain render function (NOT a component) — avoids unstable component identity
  const renderUserManagement = () => {
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
    // Client role (roleId === '4') also requires assigned_project_id
    const isClientRole = newUser.role_id === '4';
    const hasRequiredProjectForClient = !isClientRole || (isClientRole && newUser.assigned_project_id);

    const hasCompany = isRootAdmin ? !!newUser.company_id : !!currentUserCompanyId;
    const isFormValid =
      newUser.email &&
      newUser.first_name &&
      newUser.last_name &&
      newUser.role_id &&
      hasCompany &&
      (isClientRole || (isPasswordValid && passwordsMatch)) &&
      hasRequiredProjectForClient;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-semibold">User Management</h3>
            <p className="text-muted-foreground">Manage users across all companies</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            if (!open) {
              setNewUser({ email: '', first_name: '', last_name: '', company_id: '', role_id: '', password: '', confirm_password: '', assigned_project_id: '' });
            }
            setIsCreateDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setNewUser(prev => ({ ...prev, company_id: '' }))}>
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
                {/* Role selector first — determines which fields are shown */}
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select value={newUser.role_id} onValueChange={(value) => setNewUser({ ...newUser, role_id: value, password: '', confirm_password: '' })}>
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

                        const rolesToShow = roles;

                        if (rolesToShow.length === 0) {
                          return <SelectItem value="none" disabled>No roles available</SelectItem>;
                        }

                        return rolesToShow
                          .filter((role: Role) => {
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
                {/* Client role info banner */}
                {isClientRole && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    Client users sign in via magic link — no password needed. An invitation email will be sent automatically.
                  </div>
                )}
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
                {/* Password fields — hidden for client role (magic link auth) */}
                {!isClientRole && (
                  <>
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
                  </>
                )}
                {/* Company assignment */}
                <div>
                  <Label>Company {isRootAdmin ? '*' : ''}</Label>
                  {isRootAdmin ? (
                    <>
                      <Select
                        value={newUser.company_id}
                        onValueChange={(value) => setNewUser({ ...newUser, company_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companiesLoading ? (
                            <SelectItem value="loading" disabled>Loading companies...</SelectItem>
                          ) : companies.length === 0 ? (
                            <SelectItem value="none" disabled>No companies available</SelectItem>
                          ) : (
                            companies.map((company: Company) => (
                              <SelectItem key={company.id} value={company.id.toString()}>
                                {company.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Select which company this user belongs to
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-gray-50 rounded border text-sm text-gray-600">
                        {(() => {
                          if (companiesLoading) return 'Loading company...';
                          if (!companies.length) return 'No companies available';
                          const userCompanyId = currentUser?.company_id || currentUser?.companyId;
                          const matchedCompany = companies.find(c => c.id.toString() === userCompanyId?.toString());
                          return matchedCompany?.name || `Company ID ${userCompanyId} not found`;
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        User will be assigned to your company
                      </p>
                    </>
                  )}
                </div>
                {/* Project Assignment - Only shown for Client role (roleId === '4') */}
                {isClientRole && (
                  <div>
                    <Label htmlFor="assigned_project">Assigned Project *</Label>
                    <Select
                      value={newUser.assigned_project_id}
                      onValueChange={(value) => setNewUser({ ...newUser, assigned_project_id: value })}
                    >
                      <SelectTrigger id="assigned_project">
                        <SelectValue placeholder="Select project for client" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.length === 0 ? (
                          <SelectItem value="none" disabled>No projects available</SelectItem>
                        ) : (
                          projects.map((project: any) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Client users can only access this specific project
                    </p>
                    {!newUser.assigned_project_id && (
                      <p className="text-xs text-red-500 mt-1">Project is required for client users</p>
                    )}
                  </div>
                )}
              </form>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  id="create-user-button"
                  onClick={() => {
                    // Root admin: use selected company; non-root: use current user's company
                    const companyId = isRootAdmin
                      ? newUser.company_id
                      : (currentUser?.company_id || currentUser?.companyId);
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

                    // Validate assigned_project_id for client role
                    if (roleIdNum === 4 && !newUser.assigned_project_id) {
                      toast({ title: 'Error', description: 'Project is required for client users', variant: 'destructive' });
                      return;
                    }

                    // Map frontend fields to backend expected format
                    const userPayload: any = {
                      email: newUser.email.trim(),
                      first_name: newUser.first_name.trim(),
                      last_name: newUser.last_name.trim(),
                      company_id: effectiveCompanyId,
                      role_id: roleIdNum,
                      is_active: true
                    };

                    // Include password only for non-client roles
                    if (roleIdNum !== 4) {
                      userPayload.password = newUser.password;
                    }

                    // Include assigned_project_id only for client role
                    if (roleIdNum === 4 && newUser.assigned_project_id) {
                      userPayload.assigned_project_id = newUser.assigned_project_id;
                    }

                    // Creating user with validated data
                    createUserMutation.mutate(userPayload, {
                      onSuccess: (response: any) => {
                        setIsCreateDialogOpen(false);
                        setNewUser({ email: '', first_name: '', last_name: '', company_id: '', role_id: '', password: '', confirm_password: '', assigned_project_id: '' });
                      }
                    });
                  }}
                  disabled={!isFormValid || createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? 'Creating...' : (isClientRole ? 'Create & Send Invite' : 'Create User')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* NOTE: Edit User Dialog has been moved to RBACAdmin level to prevent 
              flicker caused by UserManagement remounting */}
        </div>

        {/* Filter: show/hide inactive users */}
        {(() => {
          const allUsers = isRootAdmin ? users : users.filter(u => {
            const uid = String(u.company_id || u.companyId || '');
            return uid === currentUserCompanyId;
          });
          const inactiveCount = allUsers.filter(u => !(u.is_active || u.isActive)).length;
          if (inactiveCount === 0) return null;
          return (
            <button
              onClick={() => setShowInactiveUsers(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                showInactiveUsers
                  ? 'bg-[var(--pro-mint)]/15 text-[var(--pro-mint)] border border-[var(--pro-mint)]/30'
                  : 'bg-[var(--pro-surface-highlight)] text-[var(--pro-text-secondary)] border border-[var(--pro-border)]'
              }`}
            >
              <Eye className="w-3 h-3" />
              {showInactiveUsers ? 'Hide' : 'Show'} inactive ({inactiveCount})
            </button>
          );
        })()}

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
                    <div className="flex items-center min-h-[56px]">
                      <CollapsibleTrigger asChild>
                        <button className="flex-1 min-h-[56px] px-4 py-3 flex items-center justify-between hover:bg-[var(--pro-surface-highlight)] transition-colors">
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
                      <button
                        className="min-w-[44px] min-h-[44px] mr-2 flex items-center justify-center rounded-lg hover:bg-[var(--pro-mint)]/20 transition-colors"
                        aria-label={`Add user to ${companyName}`}
                        title={`Add user to ${companyName}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const company = companies.find(c => c.name === companyName);
                          if (company) {
                            setNewUser(prev => ({ ...prev, company_id: company.id.toString() }));
                          }
                          setIsCreateDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 text-[var(--pro-mint)]" />
                      </button>
                    </div>
                    <CollapsibleContent>
                      <div className="divide-y divide-[var(--pro-border)]">
                        {companyUsers.map((user: UserProfile) => {
                          // Get user initials
                          const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email;
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
                                      toggleUserStatus.mutate({
                                        userId: user.id,
                                        isActive: !isActive
                                      });
                                    }}
                                    className={`min-h-[44px] ${isActive ? 'text-[var(--pro-text-secondary)]' : 'text-[var(--pro-mint)]'}`}
                                  >
                                    {isActive ? <UserX className="w-4 h-4 mr-2" /> : <UserCheck2 className="w-4 h-4 mr-2" />}
                                    {isActive ? 'Deactivate User' : 'Activate User'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-[var(--pro-border)]" />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();

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
                                            'office_manager': '2',
                                            'project_manager': '3',
                                            'client': '4',
                                            'crew': '5',
                                            'subcontractor': '6'
                                          };
                                          roleId = roleMap[userRole] || '';
                                        }
                                      }

                                      const mappedUser = {
                                        ...user,
                                        first_name: user.first_name || user.firstName || '',
                                        last_name: user.last_name || user.lastName || '',
                                        company_id: (user.company_id || user.companyId)?.toString() || '',
                                        role_id: roleId || '',
                                        role: user.role || '',
                                        role_name: user.role_name || user.roleName || '',
                                        is_active: user.is_active !== undefined ? user.is_active : (user.isActive !== undefined ? user.isActive : true),
                                        email: user.email || '',
                                        password: '',
                                        assigned_project_id: user.assigned_project_id || user.assignedProjectId || ''
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
                                      <div className="flex items-start gap-2 px-1 py-2">
                                        <Checkbox
                                          id={`force-delete-${user.id}`}
                                          checked={forceDelete}
                                          onCheckedChange={(checked) => setForceDelete(checked === true)}
                                          className="mt-0.5"
                                        />
                                        <label
                                          htmlFor={`force-delete-${user.id}`}
                                          className="text-sm text-[var(--pro-text-secondary)] cursor-pointer select-none"
                                        >
                                          Force delete — permanently remove this user and all their associated records (issues, comments, photos, etc.)
                                        </label>
                                      </div>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="min-h-[44px]" onClick={() => setForceDelete(false)}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => {
                                            deleteUserMutation.mutate({ id: user.id, force: forceDelete });
                                            setForceDelete(false);
                                          }}
                                          className={`min-h-[44px] ${forceDelete ? 'bg-red-700 hover:bg-red-800' : 'bg-[var(--pro-red)] hover:bg-[var(--pro-red)]/90'}`}
                                          disabled={deleteUserMutation.isPending}
                                        >
                                          {deleteUserMutation.isPending ? 'Deleting...' : forceDelete ? 'Force Delete' : 'Delete'}
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
                      const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email;
                      const initials = displayName
                        .split(' ')
                        .map((n: string) => n[0])
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
                                  toggleUserStatus.mutate({
                                    userId: user.id,
                                    isActive: !isActive
                                  });
                                }}
                                className={`min-h-[44px] ${isActive ? 'text-[var(--pro-text-secondary)]' : 'text-[var(--pro-mint)]'}`}
                              >
                                {isActive ? <UserX className="w-4 h-4 mr-2" /> : <UserCheck2 className="w-4 h-4 mr-2" />}
                                {isActive ? 'Deactivate User' : 'Activate User'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-[var(--pro-border)]" />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();

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
                                        'office_manager': '2',
                                        'project_manager': '3',
                                        'client': '4',
                                        'crew': '5',
                                        'subcontractor': '6'
                                      };
                                      roleId = roleMap[userRole] || '';
                                    }
                                  }

                                  const mappedUser = {
                                    ...user,
                                    first_name: user.first_name || user.firstName || '',
                                    last_name: user.last_name || user.lastName || '',
                                    company_id: (user.company_id || user.companyId)?.toString() || '',
                                    role_id: roleId || '',
                                    role: user.role || '',
                                    role_name: user.role_name || user.roleName || '',
                                    is_active: user.is_active !== undefined ? user.is_active : (user.isActive !== undefined ? user.isActive : true),
                                    email: user.email || '',
                                    password: '',
                                    assigned_project_id: user.assigned_project_id || user.assignedProjectId || ''
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
                                      onClick={() => deleteUserMutation.mutate({ id: user.id })}
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
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [isViewUsersDialogOpen, setIsViewUsersDialogOpen] = useState(false);
    const [showOnlyWithUsers, setShowOnlyWithUsers] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
    const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
    const [isInviteAdminDialogOpen, setIsInviteAdminDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
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
          const companyName = user.company_name || user.companyName;
          const companyId = user.company_id || user.companyId;

          // Use companyId as primary match, fall back to companyName
          if (companyId && companies) {
            const company = companies.find((c: Company) => c.id.toString() === companyId.toString());
            if (company) {
              counts[company.name] = (counts[company.name] || 0) + 1;
              return;
            }
          }
          if (companyName) {
            counts[companyName] = (counts[companyName] || 0) + 1;
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

    // Beta invite admin mutation
    const inviteAdminMutation = useMutation({
      mutationFn: async (email: string) => {
        const res = await apiRequest('/api/v1/beta/invite', { method: 'POST', body: { email } });
        return res.json();
      },
      onSuccess: (data) => {
        setIsInviteAdminDialogOpen(false);
        setInviteEmail('');
        toast({
          title: 'Invitation Sent',
          description: data.emailSent
            ? `An invitation email has been sent to ${data.email}`
            : `Invitation created for ${data.email} but email delivery failed. Check logs for the invite URL.`,
        });
      },
      onError: (error: any) => {
        toast({ title: 'Error', description: error.message || 'Failed to send invitation', variant: 'destructive' });
      },
    });

    // Beta reset password mutation
    const resetPasswordMutation = useMutation({
      mutationFn: async (email: string) => {
        const res = await apiRequest('/api/v1/beta/reset-password', { method: 'POST', body: { email } });
        return res.json();
      },
      onSuccess: (data) => {
        setIsResetPasswordDialogOpen(false);
        setResetEmail('');
        toast({
          title: 'Reset Link Sent',
          description: data.emailSent
            ? `A password reset email has been sent to ${data.email}`
            : `Reset created for ${data.email} but email delivery failed.`,
        });
      },
      onError: (error: any) => {
        toast({ title: 'Error', description: error.message || 'Failed to send reset link', variant: 'destructive' });
      },
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
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(true)}>
              <KeyRound className="w-4 h-4 mr-2" />
              Reset Password
            </Button>
            <Button variant="outline" onClick={() => setIsInviteAdminDialogOpen(true)}>
              <Send className="w-4 h-4 mr-2" />
              Invite Admin
            </Button>
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

        {/* Invite Admin Dialog */}
        <Dialog open={isInviteAdminDialogOpen} onOpenChange={(open) => { setIsInviteAdminDialogOpen(open); if (!open) setInviteEmail(''); }}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Invite Company Admin</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Send a beta invitation to a new company admin. They'll receive an email
              with a link to set up their company and create their account.
            </p>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="invite_email">Email Address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="invite_email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="pl-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inviteEmail.includes('@')) {
                        e.preventDefault();
                        inviteAdminMutation.mutate(inviteEmail);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsInviteAdminDialogOpen(false); setInviteEmail(''); }}>
                Cancel
              </Button>
              <Button
                onClick={() => inviteAdminMutation.mutate(inviteEmail)}
                disabled={inviteAdminMutation.isPending || !inviteEmail.includes('@')}
              >
                {inviteAdminMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </div>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordDialogOpen} onOpenChange={(open) => { setIsResetPasswordDialogOpen(open); if (!open) setResetEmail(''); }}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Reset Admin Password</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Send a password reset link to an existing admin. The link expires in 1 hour.
            </p>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="reset_email">Admin Email Address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset_email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="pl-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && resetEmail.includes('@')) {
                        e.preventDefault();
                        resetPasswordMutation.mutate(resetEmail);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsResetPasswordDialogOpen(false); setResetEmail(''); }}>
                Cancel
              </Button>
              <Button
                onClick={() => resetPasswordMutation.mutate(resetEmail)}
                disabled={resetPasswordMutation.isPending || !resetEmail.includes('@')}
              >
                {resetPasswordMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </div>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 mr-2" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                                {(user.first_name || user.email)?.[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No name'}</p>
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
                          setSelectedCompanyId(company.id);
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
  // MODULES MANAGEMENT COMPONENT (Root Admin Only)
  // ========================================================================
  const ModulesManagement = () => {
    const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
    const [updatingModule, setUpdatingModule] = useState<string | null>(null);

    // Module display names
    const moduleDisplayNames: Record<string, string> = {
      dashboard: 'Dashboard',
      projects: 'Work/Projects',
      projectHealth: 'Project Health',
      schedule: 'Schedule',
      photos: 'Photos',
      logs: 'Project Logs',
      clientPortal: 'Client Portal',
      rbacAdmin: 'RBAC Admin'
    };

    // Fetch all companies' module settings
    const { data: modulesData, isLoading: modulesLoading, refetch: refetchModules } = useQuery<{
      companies: Array<{
        companyId: string;
        companyName: string;
        enabledModules: Record<string, boolean>;
      }>;
      availableModules: string[];
    }>({
      queryKey: ['/api/v1/companies/modules/all'],
      enabled: isRootAdmin,
    });

    // Update single company modules
    const updateModulesMutation = useMutation({
      mutationFn: async ({ companyId, enabledModules }: { companyId: string; enabledModules: Record<string, boolean> }) => {
        const response = await apiRequest(`/api/v1/companies/${companyId}/modules`, {
          method: 'PATCH',
          body: { enabledModules }
        });
        if (!response.ok) {
          throw new Error('Failed to update modules');
        }
        return response.json();
      },
      onSuccess: () => {
        refetchModules();
        toast({ title: 'Success', description: 'Module settings updated' });
      },
      onError: (error: any) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    });

    // Bulk update module across all companies
    const bulkUpdateMutation = useMutation({
      mutationFn: async ({ module, enabled }: { module: string; enabled: boolean }) => {
        const response = await apiRequest('/api/v1/companies/modules/bulk', {
          method: 'PATCH',
          body: { module, enabled }
        });
        if (!response.ok) {
          throw new Error('Failed to bulk update module');
        }
        return response.json();
      },
      onSuccess: (data) => {
        refetchModules();
        const action = data.enabled ? 'enabled' : 'disabled';
        toast({
          title: 'Success',
          description: `${moduleDisplayNames[data.module] || data.module} ${action} for ${data.companiesUpdated} companies`
        });
        setUpdatingModule(null);
      },
      onError: (error: any) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        setUpdatingModule(null);
      }
    });

    const toggleCompanyExpansion = (companyId: string) => {
      const newExpanded = new Set(expandedCompanies);
      if (newExpanded.has(companyId)) {
        newExpanded.delete(companyId);
      } else {
        newExpanded.add(companyId);
      }
      setExpandedCompanies(newExpanded);
    };

    const handleModuleToggle = (companyId: string, moduleKey: string, currentModules: Record<string, boolean>) => {
      const updatedModules = {
        ...currentModules,
        [moduleKey]: !currentModules[moduleKey]
      };
      updateModulesMutation.mutate({ companyId, enabledModules: updatedModules });
    };

    const handleBulkAction = (moduleKey: string, enabled: boolean) => {
      setUpdatingModule(moduleKey);
      bulkUpdateMutation.mutate({ module: moduleKey, enabled });
    };

    // Expand all companies by default on first load
    React.useEffect(() => {
      if (modulesData?.companies && expandedCompanies.size === 0) {
        setExpandedCompanies(new Set(modulesData.companies.map(c => c.companyId)));
      }
    }, [modulesData]);

    if (modulesLoading) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-semibold">Module Management</h3>
            <p className="text-muted-foreground">Loading module settings...</p>
          </div>
        </div>
      );
    }

    const availableModules = modulesData?.availableModules || [];
    const companiesList = modulesData?.companies || [];

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-semibold">Module Management</h3>
          <p className="text-muted-foreground">Enable or disable modules for each company</p>
        </div>

        {/* Bulk Actions Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Bulk Actions
            </CardTitle>
            <CardDescription>
              Enable or disable a module across ALL companies at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {availableModules.map((moduleKey: string) => (
                <div key={moduleKey} className="border rounded-lg p-3">
                  <div className="font-medium text-sm mb-2">
                    {moduleDisplayNames[moduleKey] || moduleKey}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      disabled={bulkUpdateMutation.isPending}
                      onClick={() => handleBulkAction(moduleKey, true)}
                    >
                      <ToggleRight className="w-3 h-3 mr-1" />
                      Enable All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      disabled={bulkUpdateMutation.isPending}
                      onClick={() => handleBulkAction(moduleKey, false)}
                    >
                      <ToggleLeft className="w-3 h-3 mr-1" />
                      Disable All
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Per-Company Module Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Company Module Settings
            </CardTitle>
            <CardDescription>
              Configure modules for individual companies ({companiesList.length} companies)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {companiesList.map((company) => (
                <Collapsible
                  key={company.companyId}
                  open={expandedCompanies.has(company.companyId)}
                  onOpenChange={() => toggleCompanyExpansion(company.companyId)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedCompanies.has(company.companyId) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span className="font-medium">{company.companyName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {Object.values(company.enabledModules).filter(Boolean).length} / {availableModules.length} enabled
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                      {availableModules.map((moduleKey: string) => {
                        const isEnabled = company.enabledModules[moduleKey] !== false;
                        return (
                          <div
                            key={moduleKey}
                            className="flex items-center justify-between p-2 rounded border bg-background"
                          >
                            <span className="text-sm">
                              {moduleDisplayNames[moduleKey] || moduleKey}
                            </span>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => handleModuleToggle(
                                company.companyId,
                                moduleKey,
                                company.enabledModules
                              )}
                              disabled={updateModulesMutation.isPending}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
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
                  roles.map((role: Role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {getRoleName(role) || role.displayName || role.display_name} {String(role.company_id) === '0' ? '(Platform)' : '(Standard)'}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No roles available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          {/* Project Assignment - ONLY for Client role (roleId === '4') */}
          {editingUser?.role_id?.toString() === '4' && (
            <div>
              <Label htmlFor="edit_assigned_project">Assigned Project *</Label>
              <Select
                value={editingUser?.assigned_project_id || ''}
                onValueChange={(value) => setEditingUser(editingUser ? {...editingUser, assigned_project_id: value} : null)}
              >
                <SelectTrigger id="edit_assigned_project">
                  <SelectValue placeholder="Select project for client" />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <SelectItem value="none" disabled>No projects available</SelectItem>
                  ) : (
                    projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Client users can only access this specific project
              </p>
            </div>
          )}
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
                // Validate project required for client role
                if (editingUser.role_id?.toString() === '4' && !editingUser.assigned_project_id) {
                  toast({
                    title: 'Error',
                    description: 'Project assignment is required for client users',
                    variant: 'destructive'
                  });
                  return;
                }

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
                // Include assigned_project_id for client users
                if (editingUser.role_id?.toString() === '4') {
                  updatePayload.assigned_project_id = editingUser.assigned_project_id || null;
                }

                try {
                  await updateUserMutation.mutateAsync({
                    id: editingUser.id, 
                    data: updatePayload
                  });
                  
                  // Update cache immediately with all edited fields
                  const roleId = editingUser.role_id;
                  const roleName = roleId === '1' ? 'Admin' :
                                 roleId === '2' ? 'Office Manager' :
                                 roleId === '3' ? 'Project Manager' :
                                 roleId === '4' ? 'Client' :
                                 roleId === '5' ? 'Crew' : 'Subcontractor';
                  const role = roleId === '1' ? 'admin' :
                              roleId === '2' ? 'office_manager' :
                              roleId === '3' ? 'project_manager' :
                              roleId === '4' ? 'client' :
                              roleId === '5' ? 'crew' : 'subcontractor';

                  queryClient.setQueryData(['/api/rbac/users'], (old: any) => {
                    if (!old) return old;
                    return old.map((user: any) =>
                      user.id === editingUser.id
                        ? {
                            ...user,
                            first_name: editingUser.first_name,
                            last_name: editingUser.last_name,
                            email: editingUser.email,
                            is_active: editingUser.is_active,
                            role_id: roleId,
                            role: role,
                            role_name: roleName,
                            assigned_project_id: editingUser.assigned_project_id,
                            name: `${editingUser.first_name || ''} ${editingUser.last_name || ''}`.trim(),
                          }
                        : user
                    );
                  });
                  
                  setIsEditUserDialogOpen(false);
                  setEditingUser(null);

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
        { value: 'modules', label: 'Modules', icon: <Settings className="w-4 h-4" /> },
        { value: 'branding', label: 'Branding', icon: <Palette className="w-4 h-4" /> },
      ]
    : [
        { value: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
        { value: 'branding', label: 'Branding', icon: <Palette className="w-4 h-4" /> },
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
        {activeTab === 'users' && renderUserManagement()}
        {activeTab === 'roles' && isRootAdmin && <RoleManagement />}
        {activeTab === 'companies' && isRootAdmin && <CompanyManagement />}
        {activeTab === 'permissions' && isRootAdmin && <PermissionsOverview />}
        {activeTab === 'modules' && isRootAdmin && <ModulesManagement />}
        {activeTab === 'branding' && <CompanyBrandingForm />}
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