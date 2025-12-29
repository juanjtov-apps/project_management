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
import { SegmentedControl } from "@/components/ui/segmented-control";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { Plus, CalendarIcon, Clock, User as UserIcon, MoreHorizontal, Edit, Trash2, Building, Settings, CheckCircle, Grid3X3, List, FolderOpen, ChevronDown, ChevronRight, AlarmClock, RotateCcw, Search, Home, ClipboardList, FolderKanban } from "lucide-react";
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

const isTaskDueThisWeek = (task: Task): boolean => {
  if (!task.dueDate) return false;
  const dueDate = new Date(task.dueDate);
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return dueDate >= now && dueDate <= weekFromNow;
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
  const [activeTab, setActiveTab] = useState<"projects" | "tasks">("tasks");
  const [mobileNav, setMobileNav] = useState<string>("tasks");

  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: InsertTask) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f2090437-30eb-45e2-91c9-7d1d76f81235',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tasks.tsx:mutationFn',message:'Mutation function called',data:{mutationData:data},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return apiRequest("/api/tasks", { method: "POST", body: data });
    },
    onSuccess: () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f2090437-30eb-45e2-91c9-7d1d76f81235',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tasks.tsx:onSuccess',message:'Mutation succeeded',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f2090437-30eb-45e2-91c9-7d1d76f81235',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tasks.tsx:onError',message:'Mutation failed',data:{error:error?.message||String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error("Task creation failed:", error);
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f2090437-30eb-45e2-91c9-7d1d76f81235',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tasks.tsx:onSubmit',message:'onSubmit called with form data',data:{formData:data},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
    // #endregion
    console.log("Tasks page form data:", data);
    
    // Prepare data for API - send dates as ISO strings
    const taskData = {
      ...data,
      description: data.description?.trim() || null,
      dueDate: data.dueDate ? (typeof data.dueDate === 'string' ? data.dueDate : data.dueDate.toISOString()) : null,
    };
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f2090437-30eb-45e2-91c9-7d1d76f81235',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tasks.tsx:onSubmit',message:'Prepared taskData for mutation',data:{taskData},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C'})}).catch(()=>{});
    // #endregion
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
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "overdue" && isTaskOverdue(task)) ||
      (statusFilter === "dueThisWeek" && isTaskDueThisWeek(task)) ||
      task.status === statusFilter;
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
      <div className="space-y-4 pb-20">
        {/* Compact loading skeleton */}
        <div className="flex justify-between items-center px-1">
          <div className="h-6 w-24 bg-[var(--pro-surface-highlight)] rounded animate-shimmer"></div>
          <div className="h-9 w-9 bg-[var(--pro-surface-highlight)] rounded-lg animate-shimmer"></div>
        </div>
        <div className="flex gap-2 overflow-hidden">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex-shrink-0 w-20 h-14 bg-[var(--pro-surface)] rounded-lg animate-shimmer" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-[var(--pro-surface)] rounded-xl animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20 md:pb-6">
      {/* Compact Header: title + add button inline */}
      <div className="flex items-center justify-between gap-2 px-1">
        <h1 className="text-lg font-semibold text-[var(--pro-text-primary)]">Tasks</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="h-9 w-9 md:w-auto md:px-3 rounded-lg bg-[var(--pro-mint)] text-[var(--pro-bg-deep)] hover:bg-[var(--pro-mint-dim)]"
            >
              <Plus size={18} className="md:mr-1" />
              <span className="hidden md:inline text-sm font-medium">New Task</span>
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

      {/* Horizontal Stats Strip - compact single row */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <button
          onClick={() => setStatusFilter("all")}
          className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-[var(--pro-surface)] rounded-lg border border-[var(--pro-border)] active:scale-95 transition-transform"
        >
          <span className="text-lg font-bold text-[var(--pro-text-primary)]">{taskStats.total}</span>
          <span className="text-xs text-[var(--pro-text-secondary)]">Total</span>
        </button>
        <button
          onClick={() => setStatusFilter("overdue")}
          className={cn(
            "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border active:scale-95 transition-transform",
            taskStats.overdue > 0
              ? "bg-[var(--pro-red)]/10 border-[var(--pro-red)]/30"
              : "bg-[var(--pro-surface)] border-[var(--pro-border)]"
          )}
        >
          <span className={cn(
            "text-lg font-bold",
            taskStats.overdue > 0 ? "text-[var(--pro-red)]" : "text-[var(--pro-text-primary)]"
          )}>{taskStats.overdue}</span>
          <span className="text-xs text-[var(--pro-text-secondary)]">Overdue</span>
        </button>
        <button
          onClick={() => setStatusFilter("dueThisWeek")}
          className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-[var(--pro-orange)]/10 rounded-lg border border-[var(--pro-orange)]/30 active:scale-95 transition-transform"
        >
          <span className="text-lg font-bold text-[var(--pro-orange)]">{taskStats.dueThisWeek}</span>
          <span className="text-xs text-[var(--pro-text-secondary)]">This Week</span>
        </button>
        <button
          onClick={() => setStatusFilter("completed")}
          className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-[var(--pro-mint)]/10 rounded-lg border border-[var(--pro-mint)]/30 active:scale-95 transition-transform"
        >
          <span className="text-lg font-bold text-[var(--pro-mint)]">{taskStats.completed}</span>
          <span className="text-xs text-[var(--pro-text-secondary)]">Done</span>
        </button>
      </div>

      {/* iOS-Style Segmented Control for Projects/Tasks */}
      <div className="flex justify-center">
        <SegmentedControl
          options={[
            { value: "projects", label: "By Project", icon: <FolderKanban size={14} /> },
            { value: "tasks", label: "All Tasks", icon: <ClipboardList size={14} /> },
          ]}
          value={activeTab}
          onChange={(v) => setActiveTab(v as "projects" | "tasks")}
          className="w-full max-w-xs"
        />
      </div>

      {/* Compact Filter Bar */}
      <div className="bg-[var(--pro-surface)] rounded-xl p-3 border border-[var(--pro-border)]">
        {/* Search row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center flex-1 gap-2 px-3 py-2 bg-[var(--pro-surface-highlight)] rounded-lg">
            <Search size={14} className="text-[var(--pro-text-secondary)] flex-shrink-0" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 bg-transparent h-6 p-0 text-sm text-[var(--pro-text-primary)] placeholder:text-[var(--pro-text-muted)] focus-visible:ring-0"
            />
          </div>

          {/* View toggle - all screen sizes */}
          <div className="flex items-center bg-[var(--pro-surface-highlight)] rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("canvas")}
              className={cn(
                "h-8 w-8 p-0 rounded-md",
                viewMode === "canvas" ? "bg-[var(--pro-mint)] text-[var(--pro-bg-deep)]" : "text-[var(--pro-text-secondary)]"
              )}
            >
              <Grid3X3 size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "h-8 w-8 p-0 rounded-md",
                viewMode === "list" ? "bg-[var(--pro-mint)] text-[var(--pro-bg-deep)]" : "text-[var(--pro-text-secondary)]"
              )}
            >
              <List size={14} />
            </Button>
          </div>
        </div>

        {/* Filter chips - horizontal scroll with fixed positioning */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-shrink-0 h-8 min-w-[90px] w-auto px-2.5 text-xs bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] rounded-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={4}>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="flex-shrink-0 h-8 min-w-[90px] w-auto px-2.5 text-xs bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] rounded-full">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={4}>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="flex-shrink-0 h-8 min-w-[90px] w-auto px-2.5 text-xs bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] rounded-full">
              <SelectValue placeholder="Person" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={4}>
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
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
                setAssigneeFilter("all");
              }}
              className="flex-shrink-0 h-8 px-2.5 text-xs text-[var(--pro-red)] hover:text-[var(--pro-red)] hover:bg-[var(--pro-red)]/10 rounded-full"
            >
              <RotateCcw size={12} className="mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
      
      {/* Bulk Actions Toolbar */}
      {bulkActionMode && selectedTasks.size > 0 && (
        <div className="bg-[var(--pro-mint)]/10 border border-[var(--pro-mint)]/30 rounded-xl p-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-[var(--pro-mint)]">
              {selectedTasks.size} selected
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-[var(--pro-text-secondary)]"
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

      {/* Main Content Area - Based on activeTab and viewMode */}
      {activeTab === "projects" ? (
        // Projects View - Canvas or List based on viewMode
        viewMode === "canvas" ? (
          // Canvas View - Grid of cards grouped by project
          <div className="space-y-6">
            {Object.values(tasksByProject).length > 0 ? (
              Object.values(tasksByProject).map(({ project, tasks }) => {
                const projectProgress = getProjectProgress(tasks);
                return (
                  <div key={project.id} className="space-y-3">
                    {/* Project Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building size={16} className="text-[var(--pro-mint)]" />
                        <span className="font-medium text-[var(--pro-text-primary)]">{project.name}</span>
                        <span className="text-xs text-[var(--pro-text-secondary)]">
                          ({projectProgress.completed}/{projectProgress.total})
                        </span>
                      </div>
                      <div className="w-20 h-1.5 bg-[var(--pro-surface-highlight)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${projectProgress.percentage}%`,
                            backgroundColor: projectProgress.progressColor
                          }}
                        />
                      </div>
                    </div>
                    {/* Task Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-[var(--pro-surface)] rounded-xl border border-[var(--pro-border)]">
                <FolderOpen size={32} className="mx-auto text-[var(--pro-text-muted)] mb-2" />
                <p className="text-sm text-[var(--pro-text-secondary)]">No project tasks yet</p>
              </div>
            )}

            {/* Administrative Tasks - Canvas */}
            {adminTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Settings size={16} className="text-[var(--pro-purple)]" />
                  <span className="font-medium text-[var(--pro-text-primary)]">Administrative</span>
                  <span className="text-xs text-[var(--pro-text-secondary)]">({adminTasks.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
              </div>
            )}

            {/* General Tasks - Canvas */}
            {generalTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-[var(--pro-mint)]" />
                  <span className="font-medium text-[var(--pro-text-primary)]">General</span>
                  <span className="text-xs text-[var(--pro-text-secondary)]">({generalTasks.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
              </div>
            )}
          </div>
        ) : (
          // List View - grouped by project
          <div className="space-y-2">
            {Object.values(tasksByProject).length > 0 ? (
              Object.values(tasksByProject).map(({ project, tasks }) => {
                const projectProgress = getProjectProgress(tasks);
                const upcomingTasks = tasks.filter(t => t.status !== 'completed').slice(0, 2);

                return (
                  <div key={project.id} className="bg-[var(--pro-surface)] rounded-xl border border-[var(--pro-border)] overflow-hidden">
                    {/* Project Header Row - Enhanced with task preview */}
                    <button
                      onClick={() => toggleSection(`project-${project.id}`)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-[var(--pro-surface-highlight)] transition-colors"
                    >
                      {/* Chevron */}
                      <div className="flex-shrink-0">
                        {collapsedSections[`project-${project.id}`] ?
                          <ChevronRight size={16} className="text-[var(--pro-text-secondary)]" /> :
                          <ChevronDown size={16} className="text-[var(--pro-text-secondary)]" />
                        }
                      </div>

                      {/* Project Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <Building size={14} className="text-[var(--pro-mint)] flex-shrink-0" />
                          <span className="font-medium text-sm text-[var(--pro-text-primary)] truncate">{project.name}</span>
                        </div>

                        {/* Task preview on collapsed state */}
                        {collapsedSections[`project-${project.id}`] && upcomingTasks.length > 0 && (
                          <p className="text-xs text-[var(--pro-text-muted)] mt-0.5 truncate">
                            {upcomingTasks[0].title}
                            {upcomingTasks.length > 1 && ` +${tasks.length - 1} more`}
                          </p>
                        )}
                      </div>

                      {/* Progress bar + count */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-12 h-1.5 bg-[var(--pro-surface-highlight)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${projectProgress.percentage}%`,
                              backgroundColor: projectProgress.progressColor
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-[var(--pro-text-secondary)] w-8 text-right">
                          {projectProgress.completed}/{projectProgress.total}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Task List */}
                    {!collapsedSections[`project-${project.id}`] && (
                      <div className="border-t border-[var(--pro-border)] divide-y divide-[var(--pro-border)]">
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
              })
            ) : (
              <div className="text-center py-12 bg-[var(--pro-surface)] rounded-xl border border-[var(--pro-border)]">
                <FolderOpen size={32} className="mx-auto text-[var(--pro-text-muted)] mb-2" />
                <p className="text-sm text-[var(--pro-text-secondary)]">No project tasks yet</p>
              </div>
            )}

            {/* Administrative Tasks - Compact Card */}
            {adminTasks.length > 0 && (
              <div className="bg-[var(--pro-surface)] rounded-xl border border-[var(--pro-border)] overflow-hidden">
                <button
                  onClick={() => toggleSection('administrative')}
                  className="w-full p-3 flex items-center gap-3 hover:bg-[var(--pro-surface-highlight)] transition-colors"
                >
                  <div className="flex-shrink-0">
                    {collapsedSections['administrative'] ?
                      <ChevronRight size={16} className="text-[var(--pro-text-secondary)]" /> :
                      <ChevronDown size={16} className="text-[var(--pro-text-secondary)]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <Settings size={14} className="text-[var(--pro-purple)] flex-shrink-0" />
                      <span className="font-medium text-sm text-[var(--pro-text-primary)]">Administrative</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[var(--pro-text-secondary)]">{adminTasks.length}</span>
                </button>

                {!collapsedSections['administrative'] && (
                  <div className="border-t border-[var(--pro-border)] divide-y divide-[var(--pro-border)]">
                    {adminTasks.map((task) => (
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
                          if (newSelected.has(taskId)) newSelected.delete(taskId);
                          else newSelected.add(taskId);
                          setSelectedTasks(newSelected);
                        }}
                        showBulkSelect={bulkActionMode}
                        getUserDisplayName={getUserDisplayName}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* General Tasks - Compact Card */}
            {generalTasks.length > 0 && (
              <div className="bg-[var(--pro-surface)] rounded-xl border border-[var(--pro-border)] overflow-hidden">
                <button
                  onClick={() => toggleSection('general')}
                  className="w-full p-3 flex items-center gap-3 hover:bg-[var(--pro-surface-highlight)] transition-colors"
                >
                  <div className="flex-shrink-0">
                    {collapsedSections['general'] ?
                      <ChevronRight size={16} className="text-[var(--pro-text-secondary)]" /> :
                      <ChevronDown size={16} className="text-[var(--pro-text-secondary)]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-[var(--pro-mint)] flex-shrink-0" />
                      <span className="font-medium text-sm text-[var(--pro-text-primary)]">General</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[var(--pro-text-secondary)]">{generalTasks.length}</span>
                </button>

                {!collapsedSections['general'] && (
                  <div className="border-t border-[var(--pro-border)] divide-y divide-[var(--pro-border)]">
                    {generalTasks.map((task) => (
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
                          if (newSelected.has(taskId)) newSelected.delete(taskId);
                          else newSelected.add(taskId);
                          setSelectedTasks(newSelected);
                        }}
                        showBulkSelect={bulkActionMode}
                        getUserDisplayName={getUserDisplayName}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      ) : (
        // All Tasks View - Canvas or List based on viewMode
        viewMode === "canvas" ? (
          // Canvas View - Grid of cards
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
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
              })
            ) : (
              <div className="col-span-full text-center py-12 bg-[var(--pro-surface)] rounded-xl border border-[var(--pro-border)]">
                <Grid3X3 size={32} className="mx-auto text-[var(--pro-text-muted)] mb-2" />
                <p className="text-sm text-[var(--pro-text-secondary)] mb-3">
                  {(searchTerm || statusFilter !== "all" || priorityFilter !== "all" || assigneeFilter !== "all")
                    ? "No tasks match your filters"
                    : "No tasks yet"
                  }
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-[var(--pro-mint)] text-[var(--pro-bg-deep)] hover:bg-[var(--pro-mint-dim)]"
                >
                  <Plus size={14} className="mr-1" />
                  Create Task
                </Button>
              </div>
            )}
          </div>
        ) : (
          // List View - Flat list
          <div className="space-y-2">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const project = projects.find(p => p.id === task.projectId);
                return (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    projectName={project?.name}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                    onScheduleChange={handleScheduleChange}
                    isSelected={selectedTasks.has(task.id)}
                    onToggleSelect={(taskId) => {
                      const newSelected = new Set(selectedTasks);
                      if (newSelected.has(taskId)) newSelected.delete(taskId);
                      else newSelected.add(taskId);
                      setSelectedTasks(newSelected);
                    }}
                    showBulkSelect={bulkActionMode}
                    getUserDisplayName={getUserDisplayName}
                  />
                );
              })
            ) : (
              <div className="text-center py-12 bg-[var(--pro-surface)] rounded-xl border border-[var(--pro-border)]">
                <List size={32} className="mx-auto text-[var(--pro-text-muted)] mb-2" />
                <p className="text-sm text-[var(--pro-text-secondary)] mb-3">
                  {(searchTerm || statusFilter !== "all" || priorityFilter !== "all" || assigneeFilter !== "all")
                    ? "No tasks match your filters"
                    : "No tasks yet"
                  }
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-[var(--pro-mint)] text-[var(--pro-bg-deep)] hover:bg-[var(--pro-mint-dim)]"
                >
                  <Plus size={14} className="mr-1" />
                  Create Task
                </Button>
              </div>
            )}
          </div>
        )
      )}

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <BottomNavigation
          items={[
            { value: "home", label: "Home", icon: <Home size={20} /> },
            { value: "projects", label: "Projects", icon: <FolderKanban size={20} /> },
            { value: "tasks", label: "Tasks", icon: <ClipboardList size={20} />, badge: taskStats.overdue > 0 ? taskStats.overdue : undefined },
          ]}
          value={mobileNav}
          onChange={(value) => {
            setMobileNav(value);
            // Note: actual navigation would be handled by the parent layout/router
          }}
        />
      </div>
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
  
  // #region agent log
  const handleFormSubmit = form.handleSubmit(
    (data) => {
      console.log('🟢 DEBUG: Form validation PASSED!', { data });
      fetch('http://127.0.0.1:7242/ingest/f2090437-30eb-45e2-91c9-7d1d76f81235',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TaskForm:handleSubmit:success',message:'Form validation passed',data:{formData:data,formState:{isValid:form.formState.isValid,errors:form.formState.errors}},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
      onSubmit(data);
    },
    (errors) => {
      console.log('🔴 DEBUG: Form validation FAILED!', { errors, formValues: form.getValues() });
      fetch('http://127.0.0.1:7242/ingest/f2090437-30eb-45e2-91c9-7d1d76f81235',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TaskForm:handleSubmit:error',message:'Form validation failed',data:{errors,formValues:form.getValues()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,E'})}).catch(()=>{});
    }
  );
  // #endregion
  
  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-4">
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
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="construction-primary text-white"
            onClick={(e) => {
              // #region agent log
              console.log('🔴 DEBUG: Submit button clicked!', { isLoading, isValid: form.formState.isValid, errors: form.formState.errors });
              fetch('http://127.0.0.1:7242/ingest/f2090437-30eb-45e2-91c9-7d1d76f81235',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TaskForm:submitButton:click',message:'Submit button clicked',data:{isLoading,formState:{isValid:form.formState.isValid,isSubmitting:form.formState.isSubmitting,errors:Object.keys(form.formState.errors)}},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D,E'})}).catch(()=>{});
              // #endregion
            }}
          >
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