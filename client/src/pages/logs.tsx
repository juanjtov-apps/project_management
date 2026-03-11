import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Plus, FileText, AlertTriangle, CheckCircle, Clock, User, Camera, X, Calendar, Filter, Tag, ChevronDown, Trash2 } from "lucide-react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectLogSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';
import { ObjectUploader, type ObjectUploaderRef } from "@/components/ObjectUploader";
import { getStatusColor } from "@/lib/statusColors";
import type { ProjectLog, InsertProjectLog, Project } from "@shared/schema";

const getTypeColor = (type: string) => {
  switch (type) {
    case "issue":
      return "bg-[var(--pro-red)]/20 text-[var(--pro-red)]";
    case "milestone":
      return "bg-[var(--pro-mint)]/20 text-[var(--pro-mint)]";
    case "safety":
      return "bg-[var(--pro-orange)]/20 text-[var(--pro-orange)]";
    case "general":
      return "bg-blue-500/20 text-blue-400";
    default:
      return "bg-[var(--pro-surface-highlight)] text-[var(--pro-text-secondary)]";
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "issue":
      return <AlertTriangle size={16} className="text-[var(--pro-red)]" />;
    case "milestone":
      return <CheckCircle size={16} className="text-[var(--pro-mint)]" />;
    case "safety":
      return <AlertTriangle size={16} className="text-[var(--pro-orange)]" />;
    case "general":
      return <FileText size={16} className="text-blue-400" />;
    default:
      return <FileText size={16} className="text-[var(--pro-text-secondary)]" />;
  }
};

