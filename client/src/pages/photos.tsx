import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Camera, Trash2, Download, Search, Filter, Tag, FileText, FolderOpen, Grid3X3, List } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPhotoSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ObjectUploader, type ObjectUploaderRef } from "@/components/ObjectUploader";
import type { Photo, Project, ProjectLog } from "@shared/schema";

interface PhotoUploadData {
  projectId: string;
  description: string;
  tags: string[];
}

export default function Photos() {
  const { t } = useTranslation('work');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "project" | "tag" | "log">("all");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedLogDate, setSelectedLogDate] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const uploaderRef = useRef<ObjectUploaderRef>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: photos = [], isLoading: photosLoading } = useQuery<Photo[]>({
    queryKey: ["/api/photos"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: logs = [] } = useQuery<ProjectLog[]>({
    queryKey: ["/api/logs"],
  });

  // Extract all unique tags from photos
  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();

    photos.forEach(photo => {
      if (photo.tags) {
        photo.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [photos]);

  // Get logs that have images
  const logsWithImages = useMemo(() => {
    return logs.filter(log => log.images && log.images.length > 0);
  }, [logs]);

  // Extract all image IDs from all logs (used to scope log tab to log-only photos)
  const allLogImageIds = useMemo(() => {
    return logsWithImages.flatMap(log =>
      (log.images || []).map(url => {
        if (url.includes('/objects/')) {
          return url.split('/objects/')[1]?.split('?')[0] || '';
        }
        return url.split('/').pop()?.split('?')[0] || '';
      })
    ).filter(Boolean);
  }, [logsWithImages]);


  // Filter photos based on current selection
  const filteredPhotosData = useMemo(() => {
    let filtered = photos;


    // Filter by search term first
    if (searchTerm && searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(photo => {
        const matchesDescription = photo.description?.toLowerCase().includes(searchLower);
        const matchesName = photo.originalName?.toLowerCase().includes(searchLower);
        const matchesTags = photo.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        return matchesDescription || matchesName || matchesTags;
      });

    }

    // Filter by type
    switch (filterType) {
      case "project":
        if (selectedProject !== "all") {
          filtered = filtered.filter(photo => photo.projectId === selectedProject);
        }
        break;
      case "tag":
        if (selectedTag !== "all") {
          filtered = filtered.filter(photo => {
            return photo.tags && Array.isArray(photo.tags) && photo.tags.includes(selectedTag);
          });
        }
        break;
      case "log": {
        // Always scope to log-only photos when on the Log tab
        filtered = filtered.filter(photo =>
          allLogImageIds.some(id =>
            photo.filename.includes(id) ||
            photo.id === id ||
            photo.filename.split('.')[0] === id
          )
        );

        // Apply date range or specific date filter
        if (selectedLogDate !== "all") {
          const now = new Date();
          const todayStr = now.toISOString().split("T")[0];
          let cutoffDate: string | null = null;

          if (selectedLogDate === "today") {
            cutoffDate = todayStr;
          } else if (selectedLogDate === "week") {
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            cutoffDate = weekAgo.toISOString().split("T")[0];
          } else if (selectedLogDate === "30days") {
            const monthAgo = new Date(now);
            monthAgo.setDate(monthAgo.getDate() - 30);
            cutoffDate = monthAgo.toISOString().split("T")[0];
          } else if (selectedLogDate === "90days") {
            const qtrAgo = new Date(now);
            qtrAgo.setDate(qtrAgo.getDate() - 90);
            cutoffDate = qtrAgo.toISOString().split("T")[0];
          }

          // Determine which logs match the date range
          const matchingLogs = logsWithImages.filter(log => {
            const logDate = new Date(log.createdAt).toISOString().split("T")[0];
            if (selectedLogDate === "today") return logDate === todayStr;
            return cutoffDate ? logDate >= cutoffDate : false;
          });

          const dateImageIds = matchingLogs.flatMap(log =>
            (log.images || []).map(url => {
              if (url.includes('/objects/')) {
                return url.split('/objects/')[1]?.split('?')[0] || '';
              }
              return url.split('/').pop()?.split('?')[0] || '';
            })
          ).filter(Boolean);

          filtered = filtered.filter(photo =>
            dateImageIds.some(id =>
              photo.filename.includes(id) ||
              photo.id === id ||
              photo.filename.split('.')[0] === id
            )
          );
        }
        break;
      }
    }

    return filtered;
  }, [photos, searchTerm, filterType, selectedProject, selectedTag, selectedLogDate, logsWithImages, allLogImageIds]);

  // Handle upload parameters
  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/v1/objects/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const uploadPhotoMutation = useMutation({
    mutationFn: async (data: { uploadedUrls: string[]; formData: PhotoUploadData }) => {
      // Create photo entries in database using uploaded URLs
      const photoPromises = data.uploadedUrls.map(url => {
        // Extract UUID from signed URL - strip query parameters
        // URL looks like: https://storage.googleapis.com/bucket/.private/uploads/UUID?X-Goog-Algorithm=...
        const lastSegment = url.split('/').pop() || '';
        const uuid = lastSegment.split('?')[0]; // Remove query parameters to get clean UUID
        
        const photoData = {
          projectId: data.formData.projectId,
          userId: (user as any)?.id || "unknown",
          filename: uuid,
          originalName: uuid,
          description: data.formData.description,
          tags: data.formData.tags,
        };
        return apiRequest("/api/photos", { method: "POST", body: photoData });
      });
      
      return Promise.all(photoPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsUploadDialogOpen(false);
      form.reset();
      toast({
        title: t('photos.success'),
        description: t('photos.successUpload'),
      });
    },
    onError: () => {
      toast({
        title: t('photos.error'),
        description: t('photos.errorSave'),
        variant: "destructive",
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/photos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      toast({
        title: t('photos.success'),
        description: t('photos.successDelete'),
      });
    },
    onError: () => {
      toast({
        title: t('photos.error'),
        description: t('photos.errorDelete'),
        variant: "destructive",
      });
    },
  });

  const form = useForm<PhotoUploadData>({
    resolver: zodResolver(insertPhotoSchema.pick({ projectId: true, description: true, tags: true })),
    defaultValues: {
      projectId: "",
      description: "",
      tags: [],
    },
  });

  const onSubmit = async (data: PhotoUploadData) => {
    if (!data.projectId) {
      toast({
        title: t('photos.error'),
        description: t('photos.errorSelectProject'),
        variant: "destructive",
      });
      return;
    }

    try {
      // Upload files using deferred uploader
      const uploadedUrls = await uploaderRef.current?.uploadSelectedFiles() || [];
      
      if (uploadedUrls.length === 0) {
        toast({
          title: t('photos.error'),
          description: t('photos.errorSelectPhotos'),
          variant: "destructive",
        });
        return;
      }

      // Save photos to database
      uploadPhotoMutation.mutate({ uploadedUrls, formData: data });
    } catch (error) {
      console.error('Photo upload error:', error);
      toast({
        title: t('photos.error'),
        description: t('photos.errorUpload'),
        variant: "destructive",
      });
    }
  };

  const resetFilters = () => {
    setFilterType("all");
    setSelectedProject("all");
    setSelectedTag("all");
    setSelectedLogDate("all");
    setSearchTerm("");
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  const getLogTitle = (logId: string) => {
    const log = logs.find(l => l.id === logId);
    return log?.title || "Unknown Log";
  };

  if (photosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--pro-bg)]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[var(--pro-mint)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--pro-text-primary)]">{t('photos.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[var(--pro-bg)] min-h-screen p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--pro-text-primary)]">{t('photos.title')}</h1>
          <p className="text-[var(--pro-text-secondary)]">
            {t('photos.photoCount', { filtered: filteredPhotosData.length, total: photos.length })}
            {filterType !== "all" && ` ${t('photos.filteredBy', { type: filterType })}`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            data-testid="button-toggle-view"
            className="flex items-center gap-2"
          >
            {viewMode === "grid" ? <List size={16} /> : <Grid3X3 size={16} />}
            <span className="hidden sm:inline">{viewMode === "grid" ? t('photos.list') : t('photos.grid')}</span>
            <span className="sm:hidden">{viewMode === "grid" ? t('photos.list') : t('photos.grid')}</span>
          </Button>
          
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[var(--pro-mint)] hover:bg-[var(--pro-mint)]/90 text-[var(--pro-bg-deep)]" data-testid="button-upload-photos">
                <Camera size={16} className="mr-2" />
                {t('photos.upload')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>{t('photos.upload')}</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('photos.project')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('photos.selectProject')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('photos.description')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('photos.descPlaceholder')} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('photos.tags')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('photos.tagsPlaceholder')}
                            value={field.value?.join(", ") || ""}
                            onChange={(e) => {
                              const tags = e.target.value.split(",").map(tag => tag.trim()).filter(Boolean);
                              field.onChange(tags);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-3">
                    <FormLabel>{t('photos.selectPhotos')}</FormLabel>
                    <ObjectUploader
                      ref={uploaderRef}
                      deferUpload={true}
                      maxNumberOfFiles={10}
                      maxFileSize={10485760} // 10MB
                      onGetUploadParameters={handleGetUploadParameters}
                      buttonClassName="w-full bg-[#1F242C] hover:bg-[#2D333B] text-[#9CA3AF] border-2 border-dashed border-[#2D333B] hover:border-[#4ADE80]/40 py-8 transition-colors duration-200"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Upload size={24} className="text-[#4ADE80]" />
                        <span className="font-medium text-[#C9D1D9]">{t('photos.selectPhotos')}</span>
                        <span className="text-xs text-[#6B7280]">{t('photos.selectPhotosHint')}</span>
                      </div>
                    </ObjectUploader>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsUploadDialogOpen(false)}
                      className="flex-1"
                    >
                      {t('photos.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-teal-600 hover:bg-teal-700"
                      disabled={uploadPhotoMutation.isPending}
                      data-testid="button-submit-upload"
                    >
                      {uploadPhotoMutation.isPending ? t('photos.uploading') : t('photos.upload')}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('photos.filters')}</CardTitle>
            {(filterType !== "all" || searchTerm) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetFilters}
                data-testid="button-reset-filters"
              >
                {t('photos.clearAll')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t('photos.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-photos"
            />
          </div>

          {/* Filter Tabs */}
          <Tabs value={filterType} onValueChange={(value) => setFilterType(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <FolderOpen size={14} />
                {t('photos.all')}
              </TabsTrigger>
              <TabsTrigger value="project" className="flex items-center gap-2">
                <FolderOpen size={14} />
                {t('form.project')}
              </TabsTrigger>
              <TabsTrigger value="tag" className="flex items-center gap-2">
                <Tag size={14} />
                {t('photos.tag')}
              </TabsTrigger>
              <TabsTrigger value="log" className="flex items-center gap-2">
                <FileText size={14} />
                {t('photos.log')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="project" className="mt-4">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder={t('photos.selectAProject')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('photos.allProjects')}</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>
            
            <TabsContent value="tag" className="mt-4">
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue placeholder={t('photos.selectATag')} />
                </SelectTrigger>
                <SelectContent>

                  <SelectItem value="all">{t('photos.allTagsCount', { count: photos.length })}</SelectItem>
                  {uniqueTags.map((tag) => {
                    const photoCount = photos.filter(photo => photo.tags?.includes(tag)).length;
                    return (
                      <SelectItem key={tag} value={tag}>
                        {photoCount !== 1 ? t('photos.photosWithCount', { tag, count: photoCount }) : t('photos.photoWithCount', { tag, count: photoCount })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {uniqueTags.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  {t('photos.noTagsFound')}
                </div>
              )}
              
              {uniqueTags.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 mb-2">{t('photos.popularTags')}</p>
                  <div className="flex flex-wrap gap-1">
                    {uniqueTags.slice(0, 6).map((tag) => (
                      <Badge 
                        key={tag} 
                        variant={selectedTag === tag ? "default" : "secondary"}
                        className="cursor-pointer text-xs hover:bg-gray-200"
                        onClick={() => setSelectedTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

            </TabsContent>
            
            <TabsContent value="log" className="mt-4 space-y-3">
              <Select value={selectedLogDate} onValueChange={setSelectedLogDate}>
                <SelectTrigger>
                  <SelectValue placeholder={t('photos.selectDateRange')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('photos.allLogPhotos')}</SelectItem>
                  <SelectItem value="today">{t('photos.today')}</SelectItem>
                  <SelectItem value="week">{t('photos.thisWeek')}</SelectItem>
                  <SelectItem value="30days">{t('photos.last30Days')}</SelectItem>
                  <SelectItem value="90days">{t('photos.last90Days')}</SelectItem>
                </SelectContent>
              </Select>
              {logsWithImages.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  {t('photos.noLogsWithPhotos')}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


      {/* Photo Gallery */}
      {filteredPhotosData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Camera size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('photos.noPhotos')}</h3>
            <p className="text-gray-500 mb-4">
              {photos.length === 0
                ? t('photos.uploadFirst')
                : t('photos.adjustFilters')
              }
            </p>
            {photos.length === 0 && (
              <Button onClick={() => setIsUploadDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                <Camera size={16} className="mr-2" />
                {t('photos.upload')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === "grid" 
          ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" 
          : "space-y-4"
        }>
          {filteredPhotosData.map((photo) => (
            <Card key={photo.id} className={viewMode === "list" ? "flex" : ""}>
              <div className={viewMode === "list" ? "w-32 h-32 flex-shrink-0" : "aspect-square"}>
                <img
                  src={`/api/photos/${photo.id}/file`}
                  alt={photo.description || photo.originalName}
                  className="w-full h-full object-cover rounded-t-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(`/api/photos/${photo.id}/file`, '_blank')}
                  onError={(e) => {
                    e.currentTarget.src = `data:image/svg+xml;base64,${btoa(`
                      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                        <rect width="200" height="200" fill="#f3f4f6"/>
                        <text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af">Photo</text>
                      </svg>
                    `)}`;
                  }}
                  data-testid={`image-photo-${photo.id}`}
                />
              </div>
              
              <CardContent className={viewMode === "list" ? "flex-1 p-4" : "p-3"}>
                <div className="space-y-2">

                  <h3 className="font-medium text-sm truncate" title={photo.description || t('photos.projectPhoto')}>
                    {photo.description || t('photos.projectPhoto')}
                  </h3>
                  

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{getProjectName(photo.projectId)}</span>
                    <span>{new Date(photo.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {photo.tags && photo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {photo.tags.slice(0, 3).map((tag, index) => (

                        <Badge 
                          key={index} 
                          variant={selectedTag === tag ? "default" : "secondary"} 
                          className="text-xs cursor-pointer hover:bg-gray-200"
                          onClick={() => {
                            setFilterType("tag");
                            setSelectedTag(tag);
                          }}
                          title={t('photos.filterByTag', { tag })}
                        >

                          {tag}
                        </Badge>
                      ))}
                      {photo.tags.length > 3 && (

                        <Badge 
                          variant="secondary" 
                          className="text-xs cursor-pointer hover:bg-gray-200"
                          onClick={() => {
                            toast({
                              title: t('photos.allTagsLabel'),
                              description: photo.tags?.join(', '),
                            });
                          }}
                          title={photo.tags.join(', ')}
                        >

                          +{photo.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/api/photos/${photo.id}/file`, '_blank')}
                      data-testid={`button-view-photo-${photo.id}`}
                    >
                      <Download size={12} className="mr-1" />
                      {t('photos.view')}
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-delete-photo-${photo.id}`}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('photos.deletePhoto')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('photos.deleteConfirm')}
                            {photo.description && (
                              <span className="block mt-2 text-sm font-medium">
                                "{photo.description}"
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('photos.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePhotoMutation.mutate(photo.id)}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                          >
                            {t('photos.deletePhoto')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}