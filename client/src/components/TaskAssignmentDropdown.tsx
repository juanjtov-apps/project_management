import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Task } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface TaskAssignmentDropdownProps {
  task: Task;
  onAssignmentChange?: () => void;
}

export function TaskAssignmentDropdown({ task, onAssignmentChange }: TaskAssignmentDropdownProps) {
  const queryClient = useQueryClient();
  
  // Fetch managers/team members
  const { data: managers = [], isLoading: managersLoading } = useQuery<User[]>({
    queryKey: ["/api/users/managers"],
  });

  // Assignment mutation
  const assignTaskMutation = useMutation({
    mutationFn: async (assigneeId: string | null) => {
      return apiRequest(`/api/tasks/${task.id}/assign`, {
        method: "PATCH",
        body: { assignee_id: assigneeId }
      });
    },
    onSuccess: () => {
      // Only invalidate tasks query to prevent circular invalidation loops
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      onAssignmentChange?.();
    },
    onError: (error) => {
      console.error("Error assigning task:", error);
    }
  });

  const handleAssignmentChange = (value: string) => {
    const assigneeId = value === "unassigned" ? null : value;
    assignTaskMutation.mutate(assigneeId);
  };

  // Find current assignee
  const currentAssignee = managers.find(manager => manager.id === task.assigneeId);
  const currentValue = task.assigneeId || "unassigned";

  // Helper function to get display name
  const getDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    return user.email || 'Unknown User';
  };

  return (
    <Select
      value={currentValue}
      onValueChange={handleAssignmentChange}
      disabled={managersLoading || assignTaskMutation.isPending}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Assign to...">
          {managersLoading ? (
            "Loading..."
          ) : currentAssignee ? (
            getDisplayName(currentAssignee)
          ) : (
            "Unassigned"
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {managers.map((manager) => (
          <SelectItem key={manager.id} value={manager.id}>
            {getDisplayName(manager)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}