export default function Logs() {
  const { t } = useTranslation('work');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ProjectLog | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [photoTags, setPhotoTags] = useState<string>("");

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const createUploaderRef = useRef<ObjectUploaderRef>(null);
  const editUploaderRef = useRef<ObjectUploaderRef>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: logs = [], isLoading: logsLoading } = useQuery<ProjectLog[]>({
    queryKey: ["/api/logs"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch photos to get existing tags
  const { data: photos = [] } = useQuery<any[]>({
    queryKey: ["/api/photos"],
  });

  // 8D: Memoize existing tags extraction to avoid reducing on every render
  const existingTags = useMemo(
    () => photos.reduce((tags: string[], photo) => {
      if (photo.tags && Array.isArray(photo.tags)) {
        photo.tags.forEach((tag: string) => {
          if (tag && !tags.includes(tag)) {
            tags.push(tag);
          }
        });
      }
      return tags;
    }, []).sort(),
    [photos]
  );
  


  const createLogMutation = useMutation({
    mutationFn: async (data: InsertProjectLog & { images?: string[] }) => {
      const response = await apiRequest("/api/logs", { method: "POST", body: data });
      
      // Parse JSON response - critical for mutation to resolve properly
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      setIsCreateDialogOpen(false);
      setUploadedImages([]);
      setPhotoTags("");
      setSelectedTags([]);
      setTagInput("");
      setShowTagDropdown(false);

      form.reset();
      toast({
        title: t('toast.success'),
        description: t('toast.logCreated'),
      });
    },
    onError: () => {
      toast({
        title: t('toast.error'),
        description: t('toast.logCreateFailed'),
        variant: "destructive",
      });
    },
  });

  const updateLogMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertProjectLog> }) => {
      const response = await apiRequest(`/api/logs/${id}`, { method: "PATCH", body: updates });
      
      // Parse JSON response - critical for mutation to resolve properly
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      setIsEditDialogOpen(false);
      setEditingLog(null);
      setUploadedImages([]);
      setPhotoTags("");
      setSelectedTags([]);
      setTagInput("");
      setShowTagDropdown(false);
      editForm.reset();
      toast({
        title: t('toast.success'),
        description: t('toast.logUpdated'),
      });
    },
    onError: () => {
      toast({
        title: t('toast.error'),
        description: t('toast.logUpdateFailed'),
        variant: "destructive",
      });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/logs/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] }); // Refresh photos too since log photos are deleted
      toast({
        title: t('toast.success'),
        description: t('toast.logDeleted'),

      });
    },
    onError: () => {
      toast({
        title: t('toast.error'),

        description: t('toast.logDeleteFailed'),

        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertProjectLog>({
    resolver: zodResolver(insertProjectLogSchema),
    defaultValues: {
      projectId: "",
      userId: (user as any)?.id || "unknown",
      title: "",
      content: "",
      type: "general",
      status: "open",
    },
  });

  const editForm = useForm<InsertProjectLog>({
    resolver: zodResolver(insertProjectLogSchema),
    defaultValues: {
      projectId: "",
      userId: (user as any)?.id || "unknown",
      title: "",
      content: "",
      type: "general",
      status: "open",
    },
  });

  const onSubmit = async (data: InsertProjectLog) => {
    try {
      // Upload selected files first
      const uploadedUrls = await createUploaderRef.current?.uploadSelectedFiles() || [];

      const submissionData = {
        ...data,
        images: [...uploadedImages, ...uploadedUrls] // Combine existing + new
      };

      createLogMutation.mutate(submissionData);
    } catch (error) {
      console.error('Photo upload failed:', error);
      toast({
        title: t('toast.uploadError'),
        description: t('toast.uploadFailed'),
        variant: "destructive",
      });
    }
  };

  const onEditSubmit = async (data: InsertProjectLog) => {
    if (!editingLog) return;

    try {
      // Upload new selected files first
      const newUploadedUrls = await editUploaderRef.current?.uploadSelectedFiles() || [];

      // Merge existing images with newly uploaded images
      const existingImages = editingLog.images || [];
      const allImages = [...existingImages, ...uploadedImages, ...newUploadedUrls];

      const updateData = {
        ...data,
        images: allImages
      };

      updateLogMutation.mutate({
        id: editingLog.id,
        updates: updateData
      });
    } catch (error) {
      console.error('Photo upload failed during edit:', error);
      toast({
        title: t('toast.uploadError'),
        description: t('toast.uploadFailed'),
        variant: "destructive",
      });
    }
  };

  const startEditingLog = (log: ProjectLog) => {
    setEditingLog(log);
    editForm.reset({
      projectId: log.projectId,
      userId: log.userId,
      title: log.title,
      content: log.content,
      type: log.type as any,
      status: log.status as any,
    });
    // Reset new uploads state (existing images shown separately)
    setUploadedImages([]);
    setPhotoTags("");

    setSelectedTags([]);
    setTagInput("");
    setShowTagDropdown(false);

    setIsEditDialogOpen(true);
  };

  const handleGetUploadParameters = async (file?: any) => {
    try {
      const response = await fetch("/api/v1/objects/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.uploadURL) {
        throw new Error('No upload URL received from server');
      }

      const uploadParams = {
        method: "PUT" as const,
        url: data.uploadURL,
        headers: {}
      };

      return uploadParams;
    } catch (error) {
      console.error('Failed to get upload parameters:', error);
      toast({
        title: t('toast.uploadError'),
        description: t('toast.uploadUrlFailed', { error: error instanceof Error ? error.message : 'Unknown error' }),
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUploadComplete = async (result: any) => {
    if (result?.successful && result.successful.length > 0) {
      try {
        // Extract URLs from successful uploads - convert to object storage image URLs
        const uploadedUrls = result.successful.map((file: any) => {
          // The uploadURL field contains the presigned URL that was used for upload
          const uploadUrl = file.uploadURL;

          // The URL format is: https://storage.googleapis.com/bucket/.private/uploads/object-id
          // Extract object ID from the URL path
          const urlMatch = uploadUrl.match(/\/uploads\/([^?]+)/);
          const objectId = urlMatch ? urlMatch[1] : null;

          if (!objectId) {
            console.error('Could not extract object ID from URL:', uploadUrl);
            return uploadUrl; // fallback to original URL
          }

          return `/api/objects/image/${objectId}`;
        });

        // Get current project ID from the appropriate form (create or edit)
        const currentProjectId = isEditDialogOpen ? editForm.watch('projectId') : form.watch('projectId');

        // Use selected tags from the new tag system
        const tags = [...selectedTags];

        if (!tags.includes('log-photo')) {
          tags.push('log-photo');
        }

        // Only save photo metadata if we have a project selected
        if (currentProjectId) {
          const photoPromises = uploadedUrls.map(async (imageUrl: string) => {
            const photoData = {
              projectId: currentProjectId,
              filename: imageUrl,
              originalName: `upload-${Date.now()}.jpg`,
              description: `Photo uploaded for log`,
              tags: tags
            };

            const result = await apiRequest("/api/photos", { method: "POST", body: photoData });
            return result;
          });
          
          await Promise.all(photoPromises);
          
          // Invalidate photos cache to refresh the gallery
          queryClient.invalidateQueries({ queryKey: ["/api/photos"] });

        }
        
        // Store the image URLs for the log
        setUploadedImages(prev => [...prev, ...uploadedUrls]);
        
        toast({
          title: t('toast.success'),
          description: currentProjectId
            ? t('toast.imageUploadSuccess', { count: uploadedUrls.length })
            : t('toast.imageUploadNoProject', { count: uploadedUrls.length }),
        });
      } catch (error) {
        console.error('Error processing uploaded images:', error);
        toast({
          title: t('toast.error'),
          description: t('toast.imageProcessFailed'),
          variant: "destructive",
        });
      }
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || t('logs.unknownProject');
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === "" || 
                         log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || log.type === typeFilter;
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesProject = projectFilter === "all" || log.projectId === projectFilter;
    
    // Date filtering logic
    let matchesDate = true;
    if (dateFilter !== "all") {
      const logDate = new Date(log.createdAt);
      const today = new Date();
      
      switch (dateFilter) {
        case "today":
          matchesDate = logDate.toDateString() === today.toDateString();
          break;
        case "week":
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          matchesDate = logDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          matchesDate = logDate >= monthAgo;
          break;
        case "custom":
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Include the entire end date
            matchesDate = logDate >= start && logDate <= end;
          }
          break;
      }
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesProject && matchesDate;
  });

  if (logsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t('logs.title')}</h1>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
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
        <h1 className="text-2xl font-bold construction-secondary">{t('logs.title')}</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="construction-primary text-white">
              <Plus size={16} className="mr-2" />
              {t('logs.createLog')}
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>

            <DialogHeader>
              <DialogTitle>{t('logs.createProjectLog')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('logs.formProject')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('form.selectProject')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map(project => (
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
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('logs.formTitle')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('logs.formTitlePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('logs.formContent')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('logs.formContentPlaceholder')}
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('logs.formType')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('logs.selectType')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general">{t('logs.typeGeneral')}</SelectItem>
                            <SelectItem value="issue">{t('logs.typeIssue')}</SelectItem>
                            <SelectItem value="milestone">{t('logs.typeMilestone')}</SelectItem>
                            <SelectItem value="safety">{t('logs.typeSafety')}</SelectItem>
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
                        <FormLabel>{t('logs.formStatus')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('logs.selectStatus')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="open">{t('logs.statusOpen')}</SelectItem>
                            <SelectItem value="in-progress">{t('logs.statusInProgress')}</SelectItem>
                            <SelectItem value="resolved">{t('logs.statusResolved')}</SelectItem>
                            <SelectItem value="closed">{t('logs.statusClosed')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Improved Image Upload Section */}
                <div className="space-y-4">
                  <FormLabel>{t('logs.photosOptional')}</FormLabel>


                  {/* Enhanced Photo Tags Input with Dropdown */}
                  <div className="space-y-2">
                    <FormLabel className="text-sm text-gray-700 flex items-center gap-1">
                      <Tag size={14} />
                      {t('logs.photoTags')}
                    </FormLabel>
                    
                    {/* Selected Tags Display */}
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map((tag, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="bg-teal-100 text-teal-800 hover:bg-teal-200 px-2 py-1 text-xs flex items-center gap-1"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = selectedTags.filter((_, i) => i !== index);
                                setSelectedTags(newTags);
                                setPhotoTags(newTags.join(', '));
                              }}
                              className="hover:bg-teal-300 rounded-full p-0.5"
                            >
                              <X size={10} />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Tag Input with Dropdown */}
                    <div className="relative">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder={t('logs.tagSearchPlaceholder')}
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onFocus={() => setShowTagDropdown(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
                                const newTags = [...selectedTags, tagInput.trim()];
                                setSelectedTags(newTags);
                                setPhotoTags(newTags.join(', '));
                                setTagInput('');
                              }
                            }
                          }}
                          className="text-sm flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
                              const newTags = [...selectedTags, tagInput.trim()];
                              setSelectedTags(newTags);
                              setPhotoTags(newTags.join(', '));
                              setTagInput('');
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="px-3"
                        >
                          {t('logs.tagAdd')}
                        </Button>
                      </div>

                      {/* Dropdown with existing tags */}
                      {showTagDropdown && (
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          <div className="p-2 border-b bg-gray-50">
                            <p className="text-xs text-gray-600 font-medium">{t('logs.existingTags')}</p>
                          </div>
                          {existingTags.length > 0 ? (
                            <div className="p-1">
                              {existingTags
                                .filter(tag => 
                                  tag.toLowerCase().includes(tagInput.toLowerCase()) &&
                                  !selectedTags.includes(tag)
                                )
                                .map(tag => (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                      const newTags = [...selectedTags, tag];
                                      setSelectedTags(newTags);
                                      setPhotoTags(newTags.join(', '));
                                      setTagInput('');
                                      setShowTagDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                                  >
                                    <Tag size={12} className="text-gray-400" />
                                    {tag}
                                  </button>
                                ))}
                              {tagInput.trim() && 
                               !existingTags.some(tag => tag.toLowerCase() === tagInput.toLowerCase()) &&
                               !selectedTags.includes(tagInput.trim()) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTags = [...selectedTags, tagInput.trim()];
                                    setSelectedTags(newTags);
                                    setPhotoTags(newTags.join(', '));
                                    setTagInput('');
                                    setShowTagDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 rounded flex items-center gap-2 border-t"
                                >
                                  <Plus size={12} className="text-teal-600" />
                                  <span>{t('logs.createTag', { tag: tagInput.trim() })}</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-sm text-gray-500">
                              {tagInput.trim() ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTags = [...selectedTags, tagInput.trim()];
                                    setSelectedTags(newTags);
                                    setPhotoTags(newTags.join(', '));
                                    setTagInput('');
                                    setShowTagDropdown(false);
                                  }}
                                  className="w-full px-3 py-2 text-sm hover:bg-teal-50 rounded flex items-center justify-center gap-2"
                                >
                                  <Plus size={12} className="text-teal-600" />
                                  <span>{t('logs.createTag', { tag: tagInput.trim() })}</span>
                                </button>
                              ) : (
                                t('logs.noExistingTags')
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      {t('logs.tagOrganizeHint')}
                    </p>
                  </div>

                  {/* Click outside to close dropdown */}
                  {showTagDropdown && (
                    <div 
                      className="fixed inset-0 z-5" 
                      onClick={() => setShowTagDropdown(false)}
                    />
                  )}


                  {/* Streamlined Photo Upload */}
                  <div className="flex items-center gap-4">
                    <ObjectUploader
                      ref={createUploaderRef}
                      deferUpload={true}
                      maxNumberOfFiles={5}
                      maxFileSize={10485760} // 10MB
                      onGetUploadParameters={handleGetUploadParameters}
                      buttonClassName="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md font-medium inline-flex items-center gap-2 shadow-md"
                    >
                      <Camera size={16} />
                      {t('logs.selectPhotos')}
                    </ObjectUploader>
                    <span className="text-sm text-gray-500">{t('logs.photosLimit')}</span>
                  </div>
                  
                  {/* Display uploaded images in a nice grid */}
                  {uploadedImages.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Camera size={16} className="text-gray-500" />
                        <p className="text-sm font-medium text-gray-700">
                          {t('logs.photosReady', { count: uploadedImages.length })}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {uploadedImages.map((imageUrl, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square bg-gray-100 rounded-lg border-2 border-gray-200 overflow-hidden">
                              <img 
                                src={imageUrl.startsWith('https://storage.googleapis.com') 
                                  ? `/api/objects/image/${imageUrl.split('/').pop()}` 
                                  : imageUrl
                                } 
                                alt={`Upload preview ${index + 1}`}
                                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                onError={(e) => {
                                  console.error('Failed to load uploaded image:', imageUrl);
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden w-full h-full bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs">
                                {t('logs.preview', { number: index + 1 })}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-md"
                              title={t('logs.removePhoto')}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    {t('form.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createLogMutation.isPending}
                    className="construction-primary text-white"
                  >
                    {createLogMutation.isPending ? t('logs.creating') : t('logs.createLog')}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Log Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>

          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>

            <DialogHeader>
              <DialogTitle>{t('logs.editProjectLog')}</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('logs.formProject')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('form.selectProject')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map(project => (
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
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('logs.formTitle')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('logs.formTitlePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('logs.formContent')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('logs.formContentPlaceholder')}
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('logs.formType')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('logs.selectType')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general">{t('logs.typeGeneral')}</SelectItem>
                            <SelectItem value="issue">{t('logs.typeIssue')}</SelectItem>
                            <SelectItem value="milestone">{t('logs.typeMilestone')}</SelectItem>
                            <SelectItem value="safety">{t('logs.typeSafety')}</SelectItem>
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
                        <FormLabel>{t('logs.formStatus')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('logs.selectStatus')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="open">{t('logs.statusOpen')}</SelectItem>
                            <SelectItem value="in-progress">{t('logs.statusInProgress')}</SelectItem>
                            <SelectItem value="resolved">{t('logs.statusResolved')}</SelectItem>
                            <SelectItem value="closed">{t('logs.statusClosed')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Photo Upload Section for Edit Dialog */}
                <div className="space-y-4">
                  <FormLabel>{t('logs.photos')}</FormLabel>

                  {/* Display existing images from the log being edited */}
                  {editingLog && editingLog.images && editingLog.images.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Camera size={16} className="text-gray-500" />
                        <p className="text-sm font-medium text-gray-700">
                          {t('logs.existingPhotos', { count: editingLog.images.length })}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {editingLog.images.map((imageUrl, index) => (
                          <div key={index} className="aspect-square bg-gray-100 rounded-lg border-2 border-gray-200 overflow-hidden">
                            <img 
                              src={imageUrl.startsWith('https://storage.googleapis.com') 
                                ? `/api/objects/image/${imageUrl.split('/').pop()}` 
                                : imageUrl
                              } 
                              alt={`Existing photo ${index + 1}`}
                              className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
                              onClick={() => {
                                const displayUrl = imageUrl.startsWith('https://storage.googleapis.com') 
                                  ? `/api/objects/image/${imageUrl.split('/').pop()}` 
                                  : imageUrl;
                                window.open(displayUrl, '_blank');
                              }}
                              onError={(e) => {
                                console.error('Failed to load existing image:', imageUrl);
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden w-full h-full bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs">
                              {t('logs.photo', { number: index + 1 })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <FormLabel className="text-sm">{t('logs.addMorePhotos')}</FormLabel>
                  

                  {/* Enhanced Photo Tags Input with Dropdown */}
                  <div className="space-y-2">
                    <FormLabel className="text-sm text-gray-700 flex items-center gap-1">
                      <Tag size={14} />
                      {t('logs.photoTags')}
                    </FormLabel>
                    
                    {/* Selected Tags Display */}
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map((tag, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="bg-teal-100 text-teal-800 hover:bg-teal-200 px-2 py-1 text-xs flex items-center gap-1"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = selectedTags.filter((_, i) => i !== index);
                                setSelectedTags(newTags);
                                setPhotoTags(newTags.join(', '));
                              }}
                              className="hover:bg-teal-300 rounded-full p-0.5"
                            >
                              <X size={10} />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Tag Input with Dropdown */}
                    <div className="relative">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder={t('logs.tagSearchPlaceholder')}
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onFocus={() => setShowTagDropdown(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
                                const newTags = [...selectedTags, tagInput.trim()];
                                setSelectedTags(newTags);
                                setPhotoTags(newTags.join(', '));
                                setTagInput('');
                              }
                            }
                          }}
                          className="text-sm flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
                              const newTags = [...selectedTags, tagInput.trim()];
                              setSelectedTags(newTags);
                              setPhotoTags(newTags.join(', '));
                              setTagInput('');
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="px-3"
                        >
                          {t('logs.tagAdd')}
                        </Button>
                      </div>

                      {/* Dropdown with existing tags */}
                      {showTagDropdown && (
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          <div className="p-2 border-b bg-gray-50">
                            <p className="text-xs text-gray-600 font-medium">{t('logs.existingTags')}</p>
                          </div>
                          {existingTags.length > 0 ? (
                            <div className="p-1">
                              {existingTags
                                .filter(tag => 
                                  tag.toLowerCase().includes(tagInput.toLowerCase()) &&
                                  !selectedTags.includes(tag)
                                )
                                .map(tag => (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                      const newTags = [...selectedTags, tag];
                                      setSelectedTags(newTags);
                                      setPhotoTags(newTags.join(', '));
                                      setTagInput('');
                                      setShowTagDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                                  >
                                    <Tag size={12} className="text-gray-400" />
                                    {tag}
                                  </button>
                                ))}
                              {tagInput.trim() && 
                               !existingTags.some(tag => tag.toLowerCase() === tagInput.toLowerCase()) &&
                               !selectedTags.includes(tagInput.trim()) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTags = [...selectedTags, tagInput.trim()];
                                    setSelectedTags(newTags);
                                    setPhotoTags(newTags.join(', '));
                                    setTagInput('');
                                    setShowTagDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 rounded flex items-center gap-2 border-t"
                                >
                                  <Plus size={12} className="text-teal-600" />
                                  <span>{t('logs.createTag', { tag: tagInput.trim() })}</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-sm text-gray-500">
                              {tagInput.trim() ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTags = [...selectedTags, tagInput.trim()];
                                    setSelectedTags(newTags);
                                    setPhotoTags(newTags.join(', '));
                                    setTagInput('');
                                    setShowTagDropdown(false);
                                  }}
                                  className="w-full px-3 py-2 text-sm hover:bg-teal-50 rounded flex items-center justify-center gap-2"
                                >
                                  <Plus size={12} className="text-teal-600" />
                                  <span>{t('logs.createTag', { tag: tagInput.trim() })}</span>
                                </button>
                              ) : (
                                t('logs.noExistingTags')
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      {t('logs.tagOrganizeHint')}
                    </p>
                  </div>

                  {/* Click outside to close dropdown */}
                  {showTagDropdown && (
                    <div 
                      className="fixed inset-0 z-5" 
                      onClick={() => setShowTagDropdown(false)}
                    />
                  )}


                  {/* Streamlined Photo Upload */}
                  <div className="flex items-center gap-4">
                    <ObjectUploader
                      ref={editUploaderRef}
                      deferUpload={true}
                      maxNumberOfFiles={5}
                      maxFileSize={10485760} // 10MB
                      onGetUploadParameters={handleGetUploadParameters}
                      buttonClassName="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md font-medium inline-flex items-center gap-2 shadow-md"
                    >
                      <Camera size={16} />
                      {t('logs.selectMorePhotos')}
                    </ObjectUploader>
                    <span className="text-sm text-gray-500">{t('logs.photosLimit')}</span>
                  </div>
                  
                  {/* Display newly uploaded images */}
                  {uploadedImages.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Camera size={16} className="text-gray-500" />
                        <p className="text-sm font-medium text-gray-700">
                          {t('logs.photosReady', { count: uploadedImages.length })}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {uploadedImages.map((imageUrl, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square bg-gray-100 rounded-lg border-2 border-gray-200 overflow-hidden">
                              <img 
                                src={imageUrl.startsWith('https://storage.googleapis.com') 
                                  ? `/api/objects/image/${imageUrl.split('/').pop()}` 
                                  : imageUrl
                                } 
                                alt={`Upload preview ${index + 1}`}
                                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                onError={(e) => {
                                  console.error('Failed to load uploaded image:', imageUrl);
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden w-full h-full bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs">
                                {t('logs.preview', { number: index + 1 })}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-md"
                              title={t('logs.removePhoto')}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    {t('form.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateLogMutation.isPending}
                    className="construction-primary text-white"
                  >
                    {updateLogMutation.isPending ? t('logs.updating') : t('logs.updateLog')}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder={t('logs.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('logs.filterByProject')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('logs.allProjects')}</SelectItem>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('logs.filterByType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('logs.allTypes')}</SelectItem>
            <SelectItem value="general">{t('logs.typeGeneral')}</SelectItem>
            <SelectItem value="issue">{t('logs.typeIssue')}</SelectItem>
            <SelectItem value="milestone">{t('logs.typeMilestone')}</SelectItem>
            <SelectItem value="safety">{t('logs.typeSafety')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('logs.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('logs.allStatus')}</SelectItem>
            <SelectItem value="open">{t('logs.statusOpen')}</SelectItem>
            <SelectItem value="in-progress">{t('logs.statusInProgress')}</SelectItem>
            <SelectItem value="resolved">{t('logs.statusResolved')}</SelectItem>
            <SelectItem value="closed">{t('logs.statusClosed')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('logs.filterByDate')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('logs.allDates')}</SelectItem>
            <SelectItem value="today">{t('logs.today')}</SelectItem>
            <SelectItem value="week">{t('logs.thisWeek')}</SelectItem>
            <SelectItem value="month">{t('logs.thisMonth')}</SelectItem>
            <SelectItem value="custom">{t('logs.customRange')}</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Clear All Filters Button */}
        {(searchTerm || projectFilter !== "all" || typeFilter !== "all" || statusFilter !== "all" || dateFilter !== "all") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setProjectFilter("all");
              setTypeFilter("all");
              setStatusFilter("all");
              setDateFilter("all");
              setStartDate("");
              setEndDate("");
            }}
            className="text-gray-600 hover:text-gray-800"
          >
            <Filter size={16} className="mr-1" />
            {t('logs.clearAllFilters')}
          </Button>
        )}
      </div>
      
      {/* Custom Date Range Inputs */}
      {dateFilter === "custom" && (
        <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg">
          <Calendar className="text-gray-500" size={16} />
          <span className="text-sm font-medium text-gray-700">{t('logs.customDateRange')}</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
            placeholder={t('logs.startDate')}
          />
          <span className="text-gray-400">{t('logs.to')}</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
            placeholder={t('logs.endDate')}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDateFilter("all");
              setStartDate("");
              setEndDate("");
            }}
          >
            {t('logs.clear')}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">{t('logs.noLogs')}</p>
            <p className="text-gray-400">{t('logs.createFirst')}</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getTypeIcon(log.type)}
                    <div>
                      <CardTitle className="text-lg construction-secondary">{log.title}</CardTitle>
                      <p className="text-sm text-blue-600 font-medium">{getProjectName(log.projectId)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getTypeColor(log.type)}>
                      {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                    </Badge>
                    <Badge className={getStatusColor(log.status)}>
                      {log.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 whitespace-pre-wrap">{log.content}</p>
                
                {/* Display images if they exist */}
                {log.images && log.images.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Camera size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-500 font-medium">
                        {t('logs.photosAttached', { count: log.images.length })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {log.images.map((imageUrl, index) => (
                        <div key={index} className="aspect-square bg-gray-100 rounded-lg border-2 border-gray-200 overflow-hidden">
                          <img 
                            src={imageUrl.startsWith('https://storage.googleapis.com') 
                              ? `/api/objects/image/${imageUrl.split('/').pop()}` 
                              : imageUrl
                            } 
                            alt={`Log photo ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              const displayUrl = imageUrl.startsWith('https://storage.googleapis.com') 
                                ? `/api/objects/image/${imageUrl.split('/').pop()}` 
                                : imageUrl;
                              window.open(displayUrl, '_blank');
                            }}
                            onError={(e) => {
                              console.error('Failed to load image:', imageUrl);
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden w-full h-full bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs">
                            Photo {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <User size={14} className="mr-1" />
                    <span>{t('logs.created', { date: new Date(log.createdAt).toLocaleDateString() })}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    {/* Edit button - always available */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditingLog(log)}
                      className="text-construction-teal border-construction-teal hover:bg-construction-teal/10"
                    >
                      {t('logs.edit')}
                    </Button>
                    

                    {/* Delete button with confirmation */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          data-testid={`delete-log-${log.id}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('logs.deleteProjectLog')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('logs.deleteConfirm', { title: log.title })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('form.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteLogMutation.mutate(log.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={deleteLogMutation.isPending}
                          >
                            {deleteLogMutation.isPending ? t('logs.deleting') : t('form.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    

                    {/* Status action buttons */}
                    {log.status !== "closed" && (
                      <>
                        {log.status === "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateLogMutation.mutate({
                              id: log.id,
                              updates: { status: "in-progress" }
                            })}
                          >
                            {t('logs.startProgress')}
                          </Button>
                        )}
                        {log.status === "in-progress" && (
                          <Button
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700"
                            onClick={() => updateLogMutation.mutate({
                              id: log.id,
                              updates: { status: "resolved" }
                            })}
                          >
                            {t('logs.markResolved')}
                          </Button>
                        )}
                        {log.status === "resolved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateLogMutation.mutate({
                              id: log.id,
                              updates: { status: "closed" }
                            })}
                          >
                            {t('logs.close')}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
