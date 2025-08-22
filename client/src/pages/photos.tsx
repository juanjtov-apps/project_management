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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPhotoSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DeferredObjectUploader, type DeferredObjectUploaderRef } from "@/components/DeferredObjectUploader";
import type { Photo, Project, ProjectLog } from "@shared/schema";

interface PhotoUploadData {
  projectId: string;
  description: string;
  tags: string[];
}

export default function Photos() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "project" | "tag" | "log">("all");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedLog, setSelectedLog] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const uploaderRef = useRef<DeferredObjectUploaderRef>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: photos = [], isLoading: photosLoading } = useQuery<Photo[]>({
    queryKey: ["/api/photos"],
    staleTime: 0, // Always refetch to get latest photos and tags
    cacheTime: 0, // Don't cache to ensure fresh data
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

    console.log('📸 Processing photos for tags:', photos.length);
    photos.forEach(photo => {
      if (photo.tags) {
        console.log(`📸 Photo ${photo.id} has tags:`, photo.tags);
        photo.tags.forEach(tag => tagSet.add(tag));
      }
    });
    const allTags = Array.from(tagSet).sort();
    console.log('📸 All unique tags found:', allTags);
    return allTags;

  }, [photos]);

  // Get logs that have images
  const logsWithImages = useMemo(() => {
    return logs.filter(log => log.images && log.images.length > 0);
  }, [logs]);

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
            const hasTags = photo.tags && Array.isArray(photo.tags);
            return hasTags && photo.tags.includes(selectedTag);
          });

        }
        break;
      case "log":
        if (selectedLog !== "all") {
          // Find photos that are referenced in the selected log
          const selectedLogData = logs.find(log => log.id === selectedLog);
          if (selectedLogData && selectedLogData.images) {
            // Extract photo IDs from log image URLs and match with photos
            const logImageIds = selectedLogData.images.map(url => {
              // Extract ID from object storage URL or direct photo reference
              if (url.includes('/objects/')) {
                return url.split('/objects/')[1]?.split('?')[0] || '';
              }
              return url.split('/').pop()?.split('?')[0] || '';
            }).filter(Boolean);
            
            filtered = filtered.filter(photo => 
              logImageIds.some(id => 
                photo.filename.includes(id) || 
                photo.id === id ||
                photo.filename.split('.')[0] === id
              )
            );

          } else {
            filtered = []; // No photos match if log doesn't exist or has no images

          }
        }
        break;
    }

    return filtered;
  }, [photos, searchTerm, filterType, selectedProject, selectedTag, selectedLog, logs]);

  // Handle upload parameters
  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
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
        const photoData = {
          projectId: data.formData.projectId,
          userId: "sample-user-id", // In a real app, this would come from auth
          filename: url.split('/').pop() || '',
          originalName: url.split('/').pop() || '',
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
      uploaderRef.current?.clearFiles();
      form.reset();
      toast({
        title: "Success",
        description: "Photos uploaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save photos",
        variant: "destructive",
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/photos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete photo",
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
        title: "Error",
        description: "Please select a project before uploading photos",
        variant: "destructive",
      });
      return;
    }

    try {
      // Upload files using deferred uploader
      const uploadedUrls = await uploaderRef.current?.uploadFiles() || [];
      
      if (uploadedUrls.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one photo to upload",
          variant: "destructive",
        });
        return;
      }

      // Save photos to database
      uploadPhotoMutation.mutate({ uploadedUrls, formData: data });
    } catch (error) {
      console.error('Photo upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload photos",
        variant: "destructive",
      });
    }
  };

  const resetFilters = () => {
    setFilterType("all");
    setSelectedProject("all");
    setSelectedTag("all");
    setSelectedLog("all");
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-text">Loading photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Photo Gallery</h1>
          <p className="text-brand-muted">
            {filteredPhotosData.length} of {photos.length} photos
            {filterType !== "all" && ` (filtered by ${filterType})`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            data-testid="button-toggle-view"
          >
            {viewMode === "grid" ? <List size={16} /> : <Grid3X3 size={16} />}
            {viewMode === "grid" ? "List" : "Grid"}
          </Button>
          
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700" data-testid="button-upload-photos">
                <Camera size={16} className="mr-2" />
                Upload Photos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Upload Photos</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select project" />
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the photos..." 
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
                        <FormLabel>Tags (comma-separated)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., foundation, concrete, progress"
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
                    <FormLabel>Select Photos</FormLabel>
                    <DeferredObjectUploader
                      ref={uploaderRef}
                      maxNumberOfFiles={10}
                      maxFileSize={10485760} // 10MB
                      onGetUploadParameters={handleGetUploadParameters}
                      buttonClassName="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-dashed border-gray-300 py-8"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Upload size={24} />
                        <span>Select Photos</span>
                        <span className="text-xs">Up to 10 photos, max 10MB each</span>
                      </div>
                    </DeferredObjectUploader>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsUploadDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-teal-600 hover:bg-teal-700"
                      disabled={uploadPhotoMutation.isPending}
                      data-testid="button-submit-upload"
                    >
                      {uploadPhotoMutation.isPending ? "Uploading..." : "Upload Photos"}
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
            <CardTitle className="text-lg">Filters</CardTitle>
            {(filterType !== "all" || searchTerm) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetFilters}
                data-testid="button-reset-filters"
              >
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search photos by description, filename, or tags..."
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
                All
              </TabsTrigger>
              <TabsTrigger value="project" className="flex items-center gap-2">
                <FolderOpen size={14} />
                Project
              </TabsTrigger>
              <TabsTrigger value="tag" className="flex items-center gap-2">
                <Tag size={14} />
                Tag
              </TabsTrigger>
              <TabsTrigger value="log" className="flex items-center gap-2">
                <FileText size={14} />
                Log
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="project" className="mt-4">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
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
                  <SelectValue placeholder="Select a tag" />
                </SelectTrigger>
                <SelectContent>

                  <SelectItem value="all">All Tags ({photos.length} photos)</SelectItem>
                  {uniqueTags.map((tag) => {
                    const photoCount = photos.filter(photo => photo.tags?.includes(tag)).length;
                    return (
                      <SelectItem key={tag} value={tag}>
                        {tag} ({photoCount} photo{photoCount !== 1 ? 's' : ''})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {uniqueTags.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  No tags found. Upload photos with tags to enable tag filtering.
                </div>
              )}
              
              {uniqueTags.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 mb-2">Popular tags:</p>
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
            
            <TabsContent value="log" className="mt-4">
              <Select value={selectedLog} onValueChange={setSelectedLog}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a log" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Logs</SelectItem>
                  {logsWithImages.map((log) => (
                    <SelectItem key={log.id} value={log.id}>
                      {log.title} ({log.images?.length || 0} photos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


      {/* Photo Gallery */}
      {filteredPhotosData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Camera size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
            <p className="text-gray-500 mb-4">
              {photos.length === 0 
                ? "Upload your first photos to get started" 
                : "Try adjusting your filters or search terms"
              }
            </p>
            {photos.length === 0 && (
              <Button onClick={() => setIsUploadDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                <Camera size={16} className="mr-2" />
                Upload Photos
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
                  src={`/api/photos/${photo.id}`}
                  alt={photo.description || photo.originalName}
                  className="w-full h-full object-cover rounded-t-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(`/api/photos/${photo.id}`, '_blank')}
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

                  <h3 className="font-medium text-sm truncate" title={photo.description || 'Project Photo'}>
                    {photo.description || 'Project Photo'}
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
                          title={`Filter by tag: ${tag}`}
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
                              title: "All Tags",
                              description: `Full tags: ${photo.tags?.join(', ')}`,
                            });
                          }}
                          title={`All tags: ${photo.tags.join(', ')}`}
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
                      onClick={() => window.open(`/api/photos/${photo.id}`, '_blank')}
                      data-testid={`button-view-photo-${photo.id}`}
                    >
                      <Download size={12} className="mr-1" />
                      View
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
                          <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to permanently delete this photo? This action cannot be undone.
                            {photo.description && (
                              <span className="block mt-2 text-sm font-medium">
                                "{photo.description}"
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePhotoMutation.mutate(photo.id)}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                          >
                            Delete Photo
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