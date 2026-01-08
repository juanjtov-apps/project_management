import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
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
  Check,
  Home,
  FolderKanban,
  ClipboardList,
  X,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
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
import { ProjectCard, CreateProjectCard } from "@/components/ui/project-card";
import { ProjectQuickView } from "@/components/ui/project-quick-view";
import { StagesTab } from "@/components/stages/stages-tab";
import { TaskCard as TabletTaskCard } from "@/components/ui/task-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
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
import type { Project, InsertProject, Task, InsertTask, User, Photo } from "@shared/schema";

// Helper functions
const isTaskOverdue = (task: Task): boolean => {
  if (!task.dueDate) return false;
  if (task.status === 'completed') return false;
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
  // Debug: Track renders
  const renderCount = useRef(0);
  renderCount.current += 1;
  if (renderCount.current % 10 === 0) {
    console.log("[WorkPage] Render count:", renderCount.current);
  }

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

  // Quick View state
  const [quickViewProject, setQuickViewProject] = useState<Project | null>(null);

  // Stages dialog state
  const [stagesProject, setStagesProject] = useState<Project | null>(null);

  // Projects - Filter states
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("all");
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
  const isClosingFromMutation = useRef(false);

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

  // Monitor task query refetches for debugging (only log when loading state changes)
  // REMOVED tasks.length from dependencies to prevent render loops
  const prevLoadingRef = useRef(tasksLoading);
  useEffect(() => {
    if (prevLoadingRef.current !== tasksLoading) {
      if (tasksLoading) {
        console.log("[Task Query] Query started loading/refetching");
      } else {
        console.log("[Task Query] Query finished loading", { taskCount: tasks.length });
      }
      prevLoadingRef.current = tasksLoading;
    }
  }, [tasksLoading]); // Removed tasks.length to prevent infinite loops

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users/managers"],
  });

  // Fetch all photos to get thumbnails for projects
  const { data: allPhotos = [] } = useQuery<Photo[]>({
    queryKey: ["/api/photos"],
  });

  // Handle URL parameters to auto-open stages dialog (e.g., from "Back to Stages" in materials tab)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectIdParam = params.get('projectId');
    const tabParam = params.get('tab');

    if (projectIdParam && tabParam === 'stages' && projects.length > 0) {
      const project = projects.find(p => p.id === projectIdParam);
      if (project) {
        setStagesProject(project);
        // Clean up URL after opening dialog
        window.history.replaceState({}, '', '/projects');
      }
    }
  }, [projects]);

  // Create a map of project ID to cover photo or first photo for thumbnails
  const projectThumbnails = useMemo(() => {
    const thumbnailMap: Record<string, string> = {};

    // First, set thumbnails from coverPhotoId if available
    projects.forEach((project) => {
      if (project.coverPhotoId) {
        thumbnailMap[project.id] = `/api/photos/${project.coverPhotoId}/file`;
      }
    });

    // Then, for projects without cover photos, use the first photo
    allPhotos.forEach((photo) => {
      if (photo.projectId && !thumbnailMap[photo.projectId]) {
        thumbnailMap[photo.projectId] = `/api/photos/${photo.id}/file`;
      }
    });
    return thumbnailMap;
  }, [allPhotos, projects]);

  // Create a map of project ID to array of photo URLs for card thumbnails
  const projectPhotoUrls = useMemo(() => {
    const photoMap: Record<string, string[]> = {};
    allPhotos.forEach((photo) => {
      if (photo.projectId) {
        if (!photoMap[photo.projectId]) {
          photoMap[photo.projectId] = [];
        }
        photoMap[photo.projectId].push(`/api/photos/${photo.id}/file`);
      }
    });
    return photoMap;
  }, [allPhotos]);

  // Get photos for the quick view project
  const quickViewPhotos = useMemo(() => {
    if (!quickViewProject) return [];
    return allPhotos.filter((p) => p.projectId === quickViewProject.id);
  }, [allPhotos, quickViewProject]);

  // === PROJECT MUTATIONS ===
  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await apiRequest("/api/projects", { method: "POST", body: data });

      // Parse JSON response - critical for mutation to resolve properly
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    },
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProject> }) => {
      console.log("[Project Update] Mutation executing with:", { id, data });
      const response = await apiRequest(`/api/projects/${id}`, { method: "PATCH", body: data });
      console.log("[Project Update] API response received:", response.status);
      return await response.json();
    },
    onSuccess: (responseData) => {
      console.log("[Project Update] Mutation succeeded with response:", responseData);
      // Simple synchronous cleanup - match working pattern from tasks.tsx
      isClosingFromMutation.current = true;
      setIsProjectEditDialogOpen(false);
      setEditingProject(null);
      projectEditForm.reset();
      isClosingFromMutation.current = false;
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project updated successfully" });
    },
    onError: (error: any) => {
      console.error("[Project Update] Mutation failed with error:", error);
      toast({
        title: "Failed to update project",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: (_data, deletedId) => {
      // Clear all related state BEFORE closing dialog to prevent stale references
      const wasQuickViewProject = quickViewProject?.id === deletedId;

      // Clear project references first
      setProjectToDelete(null);
      if (wasQuickViewProject) {
        setQuickViewProject(null);
      }

      // Then close dialog
      setIsProjectDeleteDialogOpen(false);

      // Finally invalidate queries and show toast
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      toast({ title: "Project deleted successfully" });
    },
  });

  // === TASK MUTATIONS ===
  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const response = await apiRequest("/api/tasks", { method: "POST", body: data });
      // apiRequest already throws on non-ok responses
      return await response.json();
    },
    onSuccess: () => {
      // Close dialog and reset form first
      setIsTaskCreateDialogOpen(false);
      taskForm.reset();

      // Then invalidate and show toast
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Task created successfully" });
    },
    onError: (error: any) => {
      console.error("[Task Create] Error:", error);
      toast({ title: "Failed to create task", description: error?.message, variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertTask> }) => {
      console.log("[Task Edit] Starting update mutation", { id, data });
      const response = await apiRequest(`/api/tasks/${id}`, { method: "PATCH", body: data });
      console.log("[Task Edit] Response status:", response.status);

      // Parse JSON response - critical for mutation to resolve properly
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("[Task Edit] Parsed response:", result);
      return result;
    },
    onSuccess: () => {
      console.log("[Task Edit] Update mutation succeeded");
      // Simple synchronous cleanup - match working pattern from tasks.tsx
      isClosingFromMutation.current = true;
      setIsTaskEditDialogOpen(false);
      setEditingTask(null);
      taskEditForm.reset();
      isClosingFromMutation.current = false;
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Task updated successfully" });
    },
    onError: (error) => {
      console.error("[Task Edit] Update mutation failed", error);
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  // Monitor mutation pending state for debugging
  const prevMutationPendingRef = useRef(updateTaskMutation.isPending);
  useEffect(() => {
    if (prevMutationPendingRef.current !== updateTaskMutation.isPending) {
      if (updateTaskMutation.isPending) {
        console.log("[Task Edit] Mutation is now pending");
      } else {
        console.log("[Task Edit] Mutation is no longer pending");
      }
      prevMutationPendingRef.current = updateTaskMutation.isPending;
    }
  }, [updateTaskMutation.isPending]);

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsTaskDeleteDialogOpen(false);
      setTaskToDelete(null);
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
      companyId: "", // Required by schema, will be set from project data on edit
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

      return matchesSearch && matchesStatus;
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
    projectSortBy,
    projectSortOrder,
  ]);

  // === TASK FILTERING ===
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(debouncedTaskSearch.toLowerCase()) ||
        task.description?.toLowerCase().includes(debouncedTaskSearch.toLowerCase());
      const matchesStatus =
        taskStatusFilter === "all" ||
        (taskStatusFilter === "overdue" && isTaskOverdue(task)) ||
        (taskStatusFilter === "dueThisWeek" && isTaskDueThisWeek(task)) ||
        task.status === taskStatusFilter;
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
      total: tasks.length,
      overdue: tasks.filter(isTaskOverdue).length,
      dueThisWeek: tasks.filter(isTaskDueThisWeek).length,
      completed: tasks.filter((t) => t.status === "completed").length,
    };
  }, [tasks]);

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
    console.log("[Project Edit] Opening edit dialog", {
      projectId: project.id,
      projectName: project.name,
      projectDescription: project.description,
      projectLocation: project.location,
      projectStatus: project.status,
      projectProgress: project.progress,
      projectDueDate: project.dueDate,
      fullProject: project
    });
    // Match working pattern - synchronous reset
    setEditingProject(project);
    const formValues = {
      name: project.name || "",
      description: project.description || "",
      status: project.status || "active",
      location: project.location || "",
      progress: project.progress ?? 0,
      dueDate: project.dueDate ? new Date(project.dueDate) : undefined,
      coverPhotoId: project.coverPhotoId || undefined,
      // Include companyId to satisfy schema validation (required field)
      companyId: project.companyId,
    };
    console.log("[Project Edit] Resetting form with values:", formValues);
    projectEditForm.reset(formValues);
    setIsProjectEditDialogOpen(true);
    console.log("[Project Edit] Form populated and dialog opened, form values:", projectEditForm.getValues());
  };

  const handleUpdateProject = (data: InsertProject) => {
    console.log("[Project Update] handleUpdateProject called with data:", data);
    console.log("[Project Update] editingProject:", editingProject);
    if (!editingProject) {
      console.error("[Project Update] No editingProject found!");
      return;
    }
    const projectData = {
      ...data,
      description: data.description?.trim() || null,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      coverPhotoId: data.coverPhotoId || null,
    } as any;
    console.log("[Project Update] Calling mutation with:", { id: editingProject.id, data: projectData });
    updateProjectMutation.mutate({ id: editingProject.id, data: projectData });
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
    console.log("[Task Edit] Opening edit dialog", { taskId: task.id, taskTitle: task.title });
    // Match working pattern from tasks.tsx - synchronous reset
    setEditingTask(task);
    taskEditForm.reset({
      title: task.title,
      description: task.description || "",
      projectId: task.projectId,
      category: task.category || "general",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      assigneeId: task.assigneeId,
    });
    setIsTaskEditDialogOpen(true);
    console.log("[Task Edit] Form populated and dialog opened");
  };

  const handleUpdateTask = (data: InsertTask) => {
    console.log("[Task Edit] handleUpdateTask called", {
      editingTaskId: editingTask?.id,
      formData: data,
      timestamp: new Date().toISOString()
    });

    try {
      if (!editingTask) {
        console.warn("[Task Edit] handleUpdateTask called but no editingTask");
        return;
      }

      console.log("[Task Edit] Processing task data");
      const taskData = {
        ...data,
        description: data.description?.trim() || null,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      };

      console.log("[Task Edit] Calling mutation with processed data", {
        id: editingTask.id,
        taskData
      });
      updateTaskMutation.mutate({ id: editingTask.id, data: taskData });
      console.log("[Task Edit] Mutation call completed (async)");
    } catch (error) {
      console.error("[Task Edit] Error in handleUpdateTask", error);
      toast({ title: "Error updating task", variant: "destructive" });
    }
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
      <div className="min-h-screen bg-[var(--pro-bg)] p-6">
        <LoadingSkeleton variant="grid" count={6} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--pro-bg)] pb-20 md:pb-0">
      {/* Header with Segmented Control */}
      <div className="bg-[var(--pro-bg)] border-b border-[var(--pro-border)]">
        <div className="px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
            {/* Left: Breadcrumb */}
            <div className="w-full md:w-auto text-center md:text-left">
              <h1 className="text-2xl font-bold text-[var(--pro-text-primary)]">Work</h1>
              <p className="text-sm text-[var(--pro-text-secondary)] mt-1">
                Manage your projects and tasks
              </p>
            </div>

            {/* Center: Segmented Control */}
            <div className="w-full md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2 flex justify-center">
              <SegmentedControl
                options={[
                  { value: "projects", label: "Projects", icon: <Briefcase className="w-4 h-4" /> },
                  { value: "tasks", label: "Tasks", icon: <ListTodo className="w-4 h-4" /> },
                ]}
                value={activeSegment}
                onChange={(value) => setActiveSegment(value as WorkSegment)}
                className="w-fit"
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
            sticky={false}
            data-testid="filter-bar-projects"
            rightActions={
              <>
                <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                  <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px] tap-target" data-testid="filter-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

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
                  <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px] tap-target" data-testid="sort-select">
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
                  className="flex-1 sm:flex-none"
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
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    : "space-y-3"
                )}
              >
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    id={project.id}
                    title={project.name}
                    status={project.status as any}
                    location={project.location || undefined}
                    progress={project.progress || 0}
                    dueDate={project.dueDate}
                    thumbnailUrl={projectThumbnails[project.id]}
                    photoUrls={projectPhotoUrls[project.id] || []}
                    onClick={() => setQuickViewProject(project)}
                    onEdit={() => handleEditProject(project)}
                    onDelete={() => {
                      setProjectToDelete(project);
                      setIsProjectDeleteDialogOpen(true);
                    }}
                    onStages={() => setStagesProject(project)}
                    isSelected={quickViewProject?.id === project.id}
                    data-testid={`project-card-${project.id}`}
                  />
                ))}
                {/* Create New Project Card */}
                <CreateProjectCard
                  onClick={() => setIsProjectCreateDialogOpen(true)}
                  data-testid="button-create-project-card"
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Tasks Segment */}
      {activeSegment === "tasks" && (
        <>
          {/* Task Stats Row - Mobile-optimized horizontal scroll */}
          <div className="bg-[var(--pro-bg)] border-b border-[var(--pro-border)] px-4 py-3">
            {/* Mobile: Horizontal scroll strip - centered */}
            <div className="md:hidden flex gap-2 justify-center pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <button
                onClick={() => handleClearTaskFilters()}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--pro-surface)] rounded-lg border border-[var(--pro-border)] active:scale-95 transition-transform"
                data-testid="stat-total-tasks"
              >
                <span className="text-sm font-bold text-[var(--pro-text-primary)]">{taskStats.total}</span>
                <span className="text-[10px] text-[var(--pro-text-secondary)]">Total</span>
              </button>
              <button
                onClick={() => setTaskStatusFilter("overdue")}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border active:scale-95 transition-transform",
                  taskStats.overdue > 0
                    ? "bg-[var(--pro-red)]/10 border-[var(--pro-red)]/30"
                    : "bg-[var(--pro-surface)] border-[var(--pro-border)]"
                )}
                data-testid="stat-overdue-tasks"
              >
                <span className={cn(
                  "text-sm font-bold",
                  taskStats.overdue > 0 ? "text-[var(--pro-red)]" : "text-[var(--pro-text-primary)]"
                )}>{taskStats.overdue}</span>
                <span className="text-[10px] text-[var(--pro-text-secondary)]">Overdue</span>
              </button>
              <button
                onClick={() => setTaskStatusFilter("dueThisWeek")}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--pro-blue)]/10 rounded-lg border border-[var(--pro-blue)]/30 active:scale-95 transition-transform"
                data-testid="stat-due-this-week"
              >
                <span className="text-sm font-bold text-[var(--pro-blue)]">{taskStats.dueThisWeek}</span>
                <span className="text-[10px] text-[var(--pro-text-secondary)]">Week</span>
              </button>
              <button
                onClick={() => setTaskStatusFilter("completed")}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--pro-mint)]/10 rounded-lg border border-[var(--pro-mint)]/30 active:scale-95 transition-transform"
                data-testid="stat-completed-tasks"
              >
                <span className="text-sm font-bold text-[var(--pro-mint)]">{taskStats.completed}</span>
                <span className="text-[10px] text-[var(--pro-text-secondary)]">Done</span>
              </button>
            </div>

            {/* Desktop: Original 4-column grid */}
            <div className="hidden md:grid grid-cols-4 gap-4">
              <StatCard
                icon={ListTodo}
                label="Total Tasks"
                value={taskStats.total}
                sublabel="All tasks"
                onClick={() => handleClearTaskFilters()}
                data-testid="stat-total-tasks-desktop"
              />
              <StatCard
                icon={AlertCircle}
                label="Overdue"
                value={taskStats.overdue}
                sublabel="Behind schedule"
                tone="coral"
                onClick={() => setTaskStatusFilter("overdue")}
                data-testid="stat-overdue-tasks-desktop"
              />
              <StatCard
                icon={CalendarIcon}
                label="Due This Week"
                value={taskStats.dueThisWeek}
                sublabel="Due within 7 days"
                tone="blue"
                onClick={() => setTaskStatusFilter("dueThisWeek")}
                data-testid="stat-due-this-week-desktop"
              />
              <StatCard
                icon={CheckCircle}
                label="Completed"
                value={taskStats.completed}
                sublabel="Finished tasks"
                tone="teal"
                onClick={() => setTaskStatusFilter("completed")}
                data-testid="stat-completed-tasks-desktop"
              />
            </div>
          </div>

          {/* Mobile-Optimized Filter Bar */}
          <div className="bg-[var(--pro-bg)] border-b border-[var(--pro-border)] px-4 py-3">
            {/* Search row */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Input
                  type="text"
                  value={taskSearchTerm}
                  onChange={(e) => setTaskSearchTerm(e.target.value)}
                  placeholder="Search tasks..."
                  data-testid="filter-search-input"
                  className="pl-9 h-10 bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] text-sm"
                  aria-label="Search"
                />
                <ListTodo className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--pro-text-secondary)]" />
              </div>

            </div>

            {/* Filter chips - horizontal scroll with proper containment */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 pr-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                <SelectTrigger
                  className="flex-shrink-0 h-8 w-auto min-w-[80px] px-2.5 text-xs bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] rounded-full"
                  data-testid="filter-status"
                >
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" sideOffset={4} className="z-50">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>

              <Select value={taskPriorityFilter} onValueChange={setTaskPriorityFilter}>
                <SelectTrigger
                  className="flex-shrink-0 h-8 w-auto min-w-[80px] px-2.5 text-xs bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] rounded-full"
                  data-testid="filter-priority"
                >
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" sideOffset={4} className="z-50">
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              {/* List/Canvas view toggle - pill style matching other filters */}
              <div className="flex-shrink-0 flex gap-1">
                <button
                  onClick={() => setTaskViewMode("list")}
                  className={cn(
                    "h-8 px-3 text-xs rounded-full border transition-colors",
                    taskViewMode === "list"
                      ? "bg-[var(--pro-mint)] border-[var(--pro-mint)] text-[var(--pro-bg-deep)] font-medium"
                      : "bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] text-[var(--pro-text-secondary)]"
                  )}
                  data-testid="view-mode-list"
                >
                  List
                </button>
                <button
                  onClick={() => setTaskViewMode("canvas")}
                  className={cn(
                    "h-8 px-3 text-xs rounded-full border transition-colors",
                    taskViewMode === "canvas"
                      ? "bg-[var(--pro-mint)] border-[var(--pro-mint)] text-[var(--pro-bg-deep)] font-medium"
                      : "bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] text-[var(--pro-text-secondary)]"
                  )}
                  data-testid="view-mode-canvas"
                >
                  Canvas
                </button>
              </div>

              {/* Clear filters chip */}
              {taskActiveFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearTaskFilters}
                  className="flex-shrink-0 h-8 px-2.5 text-xs text-[var(--pro-red)] hover:text-[var(--pro-red)] hover:bg-[var(--pro-red)]/10 rounded-full"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

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
            ) : taskViewMode === "canvas" ? (
              /* Canvas View - Grid of cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTasks.map((task) => {
                  const project = projects.find(p => p.id === task.projectId);
                  const assignees = task.assigneeId
                    ? [{ id: task.assigneeId, name: getUserName(task.assigneeId) || "Unknown" }]
                    : [];

                  return (
                    <TabletTaskCard
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      projectName={project?.name}
                      location={project?.location || undefined}
                      priority={task.priority as any}
                      status={task.status}
                      dueDate={task.dueDate ? new Date(task.dueDate) : undefined}
                      isOverdue={isTaskOverdue(task)}
                      assignees={assignees}
                      variant="canvas"
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
            ) : (
              /* List View - Grouped by Project */
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
      <Dialog
        open={isProjectCreateDialogOpen}
        onOpenChange={(open) => {
          if (open) window.dispatchEvent(new CustomEvent('dialog:open'));
          else window.dispatchEvent(new CustomEvent('dialog:close'));
          setIsProjectCreateDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
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
                          <SelectItem value="on-hold">On Hold</SelectItem>
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
      <Dialog
        open={isProjectEditDialogOpen}
        onOpenChange={(open) => {
          // Emit custom event for header to pause polling
          if (open) {
            window.dispatchEvent(new CustomEvent('dialog:open'));
          } else {
            // Mark the time when dialog closes to prevent dropdown from opening
            (window as any).__lastDialogCloseTime = Date.now();
            window.dispatchEvent(new CustomEvent('dialog:close'));
          }

          // Direct setter - match working pattern from tasks.tsx exactly
          setIsProjectEditDialogOpen(open);

          // Cleanup when closing manually (not from mutation)
          if (!open && !isClosingFromMutation.current) {
            setEditingProject(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
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
                      <Input
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edit-name"
                        placeholder="Enter project name"
                      />
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

              {/* Cover Photo Selection */}
              {editingProject && (
                <FormField
                  control={projectEditForm.control}
                  name="coverPhotoId"
                  render={({ field }) => {
                    const projectPhotos = allPhotos.filter(p => p.projectId === editingProject.id);
                    return (
                      <FormItem>
                        <FormLabel>Cover Photo</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            {projectPhotos.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No photos uploaded yet. Upload photos to the project first to set a cover image.
                              </p>
                            ) : (
                              <>
                                <p className="text-sm text-muted-foreground mb-2">
                                  Select a photo to use as the project cover image
                                </p>
                                <div className="grid grid-cols-4 gap-2">
                                  {projectPhotos.slice(0, 8).map((photo) => (
                                    <div
                                      key={photo.id}
                                      onClick={() => field.onChange(photo.id)}
                                      className={cn(
                                        "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                                        field.value === photo.id
                                          ? "border-[#4ADE80] ring-2 ring-[#4ADE80]"
                                          : "border-transparent hover:border-[#4ADE80]/50"
                                      )}
                                      data-testid={`cover-photo-option-${photo.id}`}
                                    >
                                      <img
                                        src={`/api/photos/${photo.id}/file`}
                                        alt={photo.originalName}
                                        className="w-full h-full object-cover"
                                      />
                                      {field.value === photo.id && (
                                        <div className="absolute inset-0 bg-[#4ADE80]/20 flex items-center justify-center">
                                          <div className="w-6 h-6 rounded-full bg-[#4ADE80] flex items-center justify-center">
                                            <Check className="w-4 h-4 text-black" />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {field.value && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => field.onChange(undefined)}
                                    className="text-sm text-muted-foreground"
                                  >
                                    Clear cover photo
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}

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
                          <SelectItem value="on-hold">On Hold</SelectItem>
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("[Project Edit] Cancel button clicked");
                    // Mark dialog close time to prevent dropdown from opening
                    (window as any).__lastDialogCloseTime = Date.now();
                    // Just close dialog - let onOpenChange handle cleanup
                    setIsProjectEditDialogOpen(false);
                  }}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="button-submit-edit"
                  disabled={updateProjectMutation.isPending}
                  onClick={(e) => {
                    // Prevent event bubbling that might trigger dropdown
                    e.stopPropagation();
                  }}
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
          // Only handle user-initiated close (not programmatic close from mutation success)
          if (!deleteProjectMutation.isPending && open !== isProjectDeleteDialogOpen) {
            setIsProjectDeleteDialogOpen(open);
            if (!open && projectToDelete) {
              setProjectToDelete(null);
            }
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
      <Dialog
        open={isTaskCreateDialogOpen}
        onOpenChange={(open) => {
          if (open) window.dispatchEvent(new CustomEvent('dialog:open'));
          else window.dispatchEvent(new CustomEvent('dialog:close'));
          setIsTaskCreateDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
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
                          <SelectItem value="in-progress">In Progress</SelectItem>
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
                <Button
                  type="submit"
                  data-testid="button-submit-task"
                  disabled={createTaskMutation.isPending}
                >
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog
        open={isTaskEditDialogOpen}
        onOpenChange={(open) => {
          // Emit custom event for header to pause polling
          if (open) {
            window.dispatchEvent(new CustomEvent('dialog:open'));
          } else {
            // Mark the time when dialog closes to prevent dropdown from opening
            (window as any).__lastDialogCloseTime = Date.now();
            window.dispatchEvent(new CustomEvent('dialog:close'));
          }

          // Direct setter - match working pattern from tasks.tsx exactly
          setIsTaskEditDialogOpen(open);

          // Cleanup when closing manually (not from mutation)
          if (!open && !isClosingFromMutation.current) {
            setEditingTask(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <Form {...taskEditForm}>
            <form
              onSubmit={taskEditForm.handleSubmit((data) => {
                console.log("[Task Edit Form] Form submitted with data", data);
                handleUpdateTask(data);
              })}
              className="space-y-4"
            >
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
                          <SelectItem value="in-progress">In Progress</SelectItem>
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("[Task Edit] Cancel button clicked");
                    // Mark dialog close time to prevent dropdown from opening
                    (window as any).__lastDialogCloseTime = Date.now();
                    // Just close dialog - let onOpenChange handle cleanup
                    // Match working pattern from tasks-tablet.tsx
                    setIsTaskEditDialogOpen(false);
                  }}
                  data-testid="button-cancel-edit-task"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="button-submit-edit-task"
                  disabled={updateTaskMutation.isPending}
                  onClick={(e) => {
                    // Prevent event bubbling that might trigger dropdown
                    e.stopPropagation();
                  }}
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

      {/* Project Quick View Panel */}
      <ProjectQuickView
        project={quickViewProject}
        photos={quickViewPhotos}
        members={users}
        onClose={() => setQuickViewProject(null)}
        isOpen={quickViewProject !== null}
      />

      {/* Direct Stages Dialog */}
      <Dialog open={!!stagesProject} onOpenChange={(open) => !open && setStagesProject(null)}>
        <DialogContent hideCloseButton className="max-w-4xl max-h-[85vh] overflow-y-auto bg-zinc-900 border-zinc-700 p-0">
          {/* sr-only header for accessibility - close button is inside StagesTab */}
          <DialogHeader className="sr-only">
            <DialogTitle>Project Stages</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {stagesProject && (
              <StagesTab
                projectId={stagesProject.id}
                onClose={() => setStagesProject(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <BottomNavigation
          items={[
            { value: "projects", label: "Projects", icon: <FolderKanban size={20} /> },
            { value: "tasks", label: "Tasks", icon: <ClipboardList size={20} />, badge: taskStats.overdue > 0 ? taskStats.overdue : undefined },
          ]}
          value={activeSegment}
          onChange={(value) => setActiveSegment(value as WorkSegment)}
        />
      </div>
    </div>
  );
}
