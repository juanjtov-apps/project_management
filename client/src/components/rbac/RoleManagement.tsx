import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, Settings, Plus } from 'lucide-react';

// Types
interface Company {
  id: number;
  name: string;
  domain: string;
  status: 'active' | 'suspended' | 'pending';
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: number;
  company_id: number;
  name: string;
  description: string;
  template_id?: number;
  custom_permissions: number[];
  is_template: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RoleTemplate {
  id: number;
  name: string;
  description: string;
  category: 'platform' | 'company' | 'project';
  permission_set: number[];
  is_system_template: boolean;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
  description: string;
  category: 'platform' | 'company' | 'project';
  requires_elevation: boolean;
}

interface CompanyUser {
  id: number;
  company_id: number;
  user_id: string;
  role_id: number;
  granted_by_user_id?: string;
  granted_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
    is_active: boolean;
    last_login_at?: string;
    mfa_enabled: boolean;
  };
  role: {
    id: number;
    name: string;
    description: string;
    company_id: number;
  };
}

// Schemas
const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
  template_id: z.number().optional(),
  custom_permissions: z.array(z.number()).default([]),
});

const assignUserSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  role_id: z.number().min(1, 'Role selection is required'),
  expires_at: z.string().optional(),
});

type CreateRoleForm = z.infer<typeof createRoleSchema>;
type AssignUserForm = z.infer<typeof assignUserSchema>;

interface RoleManagementProps {
  companyId: number;
}

