import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CalendarIcon, Clock, User as UserIcon, MoreHorizontal, Edit, Trash2, Building, Settings, CheckCircle, Grid3X3, List, FolderOpen, ChevronDown, ChevronRight, AlarmClock, Filter, RotateCcw, CheckSquare, Square, Eye, Search, Maximize2, Minimize2, SlidersHorizontal } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Task, InsertTask, Project, User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical":
      return "bg-brand-coral/10 text-brand-coral border-brand-coral/30 border-[1.5px]";
    case "high":
      return "bg-brand-coral/10 text-brand-coral border-brand-coral/30 border-[1.5px]";
    case "medium":
      return "bg-brand-ink/10 text-brand-ink border-brand-ink/30 border-[1.5px]";
    case "low":
      return "bg-brand-teal/10 text-brand-teal border-brand-teal/30 border-[1.5px]";
    default:
      return "bg-brand-grey/10 text-brand-ink border-brand-grey/30 border-[1.5px]";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-brand-teal/10 text-brand-teal border-brand-teal/30 border-[1.5px]";
    case "in-progress":
      return "bg-brand-blue/10 text-brand-blue border-brand-blue/30 border-[1.5px]";
    case "blocked":
      return "bg-brand-coral/10 text-brand-coral border-brand-coral/30 border-[1.5px]";
    case "pending":
      return "bg-brand-grey/10 text-brand-ink border-brand-grey/30 border-[1.5px]";
    default:
      return "bg-brand-grey/10 text-brand-ink border-brand-grey/30 border-[1.5px]";
  }
};

// Helper functions for task management improvements
const isTaskOverdue = (task: Task): boolean => {
  if (!task.dueDate) return false;
  return new Date(task.dueDate) < new Date();
};

const getTaskStats = (tasks: Task[]) => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const overdue = tasks.filter(t => isTaskOverdue(t)).length;
  const dueThisWeek = tasks.filter(t => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= now && dueDate <= weekFromNow;
  }).length;
  
  return { total, completed, overdue, dueThisWeek };
};

const getProjectProgress = (tasks: Task[]) => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const overdue = tasks.filter(t => isTaskOverdue(t)).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  
  // Color-coded progress bars based on project health
  let progressColor = '#43A047'; // Green - on track
  if (overdue > 0) {
    progressColor = '#E53935'; // Red - has overdue tasks
  } else if (percentage < 50 && total > 0) {
    progressColor = '#FB8C00'; // Amber - slipping behind
  }
  
  return { total, completed, percentage, progressColor };
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "project":
      return Building;
    case "administrative":
      return Settings;
    case "general":
    default:
      return CheckCircle;
  }
};

