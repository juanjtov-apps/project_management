import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Camera, Trash2, Download, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPhotoSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PhotoGallery from "@/components/photos/photo-gallery";
import type { Photo, Project } from "@shared/schema";

interface PhotoUploadData {
  projectId: string;
  description: string;
  tags: string[];
}

export default function Photos() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: photos = [], isLoading: photosLoading } = useQuery<Photo[]>({
    queryKey: ["/api/photos"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (data: { formData: FormData }) => {
      const response = await fetch("/api/photos", {
        method: "POST",
        body: data.formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsUploadDialogOpen(false);
      setSelectedFiles(null);
      form.reset();
      toast({
        title: "Success",
        description: "Photos uploaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload photos",
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

  const onSubmit = (data: PhotoUploadData) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one photo",
        variant: "destructive",
      });
      return;
    }

    if (!data.projectId || data.projectId.trim() === "") {
      toast({
        title: "Error",
        description: "Please select a project before uploading photos",
        variant: "destructive",
      });
      return;
    }

    Array.from(selectedFiles).forEach((file) => {
      const formData = new FormData();
      formData.append("file", file);  // Backend expects "file" field name
      formData.append("projectId", data.projectId);
      formData.append("userId", "sample-user-id"); // In a real app, this would come from auth
      formData.append("description", data.description);
      formData.append("tags", JSON.stringify(data.tags));
      
      console.log("Photo upload - FormData entries:");
      Array.from(formData.entries()).forEach(([key, value]) => {
        console.log(`${key}:`, value);
      });

      uploadPhotoMutation.mutate({ formData });
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && !form.watch("projectId")) {
      toast({
        title: "Project Required",
        description: "Please select a project first before choosing files",
        variant: "destructive",
      });
      // Reset the file input
      event.target.value = '';
      return;
    }
    setSelectedFiles(files);
  };

  const handleDragDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    setSelectedFiles(files);
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  // Extract all unique tags from photos
  const allTags = Array.from(new Set(
    photos.flatMap(photo => {
      try {
        return typeof photo.tags === 'string' ? JSON.parse(photo.tags) : photo.tags || [];
      } catch {
        return [];
      }
    })
  )).sort();

  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = photo.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = selectedProject === "all" || photo.projectId === selectedProject;
    
    // Tag filtering
    let matchesTag = true;
    if (selectedTag !== "all") {
      try {
        const photoTags = typeof photo.tags === 'string' ? JSON.parse(photo.tags) : photo.tags || [];
        matchesTag = photoTags.includes(selectedTag);
      } catch {
        matchesTag = false;
      }
    }
    
    return matchesSearch && matchesProject && matchesTag;
  });

  const photosByProject = projects.map(project => ({
    project,
    photos: filteredPhotos.filter(photo => photo.projectId === project.id)
  })).filter(group => group.photos.length > 0);

  if (photosLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Photos</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold construction-secondary">Project Photos</h1>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="construction-primary text-white">
              <Camera size={16} className="mr-2" />
              Upload Photos
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]" aria-describedby="upload-photos-description">
            <DialogHeader>
              <DialogTitle>Upload Photos</DialogTitle>
              <div id="upload-photos-description" className="sr-only">
                Upload photos to a specific project with optional descriptions.
              </div>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-red-600 font-semibold">
                        Project *
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          (Required - You must select a project before uploading)
                        </span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={!field.value ? "border-red-300 bg-red-50" : ""}>
                            <SelectValue placeholder="⚠️ Please select a project first" />
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

                <div className="space-y-4">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                    onDrop={handleDragDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (form.watch("projectId")) {
                        setTimeout(() => {
                          fileInputRef.current?.click();
                        }, 0);
                      } else {
                        toast({
                          title: "Project Required",
                          description: "Please select a project first before choosing files",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-600">
                      {selectedFiles && selectedFiles.length > 0
                        ? `${selectedFiles.length} file(s) selected`
                        : "Drop photos here or click to browse"
                      }
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports JPG, PNG, GIF up to 10MB
                    </p>
                  </div>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="default"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (form.watch("projectId")) {
                          fileInputRef.current?.click();
                        } else {
                          toast({
                            title: "Project Required",
                            description: "Please select a project first before choosing files",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 border-2 border-blue-600 font-medium rounded-md shadow-sm"
                      style={{ minHeight: '40px', fontSize: '14px' }}
                    >
                      📁 Choose Files
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add a description for these photos..." 
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
                          placeholder="e.g., foundation, electrical, progress"
                          onChange={(e) => {
                            const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                            field.onChange(tags);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUploadDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={uploadPhotoMutation.isPending}
                    className="construction-primary text-white"
                  >
                    {uploadPhotoMutation.isPending ? "Uploading..." : "Upload Photos"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Search photos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
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
        <Select value={selectedTag} onValueChange={setSelectedTag}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {allTags.map(tag => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-8">
        {photosByProject.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No photos found</p>
            <p className="text-gray-400">Upload photos to get started</p>
          </div>
        ) : (
          photosByProject.map(({ project, photos }) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="construction-secondary">{project.name}</CardTitle>
                  <Badge variant="outline">{photos.length} photos</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <PhotoGallery 
                  photos={photos} 
                  onDelete={(id) => deletePhotoMutation.mutate(id)}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
