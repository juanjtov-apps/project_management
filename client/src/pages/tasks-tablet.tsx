import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { List } from "react-window";
import { Plus, Edit, Trash2, Copy, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatCard } from "@/components/ui/stat-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StickyHeader } from "@/components/ui/sticky-header";
import { TaskCard as TabletTaskCard } from "@/components/ui/task-card";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Task, InsertTask, Project, User } from "@shared/schema";

// Helper functions
const isTaskOverdue = (task: Task): boolean => {
  if (!task.dueDate) return false;
  return new Date(task.dueDate) < new Date();
};

const isTaskDueThisWeek = (task: Task): boolean => {
  if (!task.dueDate) return false;
  const dueDate = new Date(task.dueDate);
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return dueDate >= now && dueDate <= weekFromNow;
};

export default function TabletTasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  
  // Debounced search for performance
  const debouncedSearch = useDebouncedValue(searchTerm, 250);

  // UI states with localStorage persistence
  const [viewMode, setViewMode] = useLocalStorage<"list" | "canvas">("tasks-view-mode", "list");
  const [expandedProjects, setExpandedProjects] = useLocalStorage<Record<string, boolean>>("tasks-expanded-projects", {});
  
  // Selection state
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Data queries
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users/managers"],
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data: InsertTask) => apiRequest("/api/tasks", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Task created successfully" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertTask> }) =>
      apiRequest(`/api/tasks/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsEditDialogOpen(false);
      setEditingTask(null);
      editForm.reset();
      toast({ title: "Task updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setTaskToDelete(null);
      setIsDeleteDialogOpen(false);
      toast({ title: "Task deleted successfully" });
    },
  });

  // Forms
  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: null,
      category: "general",
      status: "pending",
      priority: "medium",
      dueDate: undefined,
      assigneeId: null,
    },
  });

  const editForm = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: null,
      category: "general",
      status: "pending",
      priority: "medium",
      dueDate: undefined,
      assigneeId: null,
    },
  });

  // Task filtering and stats
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        task.description?.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" && !task.assigneeId) ||
        (assigneeFilter === "me" && task.assigneeId === (user as any)?.id) ||
        task.assigneeId === assigneeFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [tasks, debouncedSearch, statusFilter, priorityFilter, assigneeFilter, user]);

  const taskStats = useMemo(() => {
    return {
      total: filteredTasks.length,
      overdue: filteredTasks.filter(isTaskOverdue).length,
      dueThisWeek: filteredTasks.filter(isTaskDueThisWeek).length,
      completed: filteredTasks.filter((t) => t.status === "completed").length,
    };
  }, [filteredTasks]);

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const grouped: Record<string, { project: Project; tasks: Task[] }> = {};
    
    projects.forEach((project) => {
      const projectTasks = filteredTasks.filter((t) => t.projectId === project.id);
      if (projectTasks.length > 0) {
        grouped[project.id] = { project, tasks: projectTasks };
      }
    });

    return grouped;
  }, [projects, filteredTasks]);

  const unassignedTasks = useMemo(() => {
    return filteredTasks.filter((t) => !t.projectId);
  }, [filteredTasks]);

  // Helper to get user name
  const getUserName = (userId: string | null): string | null => {
    if (!userId) return null;
    const foundUser = users.find((u) => u.id === userId);
    if (!foundUser) return null;
    return `${foundUser.firstName || ""} ${foundUser.lastName || ""}`.trim() || foundUser.email || null;
  };

  // Handlers
  const handleCreateTask = (data: InsertTask) => {
    const taskData = {
      ...data,
      description: data.description?.trim() || null,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    };
    createTaskMutation.mutate(taskData);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    editForm.reset({
      title: task.title,
      description: task.description || "",
      projectId: task.projectId,
      category: task.category || "general",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      assigneeId: task.assigneeId,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = (data: InsertTask) => {
    if (!editingTask) return;
    const taskData = {
      ...data,
      description: data.description?.trim() || null,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    };
    updateTaskMutation.mutate({ id: editingTask.id, data: taskData });
  };

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete.id);
    }
  };

  const handleStatusChange = (task: Task, newStatus: string) => {
    // Optimistic update
    updateTaskMutation.mutate({
      id: task.id,
      data: { status: newStatus },
    });
  };

  const handleToggleProject = (projectId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedTasks(new Set());
  };

  const handleBulkStatusChange = (newStatus: string) => {
    selectedTasks.forEach((taskId) => {
      updateTaskMutation.mutate({ id: taskId, data: { status: newStatus } });
    });
    handleClearSelection();
  };

  const handleBulkDelete = () => {
    selectedTasks.forEach((taskId) => {
      deleteTaskMutation.mutate(taskId);
    });
    handleClearSelection();
  };

  // Active filters for FilterBar
  const activeFilters = [];
  if (statusFilter !== "all") {
    activeFilters.push({
      id: "status",
      label: `Status: ${statusFilter}`,
      onClick: () => setStatusFilter("all"),
    });
  }
  if (priorityFilter !== "all") {
    activeFilters.push({
      id: "priority",
      label: `Priority: ${priorityFilter}`,
      onClick: () => setPriorityFilter("all"),
    });
  }
  if (assigneeFilter !== "all") {
    activeFilters.push({
      id: "assignee",
      label: `Assignee: ${assigneeFilter === "unassigned" ? "Unassigned" : assigneeFilter === "me" ? "Me" : getUserName(assigneeFilter)}`,
      onClick: () => setAssigneeFilter("all"),
    });
  }

  const handleClearAllFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setAssigneeFilter("all");
    setSearchTerm("");
  };

  const isExpanded = (id: string) => expandedProjects[id] !== false;

  if (tasksLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <LoadingSkeleton variant="list" count={5} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Task Management</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Organize and track your construction tasks
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-task" className="tap-target">
            <Plus className="w-5 h-5 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Stats Row - Sticky */}
      <div className="sticky-top bg-background border-b border-border px-6 py-4 z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Tasks"
            value={taskStats.total}
            subtitle="All tasks"
            onClick={() => handleClearAllFilters()}
            data-testid="stat-total-tasks"
          />
          <StatCard
            title="Overdue"
            value={taskStats.overdue}
            subtitle="Behind schedule"
            onClick={() => setStatusFilter("overdue")}
            data-testid="stat-overdue-tasks"
          />
          <StatCard
            title="Due This Week"
            value={taskStats.dueThisWeek}
            subtitle="Due within 7 days"
            data-testid="stat-due-this-week"
          />
          <StatCard
            title="Completed"
            value={taskStats.completed}
            subtitle="Finished tasks"
            onClick={() => setStatusFilter("completed")}
            data-testid="stat-completed-tasks"
          />
        </div>
      </div>

      {/* Filter Bar - Sticky */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search tasks..."
        filters={activeFilters}
        onClearAll={activeFilters.length > 0 ? handleClearAllFilters : undefined}
        sticky
        data-testid="filter-bar"
        rightActions={
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] tap-target" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px] tap-target" data-testid="filter-priority">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <SegmentedControl
              options={[
                { value: "list", label: "List" },
                { value: "canvas", label: "Canvas" },
              ]}
              value={viewMode}
              onChange={(value) => setViewMode(value as "list" | "canvas")}
              data-testid="view-mode-toggle"
            />
          </>
        }
      />

      {/* Main Content */}
      <div className="px-6 py-6">
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No tasks found"
            description={searchTerm || activeFilters.length > 0 ? "Try adjusting your filters" : "Create your first task to get started"}
            action={
              searchTerm || activeFilters.length > 0
                ? undefined
                : { label: "Create Task", onClick: () => setIsCreateDialogOpen(true) }
            }
            data-testid="empty-state"
          />
        ) : (
          <div className="space-y-6">
            {/* Tasks Grouped by Project */}
            {Object.entries(tasksByProject).map(([projectId, { project, tasks: projectTasks }]) => (
              <div key={projectId}>
                <StickyHeader
                  title={project.name}
                  count={projectTasks.length}
                  isExpanded={isExpanded(projectId)}
                  onToggle={() => handleToggleProject(projectId)}
                  data-testid={`project-header-${projectId}`}
                />
                {isExpanded(projectId) && (
                  projectTasks.length > 100 ? (
                    // Virtualized list for performance with large datasets
                    <div className="mt-3">
                      <List
                        height={600}
                        itemCount={projectTasks.length}
                        itemSize={120}
                        width="100%"
                      >
                        {({ index, style }: { index: number; style: React.CSSProperties }) => {
                          const task = projectTasks[index];
                          const assignees = task.assigneeId
                            ? [{ id: task.assigneeId, name: getUserName(task.assigneeId) || "Unknown" }]
                            : [];

                          return (
                            <div style={style} className="px-3">
                              <TabletTaskCard
                                key={task.id}
                                id={task.id}
                                title={task.title}
                                projectName={project.name}
                                location={project.location || undefined}
                                priority={task.priority as any}
                                status={task.status}
                                dueDate={task.dueDate ? new Date(task.dueDate) : undefined}
                                isOverdue={isTaskOverdue(task)}
                                assignees={assignees}
                                searchTerm={debouncedSearch}
                                onStatusChange={(newStatus) => handleStatusChange(task, newStatus)}
                                menuItems={[
                                  { label: "Edit", icon: Edit, onClick: () => handleEditTask(task) },
                                  { label: "Duplicate", icon: Copy, onClick: () => {} },
                                  { label: "Delete", icon: Trash2, onClick: () => handleDeleteClick(task), variant: "danger", separator: true },
                                ]}
                                onSelect={() => handleSelectTask(task.id)}
                                isSelected={selectedTasks.has(task.id)}
                                data-testid={`task-card-${task.id}`}
                              />
                            </div>
                          );
                        }}
                      </List>
                    </div>
                  ) : (
                    // Regular list for smaller datasets
                    <div className="mt-3 space-y-3">
                      {projectTasks.map((task) => {
                        const assignees = task.assigneeId
                          ? [{ id: task.assigneeId, name: getUserName(task.assigneeId) || "Unknown" }]
                          : [];

                        return (
                          <TabletTaskCard
                            key={task.id}
                            id={task.id}
                            title={task.title}
                            projectName={project.name}
                            location={project.location || undefined}
                            priority={task.priority as any}
                            status={task.status}
                            dueDate={task.dueDate ? new Date(task.dueDate) : undefined}
                            isOverdue={isTaskOverdue(task)}
                            assignees={assignees}
                            searchTerm={debouncedSearch}
                            onStatusChange={(newStatus) => handleStatusChange(task, newStatus)}
                            menuItems={[
                              { label: "Edit", icon: Edit, onClick: () => handleEditTask(task) },
                              { label: "Duplicate", icon: Copy, onClick: () => {} },
                              { label: "Delete", icon: Trash2, onClick: () => handleDeleteClick(task), variant: "danger", separator: true },
                            ]}
                            onSelect={() => handleSelectTask(task.id)}
                            isSelected={selectedTasks.has(task.id)}
                            data-testid={`task-card-${task.id}`}
                          />
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            ))}

            {/* Unassigned Tasks */}
            {unassignedTasks.length > 0 && (
              <div>
                <StickyHeader
                  title="Unassigned Tasks"
                  count={unassignedTasks.length}
                  isExpanded={isExpanded("unassigned")}
                  onToggle={() => handleToggleProject("unassigned")}
                  data-testid="unassigned-header"
                />
                {isExpanded("unassigned") && (
                  <div className="mt-3 space-y-3">
                    {unassignedTasks.map((task) => {
                      const assignees = task.assigneeId
                        ? [{ id: task.assigneeId, name: getUserName(task.assigneeId) || "Unknown" }]
                        : [];

                      return (
                        <TabletTaskCard
                          key={task.id}
                          id={task.id}
                          title={task.title}
                          priority={task.priority as any}
                          status={task.status}
                          dueDate={task.dueDate ? new Date(task.dueDate) : undefined}
                          isOverdue={isTaskOverdue(task)}
                          assignees={assignees}
                          searchTerm={debouncedSearch}
                          onStatusChange={(newStatus) => handleStatusChange(task, newStatus)}
                          menuItems={[
                            { label: "Edit", icon: Edit, onClick: () => handleEditTask(task) },
                            { label: "Duplicate", icon: Copy, onClick: () => {} },
                            { label: "Delete", icon: Trash2, onClick: () => handleDeleteClick(task), variant: "danger", separator: true },
                          ]}
                          onSelect={() => handleSelectTask(task.id)}
                          isSelected={selectedTasks.has(task.id)}
                          data-testid={`task-card-${task.id}`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Bar - When tasks selected */}
      {selectedTasks.size > 0 && (
        <BottomActionBar
          selectedCount={selectedTasks.size}
          actions={[
            { label: "Mark Pending", onClick: () => handleBulkStatusChange("pending") },
            { label: "Mark In Progress", onClick: () => handleBulkStatusChange("in_progress") },
            { label: "Mark Completed", onClick: () => handleBulkStatusChange("completed") },
            { label: "Delete", onClick: handleBulkDelete, variant: "destructive" },
          ]}
          onClear={handleClearSelection}
          data-testid="bottom-action-bar"
        />
      )}

      {/* Create Task Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateTask)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-task-title" placeholder="Enter task title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-task-description" placeholder="Enter task description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-project">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Project</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-assignee">
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {getUserName(u.id) || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="select-due-date"
                            >
                              {field.value ? format(new Date(field.value), "PPP") : "Pick a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateTask)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-title" placeholder="Enter task title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-edit-description" placeholder="Enter task description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-project">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Project</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-assignee">
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {getUserName(u.id) || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="select-edit-due-date"
                            >
                              {field.value ? format(new Date(field.value), "PPP") : "Pick a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit-edit" disabled={updateTaskMutation.isPending}>
                  {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
