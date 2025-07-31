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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Users, Shield, Building, UserCheck, Settings, Plus, Edit, Trash2, Eye, Key, AlertCircle } from 'lucide-react';

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
  type: string;
  subscription_tier: string;
  created_at: string;
  is_active: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_id: string;
  role_id: string;
  is_active: boolean;
  created_at: string;
  last_login: string;
  role_name?: string;
  company_name?: string;
}

export default function RBACAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('users');

  // Data fetching
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ['/api/rbac/permissions'],
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/rbac/roles'],
  });

  const { data: companies = [], isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/rbac/companies'],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<UserProfile[]>({
    queryKey: ['/api/rbac/users'],
  });

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

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/rbac/users/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/users'] });
      toast({ title: 'Success', description: 'User updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/rbac/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/users'] });
      toast({ title: 'Success', description: 'User deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
    mutationFn: (companyData: any) => apiRequest('/api/rbac/companies', { method: 'POST', body: companyData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/companies'] });
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
    const [newUser, setNewUser] = useState({
      email: '',
      first_name: '',
      last_name: '',
      company_id: '',
      role_id: '',
      password: ''
    });

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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>Add a new user to the system</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                  />
                </div>
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
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUser.role_id} onValueChange={(value) => setNewUser({ ...newUser, role_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles
                        .filter((role: Role) => role.company_id === newUser.company_id || role.is_template)
                        .map((role: Role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name} {role.is_template && '(Template)'}
                          </SelectItem>
                        ))}
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
                    createUserMutation.mutate(newUser);
                    setIsCreateDialogOpen(false);
                    setNewUser({ email: '', first_name: '', last_name: '', company_id: '', role_id: '', password: '' });
                  }}
                  disabled={createUserMutation.isPending}
                >
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>Update user information</DialogDescription>
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
                    value={editingUser?.company_id || ''} 
                    onValueChange={(value) => setEditingUser(prev => prev ? {...prev, company_id: value} : null)}
                  >
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
                <div>
                  <Label htmlFor="edit_role">Role</Label>
                  <Select 
                    value={editingUser?.role_id || ''} 
                    onValueChange={(value) => setEditingUser(prev => prev ? {...prev, role_id: value} : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role: Role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
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
                      updateUserMutation.mutate({ 
                        id: editingUser.id, 
                        data: {
                          email: editingUser.email,
                          first_name: editingUser.first_name,
                          last_name: editingUser.last_name,
                          company_id: editingUser.company_id,
                          role_id: editingUser.role_id,
                          is_active: editingUser.is_active
                        }
                      });
                      setIsEditDialogOpen(false);
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

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Loading users...</TableCell>
                  </TableRow>
                ) : users && Array.isArray(users) ? (
                  users.map((user: UserProfile) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.company_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'destructive'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingUser(user);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => deleteUserMutation.mutate(user.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>Define a new role with specific permissions</DialogDescription>
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
    const [newCompany, setNewCompany] = useState({
      name: '',
      type: 'customer',
      subscription_tier: 'basic'
    });

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

    // Fetch users for selected company
    const { data: companyUsers = [], isLoading: companyUsersLoading } = useQuery<any[]>({
      queryKey: ['/api/rbac/companies', selectedCompanyId, 'users'],
      enabled: !!selectedCompanyId && isViewUsersDialogOpen,
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-semibold">Company Management</h3>
            <p className="text-muted-foreground">Manage companies and tenants</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
                <DialogDescription>Add a new company to the system</DialogDescription>
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
                  <Label htmlFor="type">Company Type</Label>
                  <Select value={newCompany.type} onValueChange={(value) => setNewCompany({ ...newCompany, type: value })}>
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
                  <Select value={newCompany.subscription_tier} onValueChange={(value) => setNewCompany({ ...newCompany, subscription_tier: value })}>
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
                    createCompanyMutation.mutate(newCompany);
                    setIsCreateDialogOpen(false);
                    setNewCompany({ name: '', type: 'customer', subscription_tier: 'basic' });
                  }}
                  disabled={createCompanyMutation.isPending}
                >
                  {createCompanyMutation.isPending ? 'Creating...' : 'Create Company'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Company Dialog */}
        <Dialog open={isEditCompanyDialogOpen} onOpenChange={setIsEditCompanyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Company</DialogTitle>
              <DialogDescription>Update company information</DialogDescription>
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
                <Label htmlFor="edit_type">Company Type</Label>
                <Select 
                  value={editingCompany?.type || ''} 
                  onValueChange={(value) => setEditingCompany(prev => prev ? {...prev, type: value} : null)}
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
                  value={editingCompany?.subscription_tier || ''} 
                  onValueChange={(value) => setEditingCompany(prev => prev ? {...prev, subscription_tier: value} : null)}
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
                        type: editingCompany.type,
                        subscription_tier: editingCompany.subscription_tier,
                        is_active: editingCompany.is_active
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
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Company Users</DialogTitle>
              <DialogDescription>
                View all users assigned to {companies.find(c => c.id.toString() === selectedCompanyId?.toString())?.name}
              </DialogDescription>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companiesLoading ? (
            <Card>
              <CardContent className="p-6">
                <p>Loading companies...</p>
              </CardContent>
            </Card>
          ) : (
            companies.map((company: Company) => (
              <Card key={company.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{company.name}</CardTitle>
                      <CardDescription>
                        {company.type} • {company.subscription_tier}
                      </CardDescription>
                    </div>
                    <Badge variant={company.is_active ? 'default' : 'destructive'}>
                      {company.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(company.created_at).toLocaleDateString()}
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Companies
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <RoleManagement />
        </TabsContent>

        <TabsContent value="companies" className="mt-6">
          <CompanyManagement />
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <PermissionsOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
}