// Keyboard shortcuts implementation - Enhancement #3
const useKeyboardShortcuts = (handlers: {
  onNewTask: () => void;
  onEditSelected: () => void;
  onToggleStatus: () => void;
}) => {

  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N for new task
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        handlers.onNewTask();
      }
      // E for edit (when not in input field)
      else if (e.key === 'e' && !['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) {
        e.preventDefault();
        handlers.onEditSelected();
      }
      // S for status change (when not in input field)
      else if (e.key === 's' && !['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) {
        e.preventDefault();
        handlers.onToggleStatus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};

interface TaskCardProps {
  task: Task;
  project?: Project;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: string) => void;
  onScheduleChange?: (task: Task) => void;
  getUserDisplayName: (userId: string | null) => string | null;
}

function TaskCard({ task, project, onEdit, onDelete, onStatusChange, onScheduleChange, getUserDisplayName }: TaskCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isOverdue = isTaskOverdue(task);
  
  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer p-4 space-y-3",
        isOverdue && "border-l-4 border-l-red-500"
      )}
      onClick={(e) => {
        // Prevent opening task detail if delete dialog is open
        if (!isDeleteDialogOpen) {
          onScheduleChange?.(task);
        }
      }}
    >
      {/* Header section with task title and actions */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start space-x-2 flex-1 min-w-0">
          <div className="flex items-center flex-shrink-0">
            {(() => {
              const IconComponent = getCategoryIcon(task.category || "general");
              const iconClass = task.category === "project" ? "text-blue-600" : 
                               task.category === "administrative" ? "text-purple-600" : "text-green-600";
              return <IconComponent size={16} className={iconClass} />;
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium construction-secondary truncate" title={task.title}>
              {task.title}
            </h3>
            {project && (
              <p className="text-sm text-muted-foreground mt-1 truncate">{project.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
          <div className="hidden sm:block">
            <Badge className={getPriorityColor(task.priority)} variant="outline">
              {task.priority}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0 hidden sm:flex"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              title="Edit task"
            >
              <Edit size={14} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hidden sm:flex"
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleteDialogOpen(true);
              }}
              title="Delete task"
            >
              <Trash2 size={14} />
            </Button>
            {/* Mobile actions */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 w-10 p-0 rounded-lg"
                    aria-label={`Actions for task ${task.title}`}
                  >
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}>
                    <Edit size={12} className="mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 size={12} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                onDelete(task);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Task description with proper truncation */}
      {task.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
      )}
      
      {/* Chips section with uniform height and consistent order */}
      <div className="flex flex-wrap gap-2">
        <Badge className={cn(
          getPriorityColor(task.priority),
          "h-7 px-3 rounded-full text-xs font-medium"
        )} variant="outline">
          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </Badge>
        <Badge className={cn(
          getStatusColor(task.status),
          "h-7 px-3 rounded-full text-xs font-medium"
        )} variant="secondary">
          {task.status.replace("-", " ")}
        </Badge>
      </div>
      
      {/* Icons and indicators - consistent left-aligned stack */}
      <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground">
        {task.dueDate && (
          <div className={cn(
            "flex items-center gap-1",
            isOverdue && "text-red-600 font-medium"
          )}>
            <CalendarIcon size={14} />
            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
        )}
        
        {task.assigneeId && (
          <div className="flex items-center gap-1">
            <UserIcon size={14} />
            <span>{getUserDisplayName(task.assigneeId)}</span>
          </div>
        )}
      </div>
      
      {/* Mobile status change with proper sizing */}
      <div className="md:hidden">
        <Select value={task.status} onValueChange={(value) => onStatusChange(task, value)}>
          <SelectTrigger 
            className="h-9 min-w-[110px] text-sm w-full"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Change status for task ${task.title}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}

interface TaskListItemProps {
  task: Task;
  projectName?: string;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: string) => void;
  onScheduleChange?: (task: Task) => void;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
  showBulkSelect?: boolean;
  getUserDisplayName: (userId: string | null) => string | null;
}

function TaskListItem({ 
  task, 
  projectName, 
  onEdit, 
  onDelete, 
  onStatusChange, 
  onScheduleChange,
  isSelected = false,
  onToggleSelect,
  showBulkSelect = false,
  getUserDisplayName
}: TaskListItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const CategoryIcon = getCategoryIcon(task.category || "general");
  const iconClass = task.category === "project" ? "text-blue-600" : 
                   task.category === "administrative" ? "text-purple-600" : "text-green-600";
  
  const isOverdue = isTaskOverdue(task);
  
  // Generate avatar initials from assignee (Enhancement #7)
  const getAssigneeInitials = (assigneeId: string | null) => {
    if (!assigneeId) return null;
    // This would normally come from user data, using mock initials for demo
    const names = ['JD', 'SM', 'AC', 'RW', 'MJ'];
    return names[Math.floor(Math.random() * names.length)];
  };
  
  return (
    <Card 
      className={cn(
        "transition-all cursor-pointer border-l-2 border-l-transparent hover:shadow-[0_1px_4px_rgba(0,0,0,0.06)]",
        isOverdue && "border-l-red-500 border-l-2", // Red left accent bar for overdue
        isSelected && "bg-white border-l-blue-500 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
      )}
      onClick={(e) => {
        try {
          // Only trigger if clicked on the card itself, not on interactive elements
          const target = e.target as HTMLElement;
          const isClickableElement = target.closest('button, select, input, a, [role="button"], [data-radix-collection-item]');
          
          if (!isDeleteDialogOpen && !isClickableElement) {
            e.preventDefault();
            e.stopPropagation();
            onScheduleChange?.(task);
          }
        } catch (error) {
          console.error('❌ Task click error:', error);
        }
      }}
    >
      <CardContent className="p-4 md:px-4 md:py-3">
        {/* Mobile-Optimized Layout */}
        <div className="space-y-3 md:space-y-0">
          {/* Top Row: Icons, Title, and Mobile Actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-2 flex-1 min-w-0">
              {/* Bulk Selection Checkbox */}
              {showBulkSelect && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleSelect?.(task.id);
                  }}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              )}
              
              {/* Status Icons */}
              <div className="flex items-center space-x-1 flex-shrink-0 mt-0.5">
                {isOverdue && (
                  <AlarmClock size={14} className="text-red-500" />
                )}
                {task.status === "completed" && (
                  <CheckCircle size={14} className="text-green-500" />
                )}
                <CategoryIcon size={16} className={iconClass} />
              </div>
              
              {/* Task Title and Project */}
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-medium text-base leading-tight truncate",
                  isOverdue && "text-red-700"
                )} title={task.title}>
                  {task.title}
                </h3>
                
                {projectName && (
                  <div className="flex items-center mt-1 text-sm text-muted-foreground">
                    <FolderOpen size={12} className="mr-1 flex-shrink-0" />
                    <span className="truncate">{projectName}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Mobile Actions - Desktop Only */}
            <div className="hidden md:flex items-center space-x-2 flex-shrink-0">
              <Select value={task.status} onValueChange={(value) => onStatusChange(task, value)}>
                <SelectTrigger 
                  className="h-8 w-auto text-xs border px-2 py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                  title="Edit task"
                >
                  <Edit size={14} />
                </Button>
                <AlertDialog 
                  open={isDeleteDialogOpen} 
                  onOpenChange={setIsDeleteDialogOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeleteDialogOpen(true);
                      }}
                      title="Delete task"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Task</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{task.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel 
                        onClick={() => setIsDeleteDialogOpen(false)}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => {
                          setIsDeleteDialogOpen(false);
                          onDelete(task);
                        }}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
          
          {/* Mobile: Priority and Status Chips - Better Alignment */}
          <div className="flex flex-wrap gap-2 items-center">
            <Badge 
              variant="outline" 
              className={cn(
                getPriorityColor(task.priority),
                "h-6 px-2 text-xs font-medium rounded-full"
              )}
            >
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Badge>
            
            <Badge 
              className={cn(
                getStatusColor(task.status),
                "h-6 px-2 text-xs font-medium rounded-full"
              )}
            >
              {task.status.replace("-", " ")}
            </Badge>
          </div>
          
          {/* Task Details Row */}
          <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground">
            {task.dueDate && (
              <div className={cn(
                "flex items-center gap-1",
                isOverdue && "text-red-600 font-medium"
              )}>
                <CalendarIcon size={12} />
                <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            
            {task.assigneeId && (
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-700">
                    {getAssigneeInitials(task.assigneeId)}
                  </span>
                </div>
                <span>{getUserDisplayName(task.assigneeId)}</span>
              </div>
            )}
          </div>
          
          {/* Task Description */}
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
          )}
          
          {/* Mobile Actions - Full Width */}
          <div className="md:hidden flex gap-2">
            <Select value={task.status} onValueChange={(value) => onStatusChange(task, value)}>
              <SelectTrigger 
                className="h-9 flex-1 text-sm"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Change status for task ${task.title}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 w-12 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              title="Edit task"
              aria-label={`Edit task ${task.title}`}
            >
              <Edit size={16} />
            </Button>
            
            <AlertDialog 
              open={isDeleteDialogOpen} 
              onOpenChange={setIsDeleteDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 w-12 p-0 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteDialogOpen(true);
                  }}
                  title="Delete task"
                  aria-label={`Delete task ${task.title}`}
                >
                  <Trash2 size={16} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Task</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{task.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel 
                    onClick={() => setIsDeleteDialogOpen(false)}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => {
                      setIsDeleteDialogOpen(false);
                      onDelete(task);
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Tasks() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTaskDetailDialogOpen, setIsTaskDetailDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"canvas" | "list">("list");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [bulkActionMode, setBulkActionMode] = useState(false);

  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: InsertTask) => apiRequest("/api/tasks", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertTask> }) => 
      apiRequest(`/api/tasks/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsEditDialogOpen(false);
      setIsTaskDetailDialogOpen(false);
      setEditingTask(null);
      editForm.reset();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      // Close any open dialogs to prevent showing deleted task
      setIsTaskDetailDialogOpen(false);
      setIsEditDialogOpen(false);
      setEditingTask(null);
    },
  });

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

  const onSubmit = (data: InsertTask) => {
    console.log("Tasks page form data:", data);
    
    // Prepare data for API - send dates as ISO strings
    const taskData = {
      ...data,
      description: data.description?.trim() || null,
      dueDate: data.dueDate ? (typeof data.dueDate === 'string' ? data.dueDate : data.dueDate.toISOString()) : null,
    };
    
    console.log("Tasks page data being sent to API:", taskData);
    createTaskMutation.mutate(taskData);
  };

  const onEditSubmit = (data: InsertTask) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data });
    }
  };

  const handleEditTask = (task: Task) => {
    console.log('📝 handleEditTask called for:', task.title, 'ID:', task.id);
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
    console.log('✅ Edit dialog opened successfully');
  };

  const handleDeleteTask = (task: Task) => {
    deleteTaskMutation.mutate(task.id);
  };

  const handleStatusChange = (task: Task, newStatus: string) => {
    updateTaskMutation.mutate({ 
      id: task.id, 
      data: { 
        status: newStatus
      }
    });
  };

  const handleScheduleChange = (task: Task) => {
    // Simplified: just open edit dialog instead of separate task detail dialog
    handleEditTask(task);
  };

  const handleTaskDetailOpen = (task: Task) => {
    // Redirect to edit instead to avoid modal conflicts
    handleEditTask(task);
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Fetch users for assignee filtering and display
  const { data: managers = [], isLoading: managersLoading } = useQuery<User[]>({
    queryKey: ["/api/users/managers"],
  });

  // Helper function to get user display name
  const getUserDisplayName = (userId: string | null) => {
    if (!userId) return null;
    const user = managers.find(m => m.id === userId);
    if (!user) return "Unknown User";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    return user.email || 'Unknown User';
  };

  // Filter and organize tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === "all" || 
                           (assigneeFilter === "unassigned" && !task.assigneeId) ||
                           (assigneeFilter === "me" && task.assigneeId === (user as any)?.id) ||
                           task.assigneeId === assigneeFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });

  // Calculate task statistics for global summary
  const taskStats = getTaskStats(filteredTasks);

  // Keyboard shortcuts implementation - Enhancement #3
  useKeyboardShortcuts({
    onNewTask: () => setIsCreateDialogOpen(true),
    onEditSelected: () => {
      if (selectedTasks.size === 1) {
        const taskId = Array.from(selectedTasks)[0];
        const task = tasks.find(t => t.id === taskId);
        if (task) handleEditTask(task);
      }
    },
    onToggleStatus: () => {
      if (selectedTasks.size === 1) {
        const taskId = Array.from(selectedTasks)[0];
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          const newStatus = task.status === 'completed' ? 'pending' : 'completed';
          handleStatusChange(task, newStatus);
        }
      }
    }
  });

  // Group tasks by projects and categories
  const projectTasks = filteredTasks.filter(task => task.projectId);
  const generalTasks = filteredTasks.filter(task => !task.projectId && task.category === "general");
  const adminTasks = filteredTasks.filter(task => !task.projectId && task.category === "administrative");

  // Group project tasks by project
  const tasksByProject = projects.reduce((acc, project) => {
    const projectTasksList = projectTasks.filter(task => task.projectId === project.id);
    if (projectTasksList.length > 0) {
      acc[project.id] = {
        project,
        tasks: projectTasksList
      };
    }
    return acc;
  }, {} as Record<string, { project: Project; tasks: Task[] }>);

  if (tasksLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Task Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold construction-secondary">Task Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="construction-primary text-white h-9 rounded-lg">
              <Plus size={16} className="mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <TaskForm 
              form={form} 
              onSubmit={onSubmit} 
              projects={projects}
              isLoading={createTaskMutation.isPending}
              submitText="Create Task"
            />
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <TaskForm 
              form={editForm} 
              onSubmit={onEditSubmit} 
              projects={projects}
              isLoading={updateTaskMutation.isPending}
              submitText="Save Changes"
            />
          </DialogContent>
        </Dialog>

        {/* Task Detail Modal - Comprehensive Editing */}
        <Dialog open={isTaskDetailDialogOpen} onOpenChange={setIsTaskDetailDialogOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {editingTask?.title || "Edit Task"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2 mt-2">
              {editingTask && (
                <>
                  <Badge className={getPriorityColor(editingTask.priority)} variant="outline">
                    {editingTask.priority}
                  </Badge>
                  <Badge className={getStatusColor(editingTask.status)} variant="secondary">
                    {editingTask.status.replace("-", " ")}
                  </Badge>
                  {editingTask.category && (
                    <Badge variant="outline" className="bg-gray-50">
                      {editingTask.category}
                    </Badge>
                  )}
                </>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Main Content - Task Form */}
              <div className="lg:col-span-2 space-y-4">
                <TaskForm 
                  form={editForm} 
                  onSubmit={onEditSubmit} 
                  projects={projects}
                  isLoading={updateTaskMutation.isPending}
                  submitText="Save Changes"
                />
              </div>
              
              {/* Sidebar - Additional Info */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700">Task Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {editingTask?.dueDate && (
                      <div className="flex items-center text-sm">
                        <Clock size={14} className="mr-2 text-gray-500" />
                        <span className="text-gray-600">Due:</span>
                        <span className="ml-1 font-medium">
                          {new Date(editingTask.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {editingTask?.projectId && projects.find(p => p.id === editingTask.projectId) && (
                      <div className="flex items-center text-sm">
                        <Building size={14} className="mr-2 text-blue-500" />
                        <span className="text-gray-600">Project:</span>
                        <span className="ml-1 font-medium text-blue-600">
                          {projects.find(p => p.id === editingTask.projectId)?.name}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm">
                      <UserIcon size={14} className="mr-2 text-gray-500" />
                      <span className="text-gray-600">Created:</span>
                      <span className="ml-1 font-medium">
                        {editingTask?.createdAt ? new Date(editingTask.createdAt).toLocaleDateString() : "Unknown"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                {editingTask?.description && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-gray-700">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {editingTask.description}
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        if (editingTask) {
                          handleStatusChange(editingTask, editingTask.status === "completed" ? "in-progress" : "completed");
                        }
                      }}
                    >
                      <CheckCircle size={14} className="mr-2" />
                      {editingTask?.status === "completed" ? "Mark Incomplete" : "Mark Complete"}
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} className="mr-2" />
                          Delete Task
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Task</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{editingTask?.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => {
                              if (editingTask) {
                                const taskId = editingTask.id;
                                // Clear editing state immediately to close dialog
                                setEditingTask(null);
                                setIsTaskDetailDialogOpen(false);
                                // Delete the task
                                deleteTaskMutation.mutate(taskId);
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>


      </div>

      {/* Task Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{taskStats.total}</div>
            <div className="text-sm text-slate-600 mt-1">Total Tasks</div>
          </CardContent>
        </Card>
        
        <Card className={cn(
          "border",
          taskStats.overdue > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"
        )}>
          <CardContent className="p-4 text-center">
            <div className={cn(
              "text-2xl font-bold",
              taskStats.overdue > 0 ? "text-red-600" : "text-slate-900"
            )}>{taskStats.overdue}</div>
            <div className="text-sm text-slate-600 mt-1">Overdue</div>
          </CardContent>
        </Card>
        
        <Card className="bg-orange-50 border border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{taskStats.dueThisWeek}</div>
            <div className="text-sm text-slate-600 mt-1">Due This Week</div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
            <div className="text-sm text-slate-600 mt-1">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile-Optimized Action Buttons Row */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          {/* Desktop: Show buttons normally */}
          <div className="hidden md:flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allExpanded = Object.keys(collapsedSections).length === 0 || 
                                   Object.values(collapsedSections).every(v => !v);
                if (allExpanded) {
                  const newCollapsed: Record<string, boolean> = { projects: true, administrative: true, general: true };
                  Object.values(tasksByProject).forEach(({ project }) => {
                    newCollapsed[`project-${project.id}`] = true;
                  });
                  setCollapsedSections(newCollapsed);
                } else {
                  setCollapsedSections({});
                }
              }}
              className="text-sm h-9 rounded-lg"
            >
              {Object.keys(collapsedSections).length === 0 || Object.values(collapsedSections).every(v => !v) ? (
                <>
                  <Minimize2 size={14} className="mr-1" />
                  Collapse All
                </>
              ) : (
                <>
                  <Maximize2 size={14} className="mr-1" />
                  Expand All
                </>
              )}
            </Button>
            
            <Button
              variant={bulkActionMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setBulkActionMode(!bulkActionMode);
                setSelectedTasks(new Set());
              }}
              className="text-sm h-9 rounded-lg"
            >
              <CheckSquare size={14} className="mr-1" />
              Bulk Edit
            </Button>
          </div>

          {/* Mobile: Bulk actions in dropdown */}
          <div className="md:hidden w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 w-full justify-between"
                >
                  <span className="flex items-center">
                    <Settings size={14} className="mr-2" />
                    Actions
                  </span>
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => {
                  const allExpanded = Object.keys(collapsedSections).length === 0 || 
                                     Object.values(collapsedSections).every(v => !v);
                  if (allExpanded) {
                    const newCollapsed: Record<string, boolean> = { projects: true, administrative: true, general: true };
                    Object.values(tasksByProject).forEach(({ project }) => {
                      newCollapsed[`project-${project.id}`] = true;
                    });
                    setCollapsedSections(newCollapsed);
                  } else {
                    setCollapsedSections({});
                  }
                }}>
                  {Object.keys(collapsedSections).length === 0 || Object.values(collapsedSections).every(v => !v) ? (
                    <>
                      <Minimize2 size={14} className="mr-2" />
                      Collapse All
                    </>
                  ) : (
                    <>
                      <Maximize2 size={14} className="mr-2" />
                      Expand All
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setBulkActionMode(!bulkActionMode);
                  setSelectedTasks(new Set());
                }}>
                  <CheckSquare size={14} className="mr-2" />
                  {bulkActionMode ? "Exit Bulk Edit" : "Bulk Edit"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Sticky Filter & View Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-4 -mx-6" style={{ marginBottom: '16px' }}>
        {/* Mobile: Stack search on top, filters below */}
        <div className="space-y-3 md:space-y-0">
          {/* Search and view toggles */}
          <div className="flex gap-2 items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 max-w-sm">
              <Search size={16} className="text-slate-400" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 shadow-sm focus-visible:ring-0 pl-0 rounded-lg"
              />
            </div>
            
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === "canvas" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("canvas")}
                className="border-0 rounded-r-none h-9 px-3"
              >
                <Grid3X3 size={16} className="mr-1" />
                <span className="hidden sm:inline">Canvas</span>
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="border-0 rounded-l-none h-9 px-3"
              >
                <List size={16} className="mr-1" />
                <span className="hidden sm:inline">List</span>
              </Button>
            </div>
          </div>

          {/* Mobile: Horizontally scrollable filters */}
          <div className="flex gap-2 overflow-x-auto flex-nowrap pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="min-w-[110px] h-9 rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="min-w-[110px] h-9 rounded-lg">
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
            
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="min-w-[120px] h-9 rounded-lg">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All People</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="me">Assigned to Me</SelectItem>
                {managers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {getUserDisplayName(manager.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Clear filters chip */}
            {(statusFilter !== "all" || priorityFilter !== "all" || assigneeFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setAssigneeFilter("all");
                }}
                className="h-9 px-3 rounded-lg whitespace-nowrap"
              >
                <RotateCcw size={14} className="mr-1" />
                Clear
              </Button>
            )}
            
            {/* Advanced Filter Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="h-9 px-3 rounded-lg whitespace-nowrap"
            >
              <SlidersHorizontal size={14} className="mr-1" />
              Filters
            </Button>
          </div>
        </div>
        
        {/* Advanced Filters Panel - Enhancement #9 */}
        {showAdvancedFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Project</label>
                <Select value="all" onValueChange={() => {}}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Due Date</label>
                <Select value="all" onValueChange={() => {}}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Any Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Date</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="today">Due Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Assignee</label>
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Anyone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Anyone</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="me">Assigned to Me</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {getUserDisplayName(manager.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setAssigneeFilter("all");
                    setShowAdvancedFilters(false);
                  }}
                  className="h-8 text-xs"
                >
                  <RotateCcw size={12} className="mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Bulk Actions Toolbar - Enhancement #2 */}
      {bulkActionMode && selectedTasks.size > 0 && (
        <div className="sticky top-20 z-10 bg-blue-50 border border-blue-200 rounded-lg p-3 -mx-6 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">
              {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <Select value="" onValueChange={() => {}}>
                <SelectTrigger className="h-8 w-32">
                  <SelectValue placeholder="Change Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value="" onValueChange={() => {}}>
                <SelectTrigger className="h-8 w-32">
                  <SelectValue placeholder="Assign To" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassign">Unassign</SelectItem>
                  <SelectItem value="me">Assign to Me</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" className="h-8 text-red-600">
                <Trash2 size={12} className="mr-1" />
                Delete
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8"
                onClick={() => {
                  setSelectedTasks(new Set());
                  setBulkActionMode(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {viewMode === "list" ? (
        // List View
        <div className="space-y-3">
          {/* Project Tasks Section */}
          {Object.values(tasksByProject).length > 0 && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => toggleSection('projects')}
                className="flex items-center space-x-2 w-full justify-start p-2 h-auto hover:bg-gray-50"
              >
                {collapsedSections['projects'] ? 
                  <ChevronRight size={20} className="text-blue-600" /> : 
                  <ChevronDown size={20} className="text-blue-600" />
                }
                <FolderOpen size={20} className="text-blue-600" />
                <h2 className="text-lg font-semibold text-blue-600">Project Tasks</h2>
                <Badge variant="outline" className="ml-2 text-xs">
                  {Object.values(tasksByProject).reduce((total, { tasks }) => total + tasks.length, 0)} tasks
                </Badge>
              </Button>
              
              {!collapsedSections['projects'] && Object.values(tasksByProject).map(({ project, tasks }) => {
                const projectProgress = getProjectProgress(tasks);
                
                return (
                  <div key={project.id} className="space-y-2">
                    {/* Mobile-Optimized Sticky Project Header */}
                    <div className="sticky top-20 z-5 bg-white border-b border-slate-100 rounded-lg">
                      <Button
                        variant="ghost"
                        onClick={() => toggleSection(`project-${project.id}`)}
                        className="flex items-center w-full justify-start p-3 h-auto hover:bg-gray-50 ml-6"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            {collapsedSections[`project-${project.id}`] ? 
                              <ChevronRight size={16} className="text-gray-400 flex-shrink-0" /> : 
                              <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                            }
                            <Building size={16} className="text-brand-teal flex-shrink-0" />
                            <span className="text-md font-medium text-gray-700 truncate">{project.name}</span>
                            
                            {/* Mobile: Compact task count pill */}
                            <Badge 
                              variant="outline" 
                              className="h-6 px-2 text-xs bg-teal-50 text-teal-700 border-teal-200 rounded-full flex-shrink-0"
                            >
                              {tasks.length}
                            </Badge>
                          </div>
                          
                          {/* Desktop: Show detailed progress */}
                          <div className="hidden md:flex items-center space-x-2 flex-shrink-0">
                            <div className="w-4 h-4 relative">
                              <svg className="w-4 h-4 transform -rotate-90" viewBox="0 0 24 24">
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="8"
                                  stroke="#E5E7EB"
                                  strokeWidth="3"
                                  fill="none"
                                />
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="8"
                                  stroke={projectProgress.progressColor}
                                  strokeWidth="3"
                                  fill="none"
                                  strokeDasharray={50.24}
                                  strokeDashoffset={50.24 - (50.24 * projectProgress.percentage) / 100}
                                  className="transition-all duration-300"
                                />
                              </svg>
                            </div>
                            
                            <div className="w-8 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full transition-all duration-300 rounded-full"
                                style={{ 
                                  width: `${projectProgress.percentage}%`,
                                  background: `linear-gradient(90deg, ${projectProgress.progressColor}30 0%, ${projectProgress.progressColor} 100%)`
                                }}
                              />
                            </div>
                          </div>
                          
                          {/* Mobile: Simple progress indicator */}
                          <div className="md:hidden flex items-center space-x-1 flex-shrink-0">
                            <div className="w-6 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full transition-all duration-300 rounded-full"
                                style={{ 
                                  width: `${projectProgress.percentage}%`,
                                  background: projectProgress.progressColor
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 font-medium min-w-[30px]">
                              {projectProgress.percentage}%
                            </span>
                          </div>
                        </div>
                      </Button>
                    </div>
                    {!collapsedSections[`project-${project.id}`] && (
                      <div className="space-y-3 pl-6 md:pl-12">
                        {tasks.map((task) => (
                          <TaskListItem
                            key={task.id}
                            task={task}
                            projectName={project.name}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            onStatusChange={handleStatusChange}
                            onScheduleChange={handleScheduleChange}
                            isSelected={selectedTasks.has(task.id)}
                            onToggleSelect={(taskId) => {
                              const newSelected = new Set(selectedTasks);
                              if (newSelected.has(taskId)) {
                                newSelected.delete(taskId);
                              } else {
                                newSelected.add(taskId);
                              }
                              setSelectedTasks(newSelected);
                            }}
                            showBulkSelect={bulkActionMode}
                            getUserDisplayName={getUserDisplayName}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Administrative Tasks Section */}
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => toggleSection('administrative')}
              className="flex items-center space-x-2 w-full justify-start p-2 h-auto hover:bg-gray-50"
            >
              {collapsedSections['administrative'] ? 
                <ChevronRight size={20} className="text-purple-600" /> : 
                <ChevronDown size={20} className="text-purple-600" />
              }
              <Settings size={20} className="text-purple-600" />
              <h2 className="text-lg font-semibold text-purple-600">Administrative Tasks</h2>
              <Badge variant="outline" className="ml-2 text-xs">
                {adminTasks.length} task{adminTasks.length !== 1 ? 's' : ''}
              </Badge>
            </Button>
            {!collapsedSections['administrative'] && (
              <div className="space-y-2 pl-6">
                {adminTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Settings size={32} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No administrative tasks match your filters.</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting filters or create a new administrative task.</p>
                  </div>
                ) : (
                  adminTasks.map((task) => (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onStatusChange={handleStatusChange}
                      onScheduleChange={handleScheduleChange}
                      isSelected={selectedTasks.has(task.id)}
                      onToggleSelect={(taskId) => {
                        const newSelected = new Set(selectedTasks);
                        if (newSelected.has(taskId)) {
                          newSelected.delete(taskId);
                        } else {
                          newSelected.add(taskId);
                        }
                        setSelectedTasks(newSelected);
                      }}
                      showBulkSelect={bulkActionMode}
                      getUserDisplayName={getUserDisplayName}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* General Tasks Section */}
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => toggleSection('general')}
              className="flex items-center space-x-2 w-full justify-start p-2 h-auto hover:bg-gray-50"
            >
              {collapsedSections['general'] ? 
                <ChevronRight size={20} className="text-green-600" /> : 
                <ChevronDown size={20} className="text-green-600" />
              }
              <CheckCircle size={20} className="text-green-600" />
              <h2 className="text-lg font-semibold text-green-600">General Tasks</h2>
              <Badge variant="outline" className="ml-2 text-xs">
                {generalTasks.length} task{generalTasks.length !== 1 ? 's' : ''}
              </Badge>
            </Button>
            {!collapsedSections['general'] && (
              <div className="space-y-2 pl-6">
                {generalTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle size={32} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No general tasks match your filters.</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting filters or create a new general task.</p>
                  </div>
                ) : (
                  generalTasks.map((task) => (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onStatusChange={handleStatusChange}
                      onScheduleChange={handleScheduleChange}
                      isSelected={selectedTasks.has(task.id)}
                      onToggleSelect={(taskId) => {
                        const newSelected = new Set(selectedTasks);
                        if (newSelected.has(taskId)) {
                          newSelected.delete(taskId);
                        } else {
                          newSelected.add(taskId);
                        }
                        setSelectedTasks(newSelected);
                      }}
                      showBulkSelect={bulkActionMode}
                      getUserDisplayName={getUserDisplayName}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Enhanced Empty State - Enhancement #12 */}
          {filteredTasks.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <List size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No tasks found</h3>
                <p className="text-gray-500 mb-4">
                  {(searchTerm || statusFilter !== "all" || priorityFilter !== "all" || assigneeFilter !== "all")
                    ? "No tasks match your current filters. Try clearing some filters or adjusting your search."
                    : "Create your first task to get started with project management"
                  }
                </p>
                
                <div className="flex justify-center space-x-3">
                  {(searchTerm || statusFilter !== "all" || priorityFilter !== "all" || assigneeFilter !== "all") && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setPriorityFilter("all");
                        setAssigneeFilter("all");
                        setShowAdvancedFilters(false);
                      }}
                      className="text-sm"
                    >
                      <RotateCcw size={14} className="mr-2" />
                      Clear All Filters
                    </Button>
                  )}
                  
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="construction-primary text-white"
                  >
                    <Plus size={16} className="mr-2" />
                    Create Task
                  </Button>
                </div>
                
                {/* Keyboard Shortcuts Hint - Enhancement #3 */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-400 mb-2">Keyboard shortcuts:</p>
                  <div className="flex justify-center space-x-4 text-xs text-gray-500">
                    <span><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+N</kbd> New task</span>
                    <span><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">E</kbd> Edit selected</span>
                    <span><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">S</kbd> Change status</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Canvas View (Tabs)
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">By Projects</TabsTrigger>
            <TabsTrigger value="administrative">Administrative</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Building className="mr-2 text-blue-600" />
                  Project Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold construction-secondary">{projectTasks.length}</div>
                <p className="text-sm text-gray-600">Tasks linked to projects</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Settings className="mr-2 text-purple-600" />
                  Administrative
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold construction-secondary">{adminTasks.length}</div>
                <p className="text-sm text-gray-600">Admin & management tasks</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="mr-2 text-green-600" />
                  General Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold construction-secondary">{generalTasks.length}</div>
                <p className="text-sm text-gray-600">General operational tasks</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Tasks */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Tasks</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.slice(0, 6).map((task) => {
                const project = projects.find(p => p.id === task.projectId);
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    project={project}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                    onScheduleChange={handleScheduleChange}
                    getUserDisplayName={getUserDisplayName}
                  />
                );
              })}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="projects" className="space-y-6">
          {Object.values(tasksByProject).map(({ project, tasks }) => (
            <div key={project.id}>
              <Button
                variant="ghost"
                onClick={() => toggleSection(`canvas-project-${project.id}`)}
                className="flex items-center w-full justify-start p-2 h-auto hover:bg-gray-50 mb-4"
              >
                {collapsedSections[`canvas-project-${project.id}`] ? 
                  <ChevronRight size={16} className="mr-2" /> : 
                  <ChevronDown size={16} className="mr-2" />
                }
                <Building className="mr-2 text-blue-600" />
                <h3 className="text-lg font-semibold">{project.name}</h3>
                <Badge variant="outline" className="ml-2">{tasks.length} tasks</Badge>
              </Button>
              {!collapsedSections[`canvas-project-${project.id}`] && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      project={project}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onStatusChange={handleStatusChange}
                      onScheduleChange={handleScheduleChange}
                      getUserDisplayName={getUserDisplayName}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          {Object.keys(tasksByProject).length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No project tasks found</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="administrative">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Settings className="mr-2 text-purple-600" />
              Administrative Tasks
              <Badge variant="outline" className="ml-2">{adminTasks.length} tasks</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  onStatusChange={handleStatusChange}
                  onScheduleChange={handleScheduleChange}
                  getUserDisplayName={getUserDisplayName}
                />
              ))}
            </div>
            {adminTasks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No administrative tasks found</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="general">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <CheckCircle className="mr-2 text-green-600" />
              General Tasks
              <Badge variant="outline" className="ml-2">{generalTasks.length} tasks</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generalTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  onStatusChange={handleStatusChange}
                  onScheduleChange={handleScheduleChange}
                  getUserDisplayName={getUserDisplayName}
                />
              ))}
            </div>
            {generalTasks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No general tasks found</p>
              </div>
            )}
          </div>
        </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

interface TaskFormProps {
  form: any;
  onSubmit: (data: InsertTask) => void;
  projects: Project[];
  isLoading: boolean;
  submitText: string;
}

function TaskForm({ form, onSubmit, projects, isLoading, submitText }: TaskFormProps) {
  const watchedCategory = form.watch("category");
  const isProjectRequired = watchedCategory === "project";
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter task title" {...field} />
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
                <Textarea placeholder="Enter task description" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="project">Project Related</SelectItem>
                    <SelectItem value="administrative">Administrative</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Project {isProjectRequired ? "(Required)" : "(Optional)"}
                  {isProjectRequired && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <Select onValueChange={(value) => field.onChange(value === "none" ? null : value)} defaultValue={field.value || "none"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {!isProjectRequired && <SelectItem value="none">No Project</SelectItem>}
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
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
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
        </div>
        
        <FormField
          control={form.control}
          name="assigneeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign To</FormLabel>
              <FormControl>
                <TaskAssignmentSelect 
                  value={field.value} 
                  onChange={field.onChange}
                />
              </FormControl>
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
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isLoading} className="construction-primary text-white">
            {isLoading ? "Saving..." : submitText}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Task Assignment Select for Forms
function TaskAssignmentSelect({ value, onChange }: { value?: string | null; onChange: (value: string | null) => void }) {
  const { data: managers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/managers"],
  });

  return (
    <Select 
      value={value || "unassigned"} 
      onValueChange={(val) => onChange(val === "unassigned" ? null : val)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select assignee">
          {isLoading ? (
            "Loading..."
          ) : value ? (
            managers.find(m => m.id === value)?.name || "Unknown User"
          ) : (
            "Unassigned"
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {managers.map((manager) => (
          <SelectItem key={manager.id} value={manager.id}>
            {manager.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}