import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, AlertTriangle, CheckCircle, Clock, User, Camera, X, Calendar, Filter } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectLogSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DeferredObjectUploader, type DeferredObjectUploaderRef } from "@/components/DeferredObjectUploader";
import type { ProjectLog, InsertProjectLog, Project } from "@shared/schema";

const getTypeColor = (type: string) => {
  switch (type) {
    case "issue":
      return "bg-red-100 text-red-800";
    case "milestone":
      return "bg-green-100 text-green-800";
    case "safety":
      return "bg-brand-coral/10 text-brand-coral";
    case "general":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-800";
    case "in-progress":
      return "bg-brand-coral/10 text-brand-coral";
    case "resolved":
      return "bg-green-100 text-green-800";
    case "closed":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "issue":
      return <AlertTriangle size={16} className="text-red-600" />;
    case "milestone":
      return <CheckCircle size={16} className="text-green-600" />;
    case "safety":
      return <AlertTriangle size={16} className="text-brand-coral" />;
    case "general":
      return <FileText size={16} className="text-blue-600" />;
    default:
      return <FileText size={16} className="text-gray-600" />;
  }
};

export default function Logs() {
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
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const createUploaderRef = useRef<DeferredObjectUploaderRef>(null);
  const editUploaderRef = useRef<DeferredObjectUploaderRef>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: logs = [], isLoading: logsLoading } = useQuery<ProjectLog[]>({
    queryKey: ["/api/logs"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createLogMutation = useMutation({
    mutationFn: (data: InsertProjectLog & { images?: string[] }) => apiRequest("/api/logs", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      setIsCreateDialogOpen(false);
      setUploadedImages([]);
      setPhotoTags("");
      form.reset();
      toast({
        title: "Success",
        description: "Project log created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project log",
        variant: "destructive",
      });
    },
  });

  const updateLogMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InsertProjectLog> }) =>
      apiRequest(`/api/logs/${id}`, { method: "PATCH", body: updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      setIsEditDialogOpen(false);
      setEditingLog(null);
      setUploadedImages([]); // Reset uploaded images
      setPhotoTags(""); // Reset photo tags
      editForm.reset();
      toast({
        title: "Success",
        description: "Log updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update log",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertProjectLog>({
    resolver: zodResolver(insertProjectLogSchema),
    defaultValues: {
      projectId: "",
      userId: "sample-user-id", // In a real app, this would come from auth
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
      userId: "sample-user-id",
      title: "",
      content: "",
      type: "general",
      status: "open",
    },
  });

  const onSubmit = async (data: InsertProjectLog) => {
    console.log('🚀 Form submission started - uploading photos...');
    
    try {
      // Upload selected files first
      const uploadedUrls = await createUploaderRef.current?.uploadFiles() || [];
      console.log('✅ Photos uploaded successfully:', uploadedUrls);
      
      const submissionData = {
        ...data,
        images: [...uploadedImages, ...uploadedUrls] // Combine existing + new
      };
      
      console.log('📝 Creating log with images:', submissionData);
      createLogMutation.mutate(submissionData);
    } catch (error) {
      console.error('❌ Photo upload failed:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload photos. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onEditSubmit = async (data: InsertProjectLog) => {
    if (!editingLog) return;
    
    console.log('🚀 Edit form submission started - uploading new photos...');
    
    try {
      // Upload new selected files first
      const newUploadedUrls = await editUploaderRef.current?.uploadFiles() || [];
      console.log('✅ New photos uploaded successfully:', newUploadedUrls);
      
      // Merge existing images with newly uploaded images
      const existingImages = editingLog.images || [];
      const allImages = [...existingImages, ...uploadedImages, ...newUploadedUrls];
      
      const updateData = {
        ...data,
        images: allImages
      };
      
      console.log('📸 Updating log with images:', { 
        existingCount: existingImages.length, 
        previouslyUploadedCount: uploadedImages.length,
        newCount: newUploadedUrls.length, 
        totalCount: allImages.length 
      });
      
      updateLogMutation.mutate({
        id: editingLog.id,
        updates: updateData
      });
    } catch (error) {
      console.error('❌ Photo upload failed during edit:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload new photos. Please try again.",
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
    setIsEditDialogOpen(true);
  };

  const handleGetUploadParameters = async (file?: any) => {
    try {
      console.log('🔗 Requesting upload URL from server for file:', file?.name);
      const response = await apiRequest("/api/objects/upload", { method: "POST", body: {} });
      const data = await response.json();
      
      console.log('✅ Got upload URL response:', { 
        url: data.uploadURL?.substring(0, 100) + '...',
        fullLength: data.uploadURL?.length 
      });
      
      const uploadParams = {
        method: "PUT" as const,
        url: data.uploadURL,
        headers: {}
      };
      
      console.log('📤 Returning upload parameters for Uppy:', uploadParams);
      return uploadParams;
    } catch (error) {
      console.error('❌ Failed to get upload parameters:', error);
      toast({
        title: "Error",
        description: "Failed to get upload URL",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUploadComplete = async (result: any) => {
    console.log('📸 Photo upload complete! Upload result:', result);
    
    if (result?.successful && result.successful.length > 0) {
      try {
        // Extract URLs from successful uploads - convert to object storage image URLs
        const uploadedUrls = result.successful.map((file: any) => {
          // The uploadURL field contains the presigned URL that was used for upload
          const uploadUrl = file.uploadURL;
          console.log('🔍 Processing upload URL:', uploadUrl);
          
          // The URL format is: https://storage.googleapis.com/bucket/.private/uploads/object-id
          // Extract object ID from the URL path
          const urlMatch = uploadUrl.match(/\/uploads\/([^?]+)/);
          const objectId = urlMatch ? urlMatch[1] : null;
          
          console.log('🔍 Extracted object ID:', objectId);
          
          if (!objectId) {
            console.error('❌ Could not extract object ID from URL:', uploadUrl);
            return uploadUrl; // fallback to original URL
          }
          
          return `/api/objects/image/${objectId}`;
        });
        
        console.log('📸 Converted URLs for display:', uploadedUrls);
        
        // Get current project ID from the appropriate form (create or edit)
        const currentProjectId = isEditDialogOpen ? editForm.watch('projectId') : form.watch('projectId');
        
        // Parse tags from input (comma-separated)
        const tags = photoTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
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
            
            return apiRequest("/api/photos", { method: "POST", body: photoData });
          });
          
          await Promise.all(photoPromises);
        }
        
        // Store the image URLs for the log
        setUploadedImages(prev => [...prev, ...uploadedUrls]);
        
        toast({
          title: "Success",
          description: currentProjectId 
            ? `${uploadedUrls.length} image(s) uploaded and saved successfully`
            : `${uploadedUrls.length} image(s) uploaded. Select a project to save metadata.`,
        });
      } catch (error) {
        console.error('Error processing uploaded images:', error);
        toast({
          title: "Error",
          description: "Failed to process uploaded images",
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
    return project?.name || "Unknown Project";
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          <h1 className="text-2xl font-bold">Project Logs</h1>
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
        <h1 className="text-2xl font-bold construction-secondary">Project Logs</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="construction-primary text-white">
              <Plus size={16} className="mr-2" />
              Create Log
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Create Project Log</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
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
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter log title" {...field} />
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
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter detailed log content..." 
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
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="issue">Issue</SelectItem>
                            <SelectItem value="milestone">Milestone</SelectItem>
                            <SelectItem value="safety">Safety</SelectItem>
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
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Improved Image Upload Section */}
                <div className="space-y-4">
                  <FormLabel>Photos (Optional)</FormLabel>
                  
                  {/* Photo Tags Input */}
                  <div className="space-y-2">
                    <FormLabel htmlFor="photo-tags" className="text-sm text-gray-600">
                      Photo Tags (comma-separated)
                    </FormLabel>
                    <Input
                      id="photo-tags"
                      type="text"
                      placeholder="e.g., foundation, concrete, progress"
                      value={photoTags}
                      onChange={(e) => setPhotoTags(e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      Add tags to help organize and search photos later
                    </p>
                  </div>

                  {/* Streamlined Photo Upload */}
                  <div className="flex items-center gap-4">
                    <DeferredObjectUploader
                      ref={createUploaderRef}
                      maxNumberOfFiles={5}
                      maxFileSize={10485760} // 10MB
                      onGetUploadParameters={handleGetUploadParameters}
                      buttonClassName="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md font-medium inline-flex items-center gap-2 shadow-md"
                    >
                      <Camera size={16} />
                      Select Photos
                    </DeferredObjectUploader>
                    <span className="text-sm text-gray-500">Up to 5 files, max 10MB each</span>
                  </div>
                  
                  {/* Display uploaded images in a nice grid */}
                  {uploadedImages.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Camera size={16} className="text-gray-500" />
                        <p className="text-sm font-medium text-gray-700">
                          {uploadedImages.length} photo{uploadedImages.length > 1 ? 's' : ''} ready to attach
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
                                Preview {index + 1}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-md"
                              title="Remove photo"
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
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createLogMutation.isPending}
                    className="construction-primary text-white"
                  >
                    {createLogMutation.isPending ? "Creating..." : "Create Log"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Log Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Edit Project Log</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
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
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter log title" {...field} />
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
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter detailed log content..." 
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
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="issue">Issue</SelectItem>
                            <SelectItem value="milestone">Milestone</SelectItem>
                            <SelectItem value="safety">Safety</SelectItem>
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
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Photo Upload Section for Edit Dialog */}
                <div className="space-y-4">
                  <FormLabel>Photos</FormLabel>
                  
                  {/* Display existing images from the log being edited */}
                  {editingLog && editingLog.images && editingLog.images.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Camera size={16} className="text-gray-500" />
                        <p className="text-sm font-medium text-gray-700">
                          {editingLog.images.length} existing photo{editingLog.images.length > 1 ? 's' : ''}
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
                              Photo {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <FormLabel className="text-sm">Add More Photos (Optional)</FormLabel>
                  
                  {/* Photo Tags Input */}
                  <div className="space-y-2">
                    <FormLabel htmlFor="edit-photo-tags" className="text-sm text-gray-600">
                      Photo Tags (comma-separated)
                    </FormLabel>
                    <Input
                      id="edit-photo-tags"
                      type="text"
                      placeholder="e.g., foundation, concrete, progress"
                      value={photoTags}
                      onChange={(e) => setPhotoTags(e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      Add tags to help organize and search photos later
                    </p>
                  </div>

                  {/* Streamlined Photo Upload */}
                  <div className="flex items-center gap-4">
                    <DeferredObjectUploader
                      ref={editUploaderRef}
                      maxNumberOfFiles={5}
                      maxFileSize={10485760} // 10MB
                      onGetUploadParameters={handleGetUploadParameters}
                      buttonClassName="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md font-medium inline-flex items-center gap-2 shadow-md"
                    >
                      <Camera size={16} />
                      Select More Photos
                    </DeferredObjectUploader>
                    <span className="text-sm text-gray-500">Up to 5 files, max 10MB each</span>
                  </div>
                  
                  {/* Display newly uploaded images */}
                  {uploadedImages.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Camera size={16} className="text-gray-500" />
                        <p className="text-sm font-medium text-gray-700">
                          {uploadedImages.length} new photo{uploadedImages.length > 1 ? 's' : ''} ready to attach
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
                                Preview {index + 1}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-md"
                              title="Remove photo"
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
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateLogMutation.isPending}
                    className="construction-primary text-white"
                  >
                    {updateLogMutation.isPending ? "Updating..." : "Update Log"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="issue">Issue</SelectItem>
            <SelectItem value="milestone">Milestone</SelectItem>
            <SelectItem value="safety">Safety</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
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
            Clear All Filters
          </Button>
        )}
      </div>
      
      {/* Custom Date Range Inputs */}
      {dateFilter === "custom" && (
        <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg">
          <Calendar className="text-gray-500" size={16} />
          <span className="text-sm font-medium text-gray-700">Custom Date Range:</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
            placeholder="Start date"
          />
          <span className="text-gray-400">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
            placeholder="End date"
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
            Clear
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No logs found</p>
            <p className="text-gray-400">Create your first project log to get started</p>
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
                        {log.images.length} photo{log.images.length > 1 ? 's' : ''} attached
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
                    <span>Created {new Date(log.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    {/* Edit button - always available */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditingLog(log)}
                      className="text-construction-teal border-construction-teal hover:bg-construction-teal/10"
                    >
                      Edit
                    </Button>
                    
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
                            Start Progress
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
                            Mark Resolved
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
                            Close
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