export function RoleManagement({ companyId }: RoleManagementProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isAssignUserOpen, setIsAssignUserOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch company data
  const { data: company } = useQuery({
    queryKey: ['/rbac/companies', companyId],
    enabled: !!companyId,
  });

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['/rbac/companies', companyId, 'roles'],
    enabled: !!companyId,
  });

  // Fetch role templates
  const { data: roleTemplates = [] } = useQuery({
    queryKey: ['/rbac/role-templates'],
  });

  // Fetch permissions
  const { data: permissions = [] } = useQuery({
    queryKey: ['/rbac/permissions'],
  });

  // Fetch company users
  const { data: companyUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/rbac/companies', companyId, 'users'],
    enabled: !!companyId,
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: CreateRoleForm) => {
      return await apiRequest(`/rbac/companies/${companyId}/roles`, {
        method: 'POST',
        body: JSON.stringify({ ...data, company_id: companyId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/rbac/companies', companyId, 'roles'] });
      setIsCreateRoleOpen(false);
      toast({
        title: 'Success',
        description: 'Role created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create role',
        variant: 'destructive',
      });
    },
  });

  // Assign user mutation
  const assignUserMutation = useMutation({
    mutationFn: async (data: AssignUserForm) => {
      return await apiRequest(`/rbac/companies/${companyId}/users`, {
        method: 'POST',
        body: JSON.stringify({ ...data, company_id: companyId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/rbac/companies', companyId, 'users'] });
      setIsAssignUserOpen(false);
      toast({
        title: 'Success',
        description: 'User assigned successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign user',
        variant: 'destructive',
      });
    },
  });

  // Forms
  const createRoleForm = useForm<CreateRoleForm>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: '',
      description: '',
      custom_permissions: [],
    },
  });

  const assignUserForm = useForm<AssignUserForm>({
    resolver: zodResolver(assignUserSchema),
    defaultValues: {
      user_id: '',
      role_id: 0,
    },
  });

  const onCreateRole = (data: CreateRoleForm) => {
    createRoleMutation.mutate(data);
  };

  const onAssignUser = (data: AssignUserForm) => {
    assignUserMutation.mutate(data);
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'platform': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'company': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'project': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Please select a company to manage roles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Header */}
      {company && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {company.name} - Role Management
                </CardTitle>
                <CardDescription>
                  Manage roles and user assignments for this company
                </CardDescription>
              </div>
              <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                {company.status}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roles Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Company Roles
                </CardTitle>
                <CardDescription>
                  Manage roles and their permissions
                </CardDescription>
              </div>
              <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Role</DialogTitle>
                    <DialogDescription>
                      Create a new role for this company
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...createRoleForm}>
                    <form onSubmit={createRoleForm.handleSubmit(onCreateRole)} className="space-y-4">
                      <FormField
                        control={createRoleForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter role name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createRoleForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter role description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createRoleForm.control}
                        name="template_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base Template (Optional)</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role template" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {roleTemplates.filter((t: RoleTemplate) => t.category !== 'platform').map((template: RoleTemplate) => (
                                  <SelectItem key={template.id} value={template.id.toString()}>
                                    {template.name} - {template.description}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createRoleMutation.isPending}>
                          {createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {rolesLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : roles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No roles found. Create a role to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {roles.map((role: Role) => (
                  <div
                    key={role.id}
                    className={`p-3 rounded border cursor-pointer transition-colors ${
                      selectedRole?.id === role.id
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-border'
                    }`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{role.name}</h4>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={role.is_active ? 'default' : 'secondary'}>
                          {role.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {role.template_id && (
                          <Badge variant="outline">Template</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Company Users
                </CardTitle>
                <CardDescription>
                  Manage user role assignments
                </CardDescription>
              </div>
              <Dialog open={isAssignUserOpen} onOpenChange={setIsAssignUserOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Assign User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign User to Role</DialogTitle>
                    <DialogDescription>
                      Assign a user to a role in this company
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...assignUserForm}>
                    <form onSubmit={assignUserForm.handleSubmit(onAssignUser)} className="space-y-4">
                      <FormField
                        control={assignUserForm.control}
                        name="user_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>User ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter user ID" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={assignUserForm.control}
                        name="role_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {roles.filter((role: Role) => role.is_active).map((role: Role) => (
                                  <SelectItem key={role.id} value={role.id.toString()}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={assignUserForm.control}
                        name="expires_at"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiration Date (Optional)</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsAssignUserOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={assignUserMutation.isPending}>
                          {assignUserMutation.isPending ? 'Assigning...' : 'Assign User'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : companyUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users assigned. Assign users to roles to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {companyUsers.map((companyUser: CompanyUser) => (
                  <div key={companyUser.id} className="p-3 rounded border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {companyUser.user.first_name?.[0] || companyUser.user.email?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {companyUser.user.first_name} {companyUser.user.last_name} 
                            {!companyUser.user.first_name && companyUser.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">{companyUser.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{companyUser.role.name}</Badge>
                        <Badge variant={companyUser.is_active ? 'default' : 'secondary'}>
                          {companyUser.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {companyUser.user.mfa_enabled && (
                          <Badge variant="outline" className="text-xs">MFA</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role Details */}
      {selectedRole && (
        <Card>
          <CardHeader>
            <CardTitle>Role Details: {selectedRole.name}</CardTitle>
            <CardDescription>{selectedRole.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Role Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={selectedRole.is_active ? 'default' : 'secondary'}>
                      {selectedRole.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Template-based:</span>
                    <span>{selectedRole.template_id ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(selectedRole.created_at).toLocaleDateString()}</span>
                  </div>
                  {selectedRole.custom_permissions.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Custom Permissions:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedRole.custom_permissions.map((permId) => {
                          const perm = permissions.find((p: Permission) => p.id === permId);
                          return perm ? (
                            <Badge key={permId} variant="outline" className="text-xs">
                              {perm.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedRole.template_id && (
                <div>
                  <h4 className="font-medium mb-2">Template Permissions</h4>
                  <div className="space-y-1">
                    {(() => {
                      const template = roleTemplates.find((t: RoleTemplate) => t.id === selectedRole.template_id);
                      return template?.permission_set.map((permId: number) => {
                        const perm = permissions.find((p: Permission) => p.id === permId);
                        return perm ? (
                          <div key={permId} className="flex items-center justify-between text-sm">
                            <span>{perm.name}</span>
                            <Badge variant="outline" className={`text-xs ${getCategoryBadgeColor(perm.category)}`}>
                              {perm.category}
                            </Badge>
                          </div>
                        ) : null;
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RoleManagement;