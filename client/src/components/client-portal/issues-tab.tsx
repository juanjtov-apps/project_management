import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, AlertTriangle, CheckCircle, Camera, X, Pencil, Trash2, Loader2, History, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { getIssueStatusColor } from "@/lib/statusColors";
import { ObjectUploader } from "@/components/ObjectUploader";
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

const issueSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  photos: z.array(z.string()).max(3, "Maximum 3 photos allowed"),
});

type IssueFormData = z.infer<typeof issueSchema>;

interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string;
  photos: string[];
  attachment_count: number;
  createdBy: string;
  created_by_name: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  status: "open" | "closed";
  createdAt: string;
  created_at: string;
}

interface IssuePhoto {
  id: string;
  url: string;
  created_at: string | null;
}

interface IssueAuditEntry {
  id: string;
  issue_id: string;
  action: "created" | "edited" | "deleted";
  changes: Record<string, { old: unknown; new: unknown }> | null;
  issue_snapshot: Record<string, unknown> | null;
  created_at: string;
  actor_id: string;
  actor_name: string | null;
}

interface IssuesTabProps {
  projectId: string;
}

// Component to display issue photos with fresh signed URLs
function IssuePhotos({
  issueId,
  photoCount,
  canDelete = false
}: {
  issueId: string;
  photoCount: number;
  canDelete?: boolean;
}) {
  const { t } = useTranslation('clientPortal');
  const { t: tc } = useTranslation('common');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<{ photos: IssuePhoto[] }>({
    queryKey: [`/api/client-issues/${issueId}/photos`],
    enabled: photoCount > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const res = await apiRequest(`/api/client-issues/${issueId}/photos/${photoId}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-issues/${issueId}/photos`] });
      toast({ title: t('issues.photoDeleted'), description: t('issues.photoDeletedDesc') });
    },
    onError: () => {
      toast({ title: tc('toast.error'), description: t('issues.photoDeleteError'), variant: "destructive" });
    },
  });

  if (photoCount === 0) {
    return null;
  }
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-24 bg-muted rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const photos = data?.photos || [];
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <div key={photo.id} className="relative group">
          <img
            src={photo.url}
            alt={t('issues.issuePhoto')}
            className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80"
            onClick={() => window.open(photo.url, '_blank')}
            onError={(e) => {
              // Hide broken images
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deletePhotoMutation.mutate(photo.id);
              }}
              disabled={deletePhotoMutation.isPending}
              className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
              title={t('issues.deletePhoto')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// Component to display issue audit history (admin/PM only)
function IssueHistory({ issueId }: { issueId: string }) {
  const { t } = useTranslation('clientPortal');
  const [isExpanded, setIsExpanded] = useState(false);

  const { data, isLoading, error } = useQuery<IssueAuditEntry[]>({
    queryKey: [`/api/client-issues/${issueId}/history`],
    enabled: isExpanded,
  });

  const formatAction = (action: string) => {
    switch (action) {
      case "created":
        return { label: t('issues.actionCreated'), color: "bg-green-100 text-green-800" };
      case "edited":
        return { label: t('issues.actionEdited'), color: "bg-blue-100 text-blue-800" };
      case "deleted":
        return { label: t('issues.actionDeleted'), color: "bg-red-100 text-red-800" };
      default:
        return { label: action, color: "bg-gray-100 text-gray-800" };
    }
  };

  const formatChanges = (changes: Record<string, { old: unknown; new: unknown }> | string | null) => {
    if (!changes) return null;
    // Handle case where changes is a JSON string (double-serialized data)
    let parsed: Record<string, { old: unknown; new: unknown }> = {};
    if (typeof changes === 'string') {
      try {
        parsed = JSON.parse(changes);
      } catch {
        return null;
      }
    } else {
      parsed = changes;
    }
    return Object.entries(parsed).map(([field, value]) => {
      const oldVal = value?.old;
      const newVal = value?.new;
      return (
        <div key={field} className="text-xs text-muted-foreground ml-4">
          <span className="font-medium">{field}:</span>{" "}
          <span className="line-through text-red-600">{String(oldVal ?? "empty")}</span>
          {" → "}
          <span className="text-green-600">{String(newVal ?? "empty")}</span>
        </div>
      );
    });
  };

  return (
    <div className="mt-4 border-t pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="h-4 w-4" />
        <span>{t('issues.activityHistory')}</span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('issues.loadingHistory')}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600">
              {t('issues.failedToLoadHistory')}
            </div>
          )}

          {data && data.length === 0 && (
            <div className="text-sm text-muted-foreground">
              {t('issues.noHistoryAvailable')}
            </div>
          )}

          {data && data.map((entry) => {
            const actionInfo = formatAction(entry.action);
            return (
              <div key={entry.id} className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-muted-foreground mt-2" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${actionInfo.color} text-xs`}>
                      {actionInfo.label}
                    </Badge>
                    <span className="text-muted-foreground">
                      {t('issues.byActor', { name: entry.actor_name || "Unknown" })}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  {entry.action === "edited" && entry.changes && (
                    <div className="mt-1">
                      {formatChanges(entry.changes)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function IssuesTab({ projectId }: IssuesTabProps) {
  const { t } = useTranslation('clientPortal');
  const { t: tc } = useTranslation('common');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [deleteIssueId, setDeleteIssueId] = useState<string | null>(null);
  const [resolvingIssueId, setResolvingIssueId] = useState<string | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]); // Preview URLs for display
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]); // Object paths for storage
  const [editUploadedPhotos, setEditUploadedPhotos] = useState<string[]>([]); // Preview URLs
  const [editUploadedPaths, setEditUploadedPaths] = useState<string[]>([]); // Object paths
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Admin and PM can delete issue photos and view history
  const userRole = (user as { role?: string } | null)?.role;
  const canDeletePhotos = userRole === 'admin' || userRole === 'project_manager';
  const canViewHistory = userRole === 'admin' || userRole === 'project_manager';
  const canReopenIssues = userRole === 'admin';

  const form = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      title: "",
      description: "",
      photos: [],
    },
  });

  const editForm = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      title: "",
      description: "",
      photos: [],
    },
  });

  // Reset edit form when editing issue changes
  useEffect(() => {
    if (editingIssue) {
      editForm.reset({
        title: editingIssue.title,
        description: editingIssue.description,
        photos: [],
      });
      setEditUploadedPhotos([]);
      setEditUploadedPaths([]);
    }
  }, [editingIssue, editForm]);

  // Get issues for the project
  const { data: issuesData, isLoading } = useQuery<Issue[]>({
    queryKey: [`/api/client-issues?project_id=${projectId}`],
    enabled: !!projectId,
  });

  // Ensure issues is always an array, even if the query returns null
  const issues = issuesData || [];

  // Create issue mutation
  const createIssueMutation = useMutation({
    mutationFn: async (data: IssueFormData) => {
      const res = await apiRequest(`/api/client-issues`, {
        method: "POST",
        body: {
          project_id: projectId,
          title: data.title,
          description: data.description,
          photos: data.photos,
        },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-issues?project_id=${projectId}`] });
      toast({
        title: t('issues.created'),
        description: t('issues.submitSuccess'),
      });
      form.reset();
      setUploadedPhotos([]);
      setUploadedPaths([]);
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: tc('toast.error'),
        description: t('issues.submitError'),
        variant: "destructive",
      });
    },
  });

  // Edit issue mutation
  const editIssueMutation = useMutation({
    mutationFn: async ({ issueId, data }: { issueId: string; data: IssueFormData }) => {
      const res = await apiRequest(`/api/client-issues/${issueId}`, {
        method: "PUT",
        body: {
          title: data.title,
          description: data.description,
          photos: data.photos.length > 0 ? data.photos : undefined,
        },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-issues?project_id=${projectId}`] });
      // Invalidate the photos query for the edited issue so new photos display immediately
      if (editingIssue) {
        queryClient.invalidateQueries({ queryKey: [`/api/client-issues/${editingIssue.id}/photos`] });
      }
      toast({
        title: t('issues.updated'),
        description: t('issues.updatedDesc'),
      });
      editForm.reset();
      setEditUploadedPhotos([]);
      setEditUploadedPaths([]);
      setIsEditOpen(false);
      setEditingIssue(null);
    },
    onError: (error: any) => {
      toast({
        title: tc('toast.error'),
        description: t('issues.updateError'),
        variant: "destructive",
      });
    },
  });

  // Delete issue mutation
  const deleteIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await apiRequest(`/api/client-issues/${issueId}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-issues?project_id=${projectId}`] });
      toast({
        title: t('issues.deleted'),
        description: t('issues.deletedDesc'),
      });
      setDeleteIssueId(null);
    },
    onError: (error: any) => {
      toast({
        title: tc('toast.error'),
        description: t('issues.deleteError'),
        variant: "destructive",
      });
    },
  });

  // Close issue mutation
  const closeIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await apiRequest(`/api/client-issues/${issueId}?status=closed`, {
        method: "PATCH",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-issues?project_id=${projectId}`] });
      setResolvingIssueId(null);
      toast({
        title: t('issues.closed'),
        description: t('issues.closedDesc'),
      });
    },
  });

  // Reopen issue mutation (admin only)
  const reopenIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await apiRequest(`/api/client-issues/${issueId}?status=open`, {
        method: "PATCH",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-issues?project_id=${projectId}`] });
      toast({
        title: t('issues.reopened'),
        description: t('issues.reopenedDesc'),
      });
    },
    onError: () => {
      toast({
        title: tc('toast.error'),
        description: t('issues.reopenError'),
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("/api/objects/upload", {
      method: "POST",
    });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
      previewURL: data.previewURL,
      objectPath: data.objectPath,
    };
  };

  const handleUploadComplete = (results: Array<{ previewURL: string; objectPath: string }>) => {
    const newPreviewUrls = results.map(r => r.previewURL);
    const newObjectPaths = results.map(r => r.objectPath);

    const totalPhotos = [...uploadedPhotos, ...newPreviewUrls];
    const totalPaths = [...uploadedPaths, ...newObjectPaths];

    if (totalPhotos.length > 3) {
      toast({
        title: t('issues.photoLimitExceeded'),
        description: t('issues.photoLimitExceededDesc'),
        variant: "destructive",
      });
      return;
    }

    setUploadedPhotos(totalPhotos); // Preview URLs for display
    setUploadedPaths(totalPaths); // Object paths for storage
    form.setValue("photos", totalPaths); // Store paths, not preview URLs
  };

  const handleEditUploadComplete = (results: Array<{ previewURL: string; objectPath: string }>) => {
    const newPreviewUrls = results.map(r => r.previewURL);
    const newObjectPaths = results.map(r => r.objectPath);

    const totalPhotos = [...editUploadedPhotos, ...newPreviewUrls];
    const totalPaths = [...editUploadedPaths, ...newObjectPaths];

    if (totalPhotos.length > 3) {
      toast({
        title: t('issues.photoLimitExceeded'),
        description: t('issues.photoLimitExceededNewDesc'),
        variant: "destructive",
      });
      return;
    }

    setEditUploadedPhotos(totalPhotos); // Preview URLs for display
    setEditUploadedPaths(totalPaths); // Object paths for storage
    editForm.setValue("photos", totalPaths); // Store paths, not preview URLs
  };

  const removePhoto = (index: number) => {
    const newPhotos = uploadedPhotos.filter((_, i) => i !== index);
    const newPaths = uploadedPaths.filter((_, i) => i !== index);
    setUploadedPhotos(newPhotos);
    setUploadedPaths(newPaths);
    form.setValue("photos", newPaths);
  };

  const removeEditPhoto = (index: number) => {
    const newPhotos = editUploadedPhotos.filter((_, i) => i !== index);
    const newPaths = editUploadedPaths.filter((_, i) => i !== index);
    setEditUploadedPhotos(newPhotos);
    setEditUploadedPaths(newPaths);
    editForm.setValue("photos", newPaths);
  };

  const onSubmit = (data: IssueFormData) => {
    createIssueMutation.mutate({
      ...data,
      photos: uploadedPaths, // Send object paths, not preview URLs
    });
  };

  const onEditSubmit = (data: IssueFormData) => {
    if (!editingIssue) return;
    editIssueMutation.mutate({
      issueId: editingIssue.id,
      data: {
        ...data,
        photos: editUploadedPaths, // Send object paths, not preview URLs
      },
    });
  };

  const handleEditClick = (issue: Issue) => {
    setEditingIssue(issue);
    setIsEditOpen(true);
  };

  const getStatusIcon = (status: string) => {
    return status === "open" ? AlertTriangle : CheckCircle;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('issues.header')}</h2>
          <p className="text-muted-foreground">
            {t('issues.headerDesc')}
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-issue">
              <Plus className="h-4 w-4 mr-2" />
              {t('issues.reportIssue')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('issues.reportNewIssue')}</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('issues.issueTitle')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('issues.issueTitlePlaceholder')}
                          {...field}
                          data-testid="input-issue-title"
                        />
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
                        <Textarea
                          placeholder="Detailed description of the issue..."
                          className="min-h-32"
                          {...field}
                          data-testid="input-issue-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Photo Upload Section */}
                <div className="space-y-4">
                  <FormLabel>Photos (optional, max 3)</FormLabel>

                  {uploadedPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedPhotos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={photo}
                            alt={`Uploaded photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadedPhotos.length < 3 && (
                    <ObjectUploader
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleUploadComplete}
                      maxNumberOfFiles={3 - uploadedPhotos.length}
                      buttonClassName="w-full bg-[#4ADE80] text-[#0F1115] hover:bg-[#22C55E] shadow-lg"
                    >
                      <div className="flex items-center gap-2 text-[#0F1115]">
                        <Camera className="h-4 w-4" />
                        <span>Upload Photos ({uploadedPhotos.length}/3)</span>
                      </div>
                    </ObjectUploader>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createIssueMutation.isPending}
                    data-testid="button-submit-issue"
                  >
                    {createIssueMutation.isPending ? "Creating..." : "Submit Issue"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Issue Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) setEditingIssue(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Issue</DialogTitle>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description of the issue"
                        {...field}
                      />
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
                      <Textarea
                        placeholder="Detailed description of the issue..."
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Add New Photos Section */}
              <div className="space-y-4">
                <FormLabel>Add New Photos (optional, max 3)</FormLabel>

                {editUploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {editUploadedPhotos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo}
                          alt={`New photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeEditPhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {editUploadedPhotos.length < 3 && (
                  <ObjectUploader
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleEditUploadComplete}
                    maxNumberOfFiles={3 - editUploadedPhotos.length}
                    buttonClassName="w-full bg-[#4ADE80] text-[#0F1115] hover:bg-[#22C55E] shadow-lg"
                  >
                    <div className="flex items-center gap-2 text-[#0F1115]">
                      <Camera className="h-4 w-4" />
                      <span>Upload Photos ({editUploadedPhotos.length}/3)</span>
                    </div>
                  </ObjectUploader>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingIssue(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editIssueMutation.isPending}
                >
                  {editIssueMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteIssueId} onOpenChange={(open) => !open && setDeleteIssueId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Issue</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this issue? This action cannot be undone.
              All comments and photos attached to this issue will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteIssueId && deleteIssueMutation.mutate(deleteIssueId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteIssueMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resolve Confirmation Dialog */}
      <AlertDialog open={!!resolvingIssueId} onOpenChange={(open) => !open && setResolvingIssueId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Issue as Resolved</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this issue as resolved? This will close the issue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resolvingIssueId && closeIssueMutation.mutate(resolvingIssueId)}
              className="bg-green-600 hover:bg-green-700"
            >
              {closeIssueMutation.isPending ? "Closing..." : "Mark Resolved"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Issues List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading issues...</div>
        </div>
      ) : issues.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Issues Reported</h3>
            <p className="text-muted-foreground mb-4">
              Get started by reporting your first issue for this project.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Report Issue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {issues.map((issue) => {
            const StatusIcon = getStatusIcon(issue.status);
            return (
              <Card key={issue.id} data-testid={`card-issue-${issue.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{issue.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created {(() => {
                          const dateStr = issue.created_at || issue.createdAt;
                          if (!dateStr) return "Unknown date";
                          const date = new Date(dateStr);
                          return isNaN(date.getTime()) ? "Unknown date" : date.toLocaleDateString();
                        })()} by {issue.created_by_name || "Unknown"}
                      </p>
                      {issue.status === "closed" && issue.resolved_by_name && (
                        <p className="text-sm text-green-600 mt-1">
                          Resolved by {issue.resolved_by_name}
                          {issue.resolved_at && ` on ${new Date(issue.resolved_at).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getIssueStatusColor(issue.status)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {issue.status}
                      </Badge>
                      {issue.status === "open" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(issue)}
                            data-testid={`button-edit-${issue.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteIssueId(issue.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-delete-${issue.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setResolvingIssueId(issue.id)}
                            disabled={closeIssueMutation.isPending}
                            data-testid={`button-close-${issue.id}`}
                          >
                            Mark Resolved
                          </Button>
                        </>
                      )}
                      {issue.status === "closed" && canReopenIssues && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reopenIssueMutation.mutate(issue.id)}
                          disabled={reopenIssueMutation.isPending}
                          data-testid={`button-reopen-${issue.id}`}
                        >
                          {reopenIssueMutation.isPending ? "Reopening..." : "Reopen Issue"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {issue.description}
                  </p>

                  {/* Photo Gallery - Fetch fresh signed URLs */}
                  <IssuePhotos
                    issueId={issue.id}
                    photoCount={issue.attachment_count || issue.photos?.length || 0}
                    canDelete={canDeletePhotos}
                  />

                  {/* Activity History - Admin/PM only */}
                  {canViewHistory && <IssueHistory issueId={issue.id} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
