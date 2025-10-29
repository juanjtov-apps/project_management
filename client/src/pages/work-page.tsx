import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  FolderOpen,
  ListTodo,
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatCard } from "@/components/ui/stat-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ProjectCard } from "@/components/ui/project-card";
import { TaskCard as TabletTaskCard } from "@/components/ui/task-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema, insertTaskSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import type { Project, InsertProject, Task, InsertTask, User } from "@shared/schema";

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

type WorkSegment = "projects" | "tasks";

export default function WorkPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  // Work segment control with localStorage persistence
  const [activeSegment, setActiveSegment] = useLocalStorage<WorkSegment>("work.segment", "projects");

  // Detect route and set appropriate segment for deep linking
  useEffect(() => {
    if (location === "/projects") {
      setActiveSegment("projects");
    } else if (location === "/tasks") {
      setActiveSegment("tasks");
    }
    // If location is /work, use whatever is in localStorage (activeSegment)
  }, [location, setActiveSegment]);

  // Projects - Dialog states
  const [isProjectCreateDialogOpen, setIsProjectCreateDialogOpen] = useState(false);
  const [isProjectEditDialogOpen, setIsProjectEditDialogOpen] = useState(false);
  const [isProjectDeleteDialogOpen, setIsProjectDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Projects - Filter states
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("all");
  const [projectLocationFilter, setProjectLocationFilter] = useState<string>("all");
  const [projectSortBy, setProjectSortBy] = useState<"recent" | "name">("recent");
  const [projectSortOrder, setProjectSortOrder] = useState<"asc" | "desc">("desc");
  const [projectViewMode, setProjectViewMode] = useLocalStorage<"list" | "grid">(
    "projects-view-mode",
    "grid"
  );

  // Tasks - Dialog states
  const [isTaskCreateDialogOpen, setIsTaskCreateDialogOpen] = useState(false);
  const [isTaskEditDialogOpen, setIsTaskEditDialogOpen] = useState(false);
  const [isTaskDeleteDialogOpen, setIsTaskDeleteDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Tasks - Filter states
  const [taskSearchTerm, setTaskSearchTerm] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>("all");
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<string>("all");
  const [taskViewMode, setTaskViewMode] = useLocalStorage<"list" | "canvas">(
    "tasks-view-mode",
    "list"
  );
  const [expandedProjects, setExpandedProjects] = useLocalStorage<Record<string, boolean>>(
    "tasks-expanded-projects",
    {}
  );

  // Debounced searches
  const debouncedProjectSearch = useDebouncedValue(projectSearchTerm, 250);
  const debouncedTaskSearch = useDebouncedValue(taskSearchTerm, 250);

  // Data queries
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users/managers"],
  });

  // === PROJECT MUTATIONS ===
  const createProjectMutation = useMutation({
    mutationFn: (data: InsertProject) => apiRequest("/api/projects", { method: "POST", body: data }),
    onSuccess: () => {
      // Close dialog and reset form first
      setIsProjectCreateDialogOpen(false);
      projectForm.reset();
      
      // Then invalidate and show toast
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created successfully" });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertProject> }) =>
      apiRequest(`/api/projects/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => {
      // Close dialog and reset state first
      setIsProjectEditDialogOpen(false);
      setEditingProject(null);
      projectEditForm.reset();
      
      // Then invalidate and show toast
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project updated successfully" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      // Close dialog first to prevent focus trap issues
      setIsProjectDeleteDialogOpen(false);
      setProjectToDelete(null);
      
      // Then invalidate and show toast
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted successfully" });
    },
  });

  // === TASK MUTATIONS ===
  const createTaskMutation = useMutation({
    mutationFn: (data: InsertTask) => apiRequest("/api/tasks", { method: "POST", body: data }),
    onSuccess: () => {
      // Close dialog and reset form first
      setIsTaskCreateDialogOpen(false);
      taskForm.reset();
      
      // Then invalidate and show toast
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Task created successfully" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertTask> }) =>
      apiRequest(`/api/tasks/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => {
      // Close dialog and reset state first
      setIsTaskEditDialogOpen(false);
      setEditingTask(null);
      taskEditForm.reset();
      
      // Then invalidate and show toast
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Task updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      // Close dialog first to prevent focus trap issues
      setIsTaskDeleteDialogOpen(false);
      setTaskToDelete(null);
      
      // Then invalidate and show toast
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Task deleted successfully" });
    },
  });

  // === FORMS ===
  const projectForm = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
      location: "",
      progress: 0,
      dueDate: undefined,
    },
  });

  const projectEditForm = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
      location: "",
      progress: 0,
      dueDate: undefined,
    },
  });

  const taskForm = useForm<InsertTask>({
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

  const taskEditForm = useForm<InsertTask>({
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

  // === PROJECT FILTERING ===
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(debouncedProjectSearch.toLowerCase()) ||
        project.description?.toLowerCase().includes(debouncedProjectSearch.toLowerCase());
      const matchesStatus =
        projectStatusFilter === "all" || project.status === projectStatusFilter;
      const matchesLocation =
        projectLocationFilter === "all" || project.location === projectLocationFilter;

      return matchesSearch && matchesStatus && matchesLocation;
    });

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (projectSortBy === "name") {
        const comparison = a.name.localeCompare(b.name);
        return projectSortOrder === "asc" ? comparison : -comparison;
      } else {
        const dateA = new Date((a as any).updatedAt || (a as any).createdAt || 0);
        const dateB = new Date((b as any).updatedAt || (b as any).createdAt || 0);
        return projectSortOrder === "asc"
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }
    });

    return filtered;
  }, [
    projects,
    debouncedProjectSearch,
    projectStatusFilter,
    projectLocationFilter,
    projectSortBy,
    projectSortOrder,
  ]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set(projects.map((p) => p.location).filter(Boolean) as string[]);
    return Array.from(locations);
  }, [projects]);

  // === TASK FILTERING ===
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(debouncedTaskSearch.toLowerCase()) ||
        task.description?.toLowerCase().includes(debouncedTaskSearch.toLowerCase());
      const matchesStatus = taskStatusFilter === "all" || task.status === taskStatusFilter;
      const matchesPriority = taskPriorityFilter === "all" || task.priority === taskPriorityFilter;
      const matchesAssignee =
        taskAssigneeFilter === "all" ||
        (taskAssigneeFilter === "unassigned" && !task.assigneeId) ||
        (taskAssigneeFilter === "me" && task.assigneeId === (user as any)?.id) ||
        task.assigneeId === taskAssigneeFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [tasks, debouncedTaskSearch, taskStatusFilter, taskPriorityFilter, taskAssigneeFilter, user]);

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

  // === PROJECT HANDLERS ===
  const handleCreateProject = (data: InsertProject) => {
    const projectData = {
      ...data,
      description: data.description?.trim() || null,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    } as any;
    createProjectMutation.mutate(projectData);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsProjectEditDialogOpen(true);
  };

  // Populate project edit form when editingProject changes
  useEffect(() => {
    if (editingProject && isProjectEditDialogOpen) {
      projectEditForm.reset({
        name: editingProject.name,
        description: editingProject.description || "",
        status: editingProject.status,
        location: editingProject.location || "",
        progress: editingProject.progress || 0,
        dueDate: editingProject.dueDate ? new Date(editingProject.dueDate) : undefined,
      });
    }
  }, [editingProject, isProjectEditDialogOpen, projectEditForm]);

  const handleUpdateProject = (data: InsertProject) => {
    if (!editingProject) return;
    const projectData = {
      ...data,
      description: data.description?.trim() || null,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    } as any;
    updateProjectMutation.mutate({ id: editingProject.id, data: projectData });
  };

  const handleProjectEditDialogChange = (open: boolean) => {
    if (!open) {
      setEditingProject(null);
      projectEditForm.reset();
    }
    setIsProjectEditDialogOpen(open);
  };

  const handleTaskEditDialogChange = (open: boolean) => {
    if (!open) {
      setEditingTask(null);
      taskEditForm.reset();
    }
    setIsTaskEditDialogOpen(open);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setIsProjectDeleteDialogOpen(true);
  };

  const handleConfirmProjectDelete = () => {
    if (projectToDelete) {
      deleteProjectMutation.mutate(projectToDelete.id);
    }
  };

  const handleOpenProject = (project: Project) => {
    setLocation(`/client-portal?project=${project.id}`);
  };

  // === TASK HANDLERS ===
  const getUserName = (userId: string | null): string | null => {
    if (!userId) return null;
    const foundUser = users.find((u) => u.id === userId);
    if (!foundUser) return null;
    return `${foundUser.firstName || ""} ${foundUser.lastName || ""}`.trim() || foundUser.email || null;
  };

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
    setIsTaskEditDialogOpen(true);
  };

  // Populate task edit form when editingTask changes
  useEffect(() => {
    if (editingTask && isTaskEditDialogOpen) {
      taskEditForm.reset({
        title: editingTask.title,
        description: editingTask.description || "",
        projectId: editingTask.projectId,
        category: editingTask.category || "general",
        status: editingTask.status,
        priority: editingTask.priority,
        dueDate: editingTask.dueDate ? new Date(editingTask.dueDate) : undefined,
        assigneeId: editingTask.assigneeId,
      });
    }
  }, [editingTask, isTaskEditDialogOpen, taskEditForm]);

  const handleUpdateTask = (data: InsertTask) => {
    if (!editingTask) return;
    const taskData = {
      ...data,
      description: data.description?.trim() || null,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    };
    updateTaskMutation.mutate({ id: editingTask.id, data: taskData });
  };

  const handleDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setIsTaskDeleteDialogOpen(true);
  };

  const handleConfirmTaskDelete = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete.id);
    }
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const isExpanded = (id: string) => expandedProjects[id] !== false;

  // === ACTIVE FILTERS ===
  const projectActiveFilters = [];
  if (projectStatusFilter !== "all") {
    projectActiveFilters.push({
      id: "status",
      label: `Status: ${projectStatusFilter}`,
      onClick: () => setProjectStatusFilter("all"),
    });
  }
  if (projectLocationFilter !== "all") {
    projectActiveFilters.push({
      id: "location",
      label: `Location: ${projectLocationFilter}`,
      onClick: () => setProjectLocationFilter("all"),
    });
  }

  const taskActiveFilters = [];
  if (taskStatusFilter !== "all") {
    taskActiveFilters.push({
      id: "status",
      label: `Status: ${taskStatusFilter}`,
      onClick: () => setTaskStatusFilter("all"),
    });
  }
  if (taskPriorityFilter !== "all") {
    taskActiveFilters.push({
      id: "priority",
      label: `Priority: ${taskPriorityFilter}`,
      onClick: () => setTaskPriorityFilter("all"),
    });
  }
  if (taskAssigneeFilter !== "all") {
    taskActiveFilters.push({
      id: "assignee",
      label: `Assignee: ${taskAssigneeFilter === "unassigned" ? "Unassigned" : taskAssigneeFilter === "me" ? "Me" : getUserName(taskAssigneeFilter)}`,
      onClick: () => setTaskAssigneeFilter("all"),
    });
  }

  const handleClearProjectFilters = () => {
    setProjectStatusFilter("all");
    setProjectLocationFilter("all");
    setProjectSearchTerm("");
  };

  const handleClearTaskFilters = () => {
    setTaskStatusFilter("all");
    setTaskPriorityFilter("all");
    setTaskAssigneeFilter("all");
    setTaskSearchTerm("");
  };

  const isLoading = projectsLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <LoadingSkeleton variant="grid" count={6} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header with Segmented Control */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Breadcrumb */}
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Work</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Manage your projects and tasks
              </p>
            </div>

            {/* Center: Segmented Control */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <SegmentedControl
                options={[
                  { value: "projects", label: "Projects", icon: <Briefcase className="w-4 h-4" /> },
                  { value: "tasks", label: "Tasks", icon: <ListTodo className="w-4 h-4" /> },
                ]}
                value={activeSegment}
                onChange={(value) => setActiveSegment(value as WorkSegment)}
                className="min-w-[400px]"
                data-testid="work-segment-control"
              />
            </div>

            {/* Right: Action Button */}
            <div>
              {activeSegment === "projects" ? (
                <Button
                  onClick={() => setIsProjectCreateDialogOpen(true)}
                  data-testid="button-create-project"
                  className="tap-target"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  New Project
                </Button>
              ) : (
                <Button
                  onClick={() => setIsTaskCreateDialogOpen(true)}
                  data-testid="button-create-task"
                  className="tap-target"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  New Task
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Projects Segment */}
      {activeSegment === "projects" && (
        <>
          {/* Filter Bar */}
          <FilterBar
            searchValue={projectSearchTerm}
            onSearchChange={setProjectSearchTerm}
            searchPlaceholder="Search projects..."
            filters={projectActiveFilters}
            onClearAll={projectActiveFilters.length > 0 ? handleClearProjectFilters : undefined}
            sticky
            data-testid="filter-bar-projects"
            rightActions={
              <>
                <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                  <SelectTrigger className="w-[140px] tap-target" data-testid="filter-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                {uniqueLocations.length > 0 && (
                  <Select value={projectLocationFilter} onValueChange={setProjectLocationFilter}>
                    <SelectTrigger className="w-[140px] tap-target" data-testid="filter-location">
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {uniqueLocations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select
                  value={`${projectSortBy}-${projectSortOrder}`}
                  onValueChange={(value) => {
                    const [newSortBy, newSortOrder] = value.split("-") as [
                      "recent" | "name",
                      "asc" | "desc"
                    ];
                    setProjectSortBy(newSortBy);
                    setProjectSortOrder(newSortOrder);
                  }}
                >
                  <SelectTrigger className="w-[140px] tap-target" data-testid="sort-select">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent-desc">Recent First</SelectItem>
                    <SelectItem value="recent-asc">Oldest First</SelectItem>
                    <SelectItem value="name-asc">Name A-Z</SelectItem>
                    <SelectItem value="name-desc">Name Z-A</SelectItem>
                  </SelectContent>
                </Select>

                <SegmentedControl
                  options={[
                    { value: "grid", label: "Grid" },
                    { value: "list", label: "List" },
                  ]}
                  value={projectViewMode}
                  onChange={(value) => setProjectViewMode(value as "list" | "grid")}
                  data-testid="view-mode-toggle"
                />
              </>
            }
          />

          {/* Projects Content */}
          <div className="px-6 py-6">
            {filteredProjects.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No projects found"
                description={
                  projectSearchTerm || projectActiveFilters.length > 0
                    ? "Try adjusting your filters"
                    : "Create your first project to get started"
                }
                action={
                  projectSearchTerm || projectActiveFilters.length > 0
                    ? undefined
                    : {
                        label: "Create Project",
                        onClick: () => setIsProjectCreateDialogOpen(true),
                      }
                }
                data-testid="empty-state-projects"
              />
            ) : (
              <div
                className={cn(
                  projectViewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 gap-6"
                    : "space-y-3"
                )}
              >
                {filteredProjects.map((project) => {
                  const members = users.slice(0, 3).map((u) => ({
                    id: u.id,
                    name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "Unknown",
                  }));

                  return (
                    <ProjectCard
                      key={project.id}
                      id={project.id}
                      title={project.name}
                      status={project.status as any}
                      location={project.location || undefined}
                      progress={project.progress || 0}
                      taskCount={0}
                      lastUpdated={project.dueDate ? new Date(project.dueDate) : undefined}
                      members={members}
                      onClick={() => handleOpenProject(project)}
                      menuItems={[
                        { label: "Edit", icon: Edit, onClick: () => handleEditProject(project) },
                        {
                          label: "Delete",
                          icon: Trash2,
                          onClick: () => handleDeleteProject(project),
                          variant: "danger",
                          separator: true,
                        },
                      ]}
                      data-testid={`project-card-${project.id}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Tasks Segment */}
      {activeSegment === "tasks" && (
        <>
          {/* Task Stats Row - Sticky */}
          <div className="sticky-top bg-background border-b border-border px-6 py-4 z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={ListTodo}
                label="Total Tasks"
                value={taskStats.total}
                sublabel="All tasks"
                onClick={() => handleClearTaskFilters()}
                data-testid="stat-total-tasks"
              />
              <StatCard
                icon={AlertCircle}
                label="Overdue"
                value={taskStats.overdue}
                sublabel="Behind schedule"
                tone="coral"
                onClick={() => setTaskStatusFilter("overdue")}
                data-testid="stat-overdue-tasks"
              />
              <StatCard
                icon={CalendarIcon}
                label="Due This Week"
                value={taskStats.dueThisWeek}
                sublabel="Due within 7 days"
                tone="blue"
                data-testid="stat-due-this-week"
              />
              <StatCard
                icon={CheckCircle}
                label="Completed"
                value={taskStats.completed}
                sublabel="Finished tasks"
                tone="teal"
                onClick={() => setTaskStatusFilter("completed")}
                data-testid="stat-completed-tasks"
              />
            </div>
          </div>

          {/* Filter Bar - Sticky */}
          <FilterBar
            searchValue={taskSearchTerm}
            onSearchChange={setTaskSearchTerm}
            searchPlaceholder="Search tasks..."
            filters={taskActiveFilters}
            onClearAll={taskActiveFilters.length > 0 ? handleClearTaskFilters : undefined}
            sticky
            data-testid="filter-bar-tasks"
            rightActions={
              <>
                <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
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

                <Select value={taskPriorityFilter} onValueChange={setTaskPriorityFilter}>
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
                  value={taskViewMode}
                  onChange={(value) => setTaskViewMode(value as "list" | "canvas")}
                  data-testid="view-mode-toggle"
                />
              </>
            }
          />

          {/* Tasks Content */}
          <div className="px-6 py-6">
            {filteredTasks.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No tasks found"
                description={
                  taskSearchTerm || taskActiveFilters.length > 0
                    ? "Try adjusting your filters"
                    : "Create your first task to get started"
                }
                action={
                  taskSearchTerm || taskActiveFilters.length > 0
                    ? undefined
                    : { label: "Create Task", onClick: () => setIsTaskCreateDialogOpen(true) }
                }
                data-testid="empty-state-tasks"
              />
            ) : (
              <div className="space-y-6">
                {/* Grouped by Project */}
                {Object.entries(tasksByProject).map(([projectId, { project, tasks: projectTasks }]) => (
                  <div key={projectId} className="space-y-3">
                    <button
                      onClick={() => toggleProjectExpansion(projectId)}
                      className="w-full flex items-center justify-between p-4 bg-[var(--surface-muted)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors tap-target"
                      data-testid={`project-group-${projectId}`}
                    >
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-[var(--text-secondary)]" />
                        <span className="font-semibold text-[var(--text-primary)]">
                          {project.name}
                        </span>
                        <span className="text-sm text-[var(--text-secondary)]">
                          ({projectTasks.length})
                        </span>
                      </div>
                      <div className="text-[var(--text-secondary)]">
                        {isExpanded(projectId) ? "▼" : "▶"}
                      </div>
                    </button>

                    {isExpanded(projectId) && (
                      <div className="space-y-2 pl-4">
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
                              onStatusChange={(newStatus) =>
                                updateTaskMutation.mutate({
                                  id: task.id,
                                  data: { status: newStatus },
                                })
                              }
                              menuItems={[
                                { label: "Edit", icon: Edit, onClick: () => handleEditTask(task) },
                                {
                                  label: "Delete",
                                  icon: Trash2,
                                  onClick: () => handleDeleteTask(task),
                                  variant: "danger",
                                  separator: true,
                                },
                              ]}
                              data-testid={`task-card-${task.id}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {/* Unassigned Tasks */}
                {unassignedTasks.length > 0 && (
                  <div className="space-y-3">
                    <button
                      onClick={() => toggleProjectExpansion("unassigned")}
                      className="w-full flex items-center justify-between p-4 bg-[var(--surface-muted)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors tap-target"
                      data-testid="project-group-unassigned"
                    >
                      <div className="flex items-center gap-3">
                        <ListTodo className="w-5 h-5 text-[var(--text-secondary)]" />
                        <span className="font-semibold text-[var(--text-primary)]">
                          Unassigned Tasks
                        </span>
                        <span className="text-sm text-[var(--text-secondary)]">
                          ({unassignedTasks.length})
                        </span>
                      </div>
                      <div className="text-[var(--text-secondary)]">
                        {isExpanded("unassigned") ? "▼" : "▶"}
                      </div>
                    </button>

                    {isExpanded("unassigned") && (
                      <div className="space-y-2 pl-4">
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
                              onStatusChange={(newStatus) =>
                                updateTaskMutation.mutate({
                                  id: task.id,
                                  data: { status: newStatus },
                                })
                              }
                              menuItems={[
                                { label: "Edit", icon: Edit, onClick: () => handleEditTask(task) },
                                {
                                  label: "Delete",
                                  icon: Trash2,
                                  onClick: () => handleDeleteTask(task),
                                  variant: "danger",
                                  separator: true,
                                },
                              ]}
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
        </>
      )}

      {/* === PROJECT DIALOGS === */}
      {/* Create Project Dialog */}
      <Dialog open={isProjectCreateDialogOpen} onOpenChange={setIsProjectCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <Form {...projectForm}>
            <form onSubmit={projectForm.handleSubmit(handleCreateProject)} className="space-y-4">
              <FormField
                control={projectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-name" placeholder="Enter project name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={projectForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        data-testid="input-description"
                        placeholder="Enter project description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={projectForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          data-testid="input-location"
                          placeholder="Enter location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={projectForm.control}
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
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={projectForm.control}
                  name="progress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Progress (%)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="100"
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-progress"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={projectForm.control}
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
                  onClick={() => setIsProjectCreateDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="button-submit"
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog - Similar structure */}
      <Dialog open={isProjectEditDialogOpen} onOpenChange={handleProjectEditDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <Form {...projectEditForm}>
            <form onSubmit={projectEditForm.handleSubmit(handleUpdateProject)} className="space-y-4">
              <FormField
                control={projectEditForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-name" placeholder="Enter project name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={projectEditForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edit-description"
                        placeholder="Enter project description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={projectEditForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          data-testid="input-edit-location"
                          placeholder="Enter location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={projectEditForm.control}
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
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={projectEditForm.control}
                  name="progress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Progress (%)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="100"
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-edit-progress"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={projectEditForm.control}
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
                  onClick={() => handleProjectEditDialogChange(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="button-submit-edit"
                  disabled={updateProjectMutation.isPending}
                >
                  {updateProjectMutation.isPending ? "Updating..." : "Update Project"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <AlertDialog 
        open={isProjectDeleteDialogOpen} 
        onOpenChange={(open) => {
          if (!deleteProjectMutation.isPending) {
            setIsProjectDeleteDialogOpen(open);
            if (!open) setProjectToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmProjectDelete();
              }}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* === TASK DIALOGS === */}
      {/* Create Task Dialog */}
      <Dialog open={isTaskCreateDialogOpen} onOpenChange={setIsTaskCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(handleCreateTask)} className="space-y-4">
              <FormField
                control={taskForm.control}
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
                control={taskForm.control}
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
                  control={taskForm.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
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
                  control={taskForm.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
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
                  control={taskForm.control}
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
                  control={taskForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-status">
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
                  control={taskForm.control}
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
                              data-testid="select-task-due-date"
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
                  onClick={() => setIsTaskCreateDialogOpen(false)}
                  data-testid="button-cancel-task"
                >
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit-task" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isTaskEditDialogOpen} onOpenChange={handleTaskEditDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <Form {...taskEditForm}>
            <form onSubmit={taskEditForm.handleSubmit(handleUpdateTask)} className="space-y-4">
              <FormField
                control={taskEditForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-task-title" placeholder="Enter task title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={taskEditForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-edit-task-description" placeholder="Enter task description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={taskEditForm.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-task-project">
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
                  control={taskEditForm.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-task-assignee">
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
                  control={taskEditForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-task-priority">
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
                  control={taskEditForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-task-status">
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
                  control={taskEditForm.control}
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
                              data-testid="select-edit-task-due-date"
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
                  onClick={() => handleTaskEditDialogChange(false)}
                  data-testid="button-cancel-edit-task"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="button-submit-edit-task"
                  disabled={updateTaskMutation.isPending}
                >
                  {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <AlertDialog 
        open={isTaskDeleteDialogOpen} 
        onOpenChange={(open) => {
          if (!deleteTaskMutation.isPending) {
            setIsTaskDeleteDialogOpen(open);
            if (!open) setTaskToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-task">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmTaskDelete();
              }}
              data-testid="button-confirm-delete-task"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTaskMutation.isPending}
            >
              {deleteTaskMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
