import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrganizationSelectorProps {
  currentUser: any;
}

export default function OrganizationSelector({ currentUser }: OrganizationSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Only show for root admins
  if (!currentUser?.isRootAdmin && !currentUser?.isRoot) {
    return null;
  }

  // Fetch all companies
  const { data: companies = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/companies'],
    retry: false,
    enabled: !!currentUser?.isRootAdmin || !!currentUser?.isRoot,
  });

  const currentOrgId = currentUser?.currentOrganizationId || currentUser?.current_organization_id;
  const currentOrg = companies.find(c => c.id === currentOrgId);

  // Mutation to set organization context
  const setContextMutation = useMutation({
    mutationFn: async (orgId: string | null) => {
      const response = await fetch('/api/v1/auth/set-organization-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ organization_id: orgId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to set organization context');
      }

      return response.json();
    },
    onSuccess: (data, orgId) => {
      // Invalidate user query to refresh current user data
      queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/user'] });
      
      // Invalidate all data queries to refresh with new context
      queryClient.invalidateQueries();
      
      toast({
        title: "Organization context updated",
        description: orgId 
          ? `Now viewing: ${currentOrg?.name || orgId}`
          : "Viewing all organizations",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleChange = (value: string) => {
    if (value === "all") {
      setContextMutation.mutate(null);
    } else {
      setContextMutation.mutate(value);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
        <Building2 className="h-4 w-4" />
        <span>Loading organizations...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <Select
        value={currentOrgId || "all"}
        onValueChange={handleChange}
        disabled={setContextMutation.isPending}
      >
        <SelectTrigger className="w-full h-9">
          <div className="flex items-center gap-2">
            {currentOrgId ? (
              <Building2 className="h-4 w-4 text-slate-500" />
            ) : (
              <Globe className="h-4 w-4 text-slate-500" />
            )}
            <SelectValue>
              {currentOrgId ? (currentOrg?.name || `Company ${currentOrgId}`) : "All Organizations"}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>All Organizations</span>
            </div>
          </SelectItem>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{company.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

