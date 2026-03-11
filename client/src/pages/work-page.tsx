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
  Eye,
  AlertTriangle,
  Camera,
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
import { ObjectUploader } from "@/components/ObjectUploader";
import { TaskCard as TabletTaskCard } from "@/components/ui/task-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('work');
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

  // Issues dialog state
  const [issuesProject, setIssuesProject] = useState<Project | null>(null);
  const [showReportIssueForm, setShowReportIssueForm] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [issuePhotos, setIssuePhotos] = useState<string[]>([]); // Preview URLs for display
  const [issuePaths, setIssuePaths] = useState<string[]>([]); // Object paths for storage
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);

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

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users/managers"],
  });

  // Fetch all photos to get thumbnails for projects
  const { data: allPhotos = [] } = useQuery<Photo[]>({
    queryKey: ["/api/photos"],
  });

  // 8E: Pre-compute project Map for O(1) lookups instead of O(n) .find()
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach(p => map.set(p.id, p));
    return map;
  }, [projects]);

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
      toast({ title: t('toast.projectCreated') });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProject> }) => {
      const response = await apiRequest(`/api/projects/${id}`, { method: "PATCH", body: data });
      return await response.json();
    },
    onSuccess: () => {
      // Simple synchronous cleanup - match working pattern from tasks.tsx
      isClosingFromMutation.current = true;
      setIsProjectEditDialogOpen(false);
      setEditingProject(null);
      projectEditForm.reset();
      isClosingFromMutation.current = false;
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: t('toast.projectUpdated') });
    },
    onError: (error: any) => {
      console.error("[Project Update] Mutation failed with error:", error);
      toast({
        title: t('toast.projectUpdateFailed'),
        description: error.message || t('toast.errorOccurred'),
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
      toast({ title: t('toast.projectDeleted') });
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
      toast({ title: t('toast.taskCreated') });
    },
    onError: (error: any) => {
      console.error("[Task Create] Error:", error);
      toast({ title: t('toast.taskCreateFailed'), description: error?.message, variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertTask> }) => {
      const response = await apiRequest(`/api/tasks/${id}`, { method: "PATCH", body: data });

      // Parse JSON response - critical for mutation to resolve properly
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      // Simple synchronous cleanup - match working pattern from tasks.tsx
      isClosingFromMutation.current = true;
      setIsTaskEditDialogOpen(false);
      setEditingTask(null);
      taskEditForm.reset();
      isClosingFromMutation.current = false;
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: t('toast.taskUpdated') });
    },
    onError: (error) => {
      console.error("[Task Edit] Update mutation failed", error);
      toast({ title: t('toast.taskUpdateFailed'), variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsTaskDeleteDialogOpen(false);
      setTaskToDelete(null);
      toast({ title: t('toast.taskDeleted') });
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
    projectEditForm.reset(formValues);
    setIsProjectEditDialogOpen(true);
  };

  const handleUpdateProject = (data: InsertProject) => {
    if (!editingProject) {
      return;
    }
    const projectData = {
      ...data,
      description: data.description?.trim() || null,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      coverPhotoId: data.coverPhotoId || null,
    } as any;
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

  // === ISSUE HANDLERS ===
  const handleCreateIssue = async () => {
    if (!issuesProject || !issueTitle || !issueDescription) return;

    setIsCreatingIssue(true);
    try {
      await apiRequest("/api/client-issues", {
        method: "POST",
        body: {
          project_id: issuesProject.id,
          title: issueTitle,
          description: issueDescription,
          photos: issuePaths, // Send object paths, not preview URLs
        },
      });

      toast({
        title: t('toast.issueCreated'),
        description: t('toast.issueCreatedDesc'),
      });

      // Reset and close
      setIssueTitle("");
      setIssueDescription("");
      setIssuePhotos([]);
      setIssuePaths([]);
      setShowReportIssueForm(false);
      setIssuesProject(null);
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: t('toast.issueCreateFailed'),
        variant: "destructive",
      });
    } finally {
      setIsCreatingIssue(false);
    }
  };

  const handleIssueUploadParameters = async () => {
    const response = await apiRequest("/api/objects/upload", { method: "POST" });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
      previewURL: data.previewURL,
      objectPath: data.objectPath,
    };
  };

  const resetIssueForm = () => {
    setShowReportIssueForm(false);
    setIssueTitle("");
    setIssueDescription("");
    setIssuePhotos([]);
    setIssuePaths([]);
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
  };

  const handleUpdateTask = (data: InsertTask) => {
    if (!editingTask) {
      return;
    }

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
      label: `${t('form.status')}: ${projectStatusFilter}`,
      onClick: () => setProjectStatusFilter("all"),
    });
  }

  const taskActiveFilters = [];
  if (taskStatusFilter !== "all") {
    taskActiveFilters.push({
      id: "status",
      label: `${t('form.status')}: ${taskStatusFilter}`,
      onClick: () => setTaskStatusFilter("all"),
    });
  }
  if (taskPriorityFilter !== "all") {
    taskActiveFilters.push({
      id: "priority",
      label: `${t('form.priority')}: ${taskPriorityFilter}`,
      onClick: () => setTaskPriorityFilter("all"),
    });
  }
  if (taskAssigneeFilter !== "all") {
    taskActiveFilters.push({
      id: "assignee",
      label: `${t('form.assignee')}: ${taskAssigneeFilter === "unassigned" ? t('form.unassigned') : taskAssigneeFilter === "me" ? t('filter.me') : getUserName(taskAssigneeFilter)}`,
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
              <h1 className="text-2xl font-bold text-[var(--pro-text-primary)]">{t('work.title')}</h1>
              <p className="text-sm text-[var(--pro-text-secondary)] mt-1">
                {t('work.subtitle')}
              </p>
            </div>

            {/* Center: Segmented Control */}
            <div className="w-full md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2 flex justify-center">
              <SegmentedControl
                options={[
                  { value: "projects", label: t('work.projects'), icon: <Briefcase className="w-4 h-4" /> },
                  { value: "tasks", label: t('work.tasks'), icon: <ListTodo className="w-4 h-4" /> },
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
                  {t('work.newProject')}
                </Button>
              ) : (
                <Button
                  onClick={() => setIsTaskCreateDialogOpen(true)}
                  data-testid="button-create-task"
                  className="tap-target"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t('work.newTask')}
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
            searchPlaceholder={t('projects.searchPlaceholder')}
            filters={projectActiveFilters}
            onClearAll={projectActiveFilters.length > 0 ? handleClearProjectFilters : undefined}
            sticky={false}
            data-testid="filter-bar-projects"
            rightActions={
              <>
                <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                  <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px] tap-target" data-testid="filter-status">
                    <SelectValue placeholder={t('form.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('filter.allStatus')}</SelectItem>
                    <SelectItem value="active">{t('filter.active')}</SelectItem>
                    <SelectItem value="on-hold">{t('filter.onHold')}</SelectItem>
                    <SelectItem value="completed">{t('filter.completed')}</SelectItem>
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
                    <SelectValue placeholder={t('form.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent-desc">{t('filter.sortRecentFirst')}</SelectItem>
                    <SelectItem value="recent-asc">{t('filter.sortOldestFirst')}</SelectItem>
                    <SelectItem value="name-asc">{t('filter.sortNameAZ')}</SelectItem>
                    <SelectItem value="name-desc">{t('filter.sortNameZA')}</SelectItem>
                  </SelectContent>
                </Select>

                <SegmentedControl
                  options={[
                    { value: "grid", label: t('view.grid') },
                    { value: "list", label: t('view.list') },
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
                title={t('projects.noProjects')}
                description={
                  projectSearchTerm || projectActiveFilters.length > 0
                    ? t('projects.adjustFilters')
                    : t('projects.createFirst')
                }
                action={
                  projectSearchTerm || projectActiveFilters.length > 0
                    ? undefined
                    : {
                      label: t('projects.createProject'),
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
                    onMaterials={() => setLocation(`/client-portal?projectId=${project.id}&tab=materials`)}
                    onIssues={() => setIssuesProject(project)}
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
                <span className="text-[10px] text-[var(--pro-text-secondary)]">{t('stat.total')}</span>
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
                <span className="text-[10px] text-[var(--pro-text-secondary)]">{t('stat.overdue')}</span>
              </button>
              <button
                onClick={() => setTaskStatusFilter("dueThisWeek")}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--pro-blue)]/10 rounded-lg border border-[var(--pro-blue)]/30 active:scale-95 transition-transform"
                data-testid="stat-due-this-week"
              >
                <span className="text-sm font-bold text-[var(--pro-blue)]">{taskStats.dueThisWeek}</span>
                <span className="text-[10px] text-[var(--pro-text-secondary)]">{t('stat.week')}</span>
              </button>
              <button
                onClick={() => setTaskStatusFilter("completed")}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--pro-mint)]/10 rounded-lg border border-[var(--pro-mint)]/30 active:scale-95 transition-transform"
                data-testid="stat-completed-tasks"
              >
                <span className="text-sm font-bold text-[var(--pro-mint)]">{taskStats.completed}</span>
                <span className="text-[10px] text-[var(--pro-text-secondary)]">{t('stat.done')}</span>
              </button>
            </div>

            {/* Desktop: Original 4-column grid */}
            <div className="hidden md:grid grid-cols-4 gap-4">
              <StatCard
                icon={ListTodo}
                label={t('projects.totalTasks')}
                value={taskStats.total}
                sublabel={t('stat.allTasks')}
                onClick={() => handleClearTaskFilters()}
                data-testid="stat-total-tasks-desktop"
              />
              <StatCard
                icon={AlertCircle}
                label={t('projects.overdue')}
                value={taskStats.overdue}
                sublabel={t('stat.behindSchedule')}
                tone="coral"
                onClick={() => setTaskStatusFilter("overdue")}
                data-testid="stat-overdue-tasks-desktop"
              />
              <StatCard
                icon={CalendarIcon}
                label={t('projects.dueThisWeek')}
                value={taskStats.dueThisWeek}
                sublabel={t('stat.dueWithin7Days')}
                tone="blue"
                onClick={() => setTaskStatusFilter("dueThisWeek")}
                data-testid="stat-due-this-week-desktop"
              />
              <StatCard
                icon={CheckCircle}
                label={t('projects.completed')}
                value={taskStats.completed}
                sublabel={t('stat.finishedTasks')}
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
                  placeholder={t('tasks.searchPlaceholder')}
                  data-testid="filter-search-input"
                  className="pl-9 h-10 bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] text-sm"
                  aria-label={t('tasks.searchPlaceholder')}
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
                  <SelectValue placeholder={t('form.status')} />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" sideOffset={4} className="z-50">
                  <SelectItem value="all">{t('filter.allStatus')}</SelectItem>
                  <SelectItem value="pending">{t('filter.pending')}</SelectItem>
                  <SelectItem value="in-progress">{t('filter.inProgress')}</SelectItem>
                  <SelectItem value="completed">{t('filter.completed')}</SelectItem>
                  <SelectItem value="blocked">{t('filter.blocked')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={taskPriorityFilter} onValueChange={setTaskPriorityFilter}>
                <SelectTrigger
                  className="flex-shrink-0 h-8 w-auto min-w-[80px] px-2.5 text-xs bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] rounded-full"
                  data-testid="filter-priority"
                >
                  <SelectValue placeholder={t('form.priority')} />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" sideOffset={4} className="z-50">
                  <SelectItem value="all">{t('filter.allPriority')}</SelectItem>
                  <SelectItem value="low">{t('filter.low')}</SelectItem>
                  <SelectItem value="medium">{t('filter.medium')}</SelectItem>
                  <SelectItem value="high">{t('filter.high')}</SelectItem>
                  <SelectItem value="critical">{t('filter.critical')}</SelectItem>
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
                  {t('view.list')}
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
                  {t('view.canvas')}
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
                  {t('filter.clear')}
                </Button>
              )}
            </div>
          </div>

          {/* Tasks Content */}
          <div className="px-6 py-6">
            {filteredTasks.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title={t('tasks.noTasks')}
                description={
                  taskSearchTerm || taskActiveFilters.length > 0
                    ? t('tasks.adjustFilters')
                    : t('tasks.createFirst')
                }
                action={
                  taskSearchTerm || taskActiveFilters.length > 0
                    ? undefined
                    : { label: t('tasks.createTask'), onClick: () => setIsTaskCreateDialogOpen(true) }
                }
                data-testid="empty-state-tasks"
              />
            ) : taskViewMode === "canvas" ? (
              /* Canvas View - Grid of cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTasks.map((task) => {
                  const project = task.projectId ? projectMap.get(task.projectId) : undefined;
                  const assignees = task.assigneeId
                    ? [{ id: task.assigneeId, name: getUserName(task.assigneeId) || t('form.unknown') }]
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
                        { label: t('actions.edit'), icon: Edit, onClick: () => handleEditTask(task) },
                        {
                          label: t('actions.delete'),
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
                            ? [{ id: task.assigneeId, name: getUserName(task.assigneeId) || t('form.unknown') }]
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
                                { label: t('actions.edit'), icon: Edit, onClick: () => handleEditTask(task) },
                                {
                                  label: t('actions.delete'),
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
                          {t('tasks.unassignedTasks')}
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
                            ? [{ id: task.assigneeId, name: getUserName(task.assigneeId) || t('form.unknown') }]
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
                                { label: t('actions.edit'), icon: Edit, onClick: () => handleEditTask(task) },
                                {
                                  label: t('actions.delete'),
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
            <DialogTitle>{t('projects.createNew')}</DialogTitle>
          </DialogHeader>
          <Form {...projectForm}>
            <form onSubmit={projectForm.handleSubmit(handleCreateProject)} className="space-y-4">
              <FormField
                control={projectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.projectName')}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-name" placeholder={t('form.projectNamePlaceholder')} />
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
                    <FormLabel>{t('form.description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        data-testid="input-description"
                        placeholder={t('form.descriptionPlaceholder')}
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
                      <FormLabel>{t('form.location')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          data-testid="input-location"
                          placeholder={t('form.locationPlaceholder')}
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
                      <FormLabel>{t('form.status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">{t('filter.active')}</SelectItem>
                          <SelectItem value="on-hold">{t('filter.onHold')}</SelectItem>
                          <SelectItem value="completed">{t('filter.completed')}</SelectItem>
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
                      <FormLabel>{t('form.progress')}</FormLabel>
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
                      <FormLabel>{t('form.dueDate')}</FormLabel>
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
                              {field.value ? format(new Date(field.value), "PPP") : t('form.pickDate')}
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
                  {t('form.cancel')}
                </Button>
                <Button
                  type="submit"
                  data-testid="button-submit"
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? t('projects.creating') : t('projects.createProject')}
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
            <DialogTitle>{t('projects.editProject')}</DialogTitle>
          </DialogHeader>
          <Form {...projectEditForm}>
            <form onSubmit={projectEditForm.handleSubmit(handleUpdateProject)} className="space-y-4">
              <FormField
                control={projectEditForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.projectName')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edit-name"
                        placeholder={t('form.projectNamePlaceholder')}
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
                    <FormLabel>{t('form.description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edit-description"
                        placeholder={t('form.descriptionPlaceholder')}
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
                        <FormLabel>{t('projects.coverPhoto')}</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            {projectPhotos.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                {t('projects.noCoverPhotos')}
                              </p>
                            ) : (
                              <>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {t('projects.selectCoverPhoto')}
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
                                    {t('projects.clearCoverPhoto')}
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
                      <FormLabel>{t('form.location')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          data-testid="input-edit-location"
                          placeholder={t('form.locationPlaceholder')}
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
                      <FormLabel>{t('form.status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">{t('filter.active')}</SelectItem>
                          <SelectItem value="on-hold">{t('filter.onHold')}</SelectItem>
                          <SelectItem value="completed">{t('filter.completed')}</SelectItem>
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
                      <FormLabel>{t('form.progress')}</FormLabel>
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
                      <FormLabel>{t('form.dueDate')}</FormLabel>
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
                              {field.value ? format(new Date(field.value), "PPP") : t('form.pickDate')}
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
                    // Mark dialog close time to prevent dropdown from opening
                    (window as any).__lastDialogCloseTime = Date.now();
                    // Just close dialog - let onOpenChange handle cleanup
                    setIsProjectEditDialogOpen(false);
                  }}
                  data-testid="button-cancel-edit"
                >
                  {t('form.cancel')}
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
                  {updateProjectMutation.isPending ? t('projects.updating') : t('projects.updateProject')}
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
            <AlertDialogTitle>{t('projects.deleteProject')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('projects.deleteConfirm', { name: projectToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t('form.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmProjectDelete();
              }}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? t('projects.deleting') : t('form.delete')}
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
            <DialogTitle>{t('tasks.createNew')}</DialogTitle>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(handleCreateTask)} className="space-y-4">
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.title')}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-task-title" placeholder={t('form.titlePlaceholder')} />
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
                    <FormLabel>{t('form.description')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-task-description" placeholder={t('form.taskDescPlaceholder')} />
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
                      <FormLabel>{t('form.project')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project">
                            <SelectValue placeholder={t('form.selectProject')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('form.noProject')}</SelectItem>
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
                      <FormLabel>{t('form.assignee')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-assignee">
                            <SelectValue placeholder={t('form.selectAssignee')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('form.unassigned')}</SelectItem>
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
                      <FormLabel>{t('form.priority')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">{t('filter.low')}</SelectItem>
                          <SelectItem value="medium">{t('filter.medium')}</SelectItem>
                          <SelectItem value="high">{t('filter.high')}</SelectItem>
                          <SelectItem value="critical">{t('filter.critical')}</SelectItem>
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
                      <FormLabel>{t('form.status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">{t('filter.pending')}</SelectItem>
                          <SelectItem value="in-progress">{t('filter.inProgress')}</SelectItem>
                          <SelectItem value="completed">{t('filter.completed')}</SelectItem>
                          <SelectItem value="blocked">{t('filter.blocked')}</SelectItem>
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
                      <FormLabel>{t('form.dueDate')}</FormLabel>
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
                              {field.value ? format(new Date(field.value), "PPP") : t('form.pickDate')}
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
                  {t('form.cancel')}
                </Button>
                <Button
                  type="submit"
                  data-testid="button-submit-task"
                  disabled={createTaskMutation.isPending}
                >
                  {createTaskMutation.isPending ? t('tasks.creating') : t('tasks.createTask')}
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
            <DialogTitle>{t('tasks.editTask')}</DialogTitle>
          </DialogHeader>
          <Form {...taskEditForm}>
            <form
              onSubmit={taskEditForm.handleSubmit((data) => {
                handleUpdateTask(data);
              })}
              className="space-y-4"
            >
              <FormField
                control={taskEditForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.title')}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-task-title" placeholder={t('form.titlePlaceholder')} />
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
                    <FormLabel>{t('form.description')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-edit-task-description" placeholder={t('form.taskDescPlaceholder')} />
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
                      <FormLabel>{t('form.project')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-task-project">
                            <SelectValue placeholder={t('form.selectProject')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('form.noProject')}</SelectItem>
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
                      <FormLabel>{t('form.assignee')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-task-assignee">
                            <SelectValue placeholder={t('form.selectAssignee')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('form.unassigned')}</SelectItem>
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
                      <FormLabel>{t('form.priority')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-task-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">{t('filter.low')}</SelectItem>
                          <SelectItem value="medium">{t('filter.medium')}</SelectItem>
                          <SelectItem value="high">{t('filter.high')}</SelectItem>
                          <SelectItem value="critical">{t('filter.critical')}</SelectItem>
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
                      <FormLabel>{t('form.status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-task-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">{t('filter.pending')}</SelectItem>
                          <SelectItem value="in-progress">{t('filter.inProgress')}</SelectItem>
                          <SelectItem value="completed">{t('filter.completed')}</SelectItem>
                          <SelectItem value="blocked">{t('filter.blocked')}</SelectItem>
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
                      <FormLabel>{t('form.dueDate')}</FormLabel>
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
                              {field.value ? format(new Date(field.value), "PPP") : t('form.pickDate')}
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
                    // Mark dialog close time to prevent dropdown from opening
                    (window as any).__lastDialogCloseTime = Date.now();
                    // Just close dialog - let onOpenChange handle cleanup
                    // Match working pattern from tasks-tablet.tsx
                    setIsTaskEditDialogOpen(false);
                  }}
                  data-testid="button-cancel-edit-task"
                >
                  {t('form.cancel')}
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
                  {updateTaskMutation.isPending ? t('tasks.updating') : t('tasks.updateTask')}
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
            <AlertDialogTitle>{t('tasks.deleteTask')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tasks.deleteConfirm', { title: taskToDelete?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-task">{t('form.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmTaskDelete();
              }}
              data-testid="button-confirm-delete-task"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTaskMutation.isPending}
            >
              {deleteTaskMutation.isPending ? t('tasks.deleting') : t('form.delete')}
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
            <DialogTitle>{t('projects.stages')}</DialogTitle>
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

      {/* Issues Menu Dialog */}
      <Dialog open={!!issuesProject} onOpenChange={(open) => {
        if (!open) {
          setIssuesProject(null);
          resetIssueForm();
        }
      }}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] mx-auto bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              {showReportIssueForm ? t('issues.reportNew') : t('issues.projectIssues')}
            </DialogTitle>
          </DialogHeader>

          {!showReportIssueForm ? (
            /* Menu Options */
            <div className="flex flex-col gap-3 py-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14 text-left bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                onClick={() => {
                  setLocation(`/client-portal?projectId=${issuesProject?.id}&tab=issues`);
                  setIssuesProject(null);
                }}
              >
                <Eye className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium">{t('issues.seeProjectIssues')}</div>
                  <div className="text-xs text-zinc-400">{t('issues.viewAllInPortal')}</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14 text-left bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                onClick={() => setShowReportIssueForm(true)}
              >
                <Plus className="h-5 w-5 text-green-400 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium">{t('issues.reportNew')}</div>
                  <div className="text-xs text-zinc-400">{t('issues.createNewForProject')}</div>
                </div>
              </Button>
            </div>
          ) : (
            /* Issue Creation Form */
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">{t('issues.issueTitle')}</label>
                <Input
                  placeholder={t('issues.issueTitlePlaceholder')}
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">{t('issues.description')}</label>
                <Textarea
                  placeholder={t('issues.descriptionPlaceholder')}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">{t('issues.photosOptional')}</label>
                {issuePhotos.length < 3 && (
                  <ObjectUploader
                    maxNumberOfFiles={3 - issuePhotos.length}
                    onGetUploadParameters={handleIssueUploadParameters}
                    onComplete={(results) => {
                      const newPreviewUrls = results.map(r => r.previewURL);
                      const newObjectPaths = results.map(r => r.objectPath);
                      setIssuePhotos([...issuePhotos, ...newPreviewUrls]);
                      setIssuePaths([...issuePaths, ...newObjectPaths]);
                    }}
                    buttonClassName="w-full bg-[#4ADE80] text-[#0F1115] hover:bg-[#22C55E] shadow-lg"
                  >
                    <div className="flex items-center gap-2 text-[#0F1115]">
                      <Camera className="h-4 w-4" />
                      <span className="text-[#0F1115]">{t('issues.uploadPhotos', { count: issuePhotos.length })}</span>
                    </div>
                  </ObjectUploader>
                )}
                {/* Photo previews */}
                {issuePhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {issuePhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img src={photo} alt="" className="w-full h-16 object-cover rounded border border-zinc-700" />
                        <button
                          type="button"
                          onClick={() => {
                            setIssuePhotos(issuePhotos.filter((_, i) => i !== index));
                            setIssuePaths(issuePaths.filter((_, i) => i !== index));
                          }}
                          className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={resetIssueForm}
                  className="flex-1 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                >
                  {t('form.cancel')}
                </Button>
                <Button
                  onClick={handleCreateIssue}
                  disabled={!issueTitle || !issueDescription || isCreatingIssue}
                  className="flex-1"
                >
                  {isCreatingIssue ? t('issues.creating') : t('issues.createIssue')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <BottomNavigation
          items={[
            { value: "projects", label: t('work.projects'), icon: <FolderKanban size={20} /> },
            { value: "tasks", label: t('work.tasks'), icon: <ClipboardList size={20} />, badge: taskStats.overdue > 0 ? taskStats.overdue : undefined },
          ]}
          value={activeSegment}
          onChange={(value) => setActiveSegment(value as WorkSegment)}
        />
      </div>
    </div>
  );
}
