import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, Upload, X, Eye, Image as ImageIcon, Plus, FileImage } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Photo } from "@shared/schema";

interface ProjectGalleryProps {
  projectId: string;
  projectName: string;
}

export function ProjectGallery({ projectId, projectName }: ProjectGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"grid" | "upload">("grid");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [description, setDescription] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Query for photos
  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ["/api/photos", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/photos?projectId=${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch photos");
      return response.json();
    },
    enabled: isOpen,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, description }: { file: File; description: string }) => {
      console.log("Starting upload mutation with:", { fileName: file.name, projectId, description });
      console.log("ProjectId value:", projectId, "Type:", typeof projectId);
      const formData = new FormData();
      formData.append("file", file);  // Backend expects "file" field name
      formData.append("projectId", projectId);
      formData.append("description", description);
      formData.append("userId", "sample-user-id");
      
      console.log("FormData entries:");
      Array.from(formData.entries()).forEach(([key, value]) => {
        console.log(`${key}:`, value);
      });

      console.log("Sending request to /api/photos");
      const response = await fetch("/api/photos", {
        method: "POST",
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });
      console.log("Response received:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error("Upload error:", errorData);
        console.error("Response status:", response.status);
        console.error("Response headers:", response.headers);
        throw new Error(`Failed to upload photo: ${response.status} - ${errorData}`);
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      console.log("✅ Upload successful:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/photos", projectId] });
      setSelectedFiles(null);
      setPreviewUrls([]);
      setDescription("");
      setView("grid");
      toast({
        title: "Success", 
        description: "Photo uploaded successfully",
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete photo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos", projectId] });
      setSelectedPhoto(null);
      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🎯 handleFileSelect called");
    console.log('change', event.target.files);
    const files = event.target.files;
    console.log("📁 Files selected:", files);
    console.log("📁 Files length:", files?.length || 0);
    
    if (files) {
      for (let i = 0; i < files.length; i++) {
        console.log(`📁 File ${i}:`, files[i].name, files[i].type, files[i].size);
      }
    }
    
    setSelectedFiles(files);
    
    // Auto-upload immediately when file is selected
    if (files && files.length > 0) {
      const file = files[0];
      console.log("🚀 Auto-uploading file:", file.name);
      
      uploadMutation.mutate({ 
        file, 
        description: description || `Uploaded ${file.name}` 
      });
    }
  };

  // Drag and drop handlers - Alternative to file input for sandbox environments
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    console.log("🎯 Files dropped:", files);
    console.log('drop change', files);
    
    if (files && files.length > 0) {
      // Convert FileList to array and filter for images
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length === 0) {
        toast({
          title: "Invalid Files",
          description: "Please drop only image files",
          variant: "destructive",
        });
        return;
      }

      // Create a new FileList-like object
      const dataTransfer = new DataTransfer();
      imageFiles.forEach(file => dataTransfer.items.add(file));
      const fileList = dataTransfer.files;
      
      setSelectedFiles(fileList);
      
      // Auto-upload the first image
      const firstFile = imageFiles[0];
      console.log("🚀 Auto-uploading dropped file:", firstFile.name);
      
      uploadMutation.mutate({ 
        file: firstFile, 
        description: description || `Uploaded ${firstFile.name}` 
      });
    }
  };

  const handleUpload = () => {
    console.log("🚀 handleUpload called");
    console.log("📁 selectedFiles:", selectedFiles);
    console.log("📝 description:", description);
    
    if (!selectedFiles || selectedFiles.length === 0) {
      console.log("❌ No files selected");
      toast({
        title: "Error",
        description: "Please select at least one file",
        variant: "destructive",
      });
      return;
    }

    // Upload the first file for now (can be extended for multiple uploads)
    const file = selectedFiles[0];
    console.log("📤 Uploading file:", file.name, file.type, file.size);
    uploadMutation.mutate({ file, description });
  };

  const getPhotoUrl = (photo: Photo) => {
    return `/api/photos/${photo.id}/file`;
  };

  // Clean up preview URLs when component unmounts
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Camera size={14} />
          Gallery
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]" aria-describedby="gallery-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon size={20} />
            {projectName} - Photo Gallery
          </DialogTitle>
        </DialogHeader>
        <div id="gallery-description" className="sr-only">
          Gallery for managing project photos. You can view existing photos or upload new ones.
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("grid")}
            className="gap-2"
          >
            <Eye size={14} />
            View Photos ({photos.length})
          </Button>
          <Button
            variant={view === "upload" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("upload")}
            className="gap-2"
          >
            <Upload size={14} />
            Upload New
          </Button>
        </div>

        {view === "grid" ? (
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500">Loading photos...</p>
              </div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <ImageIcon size={48} className="text-gray-300 mb-2" />
                <p className="text-gray-500">No photos yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setView("upload")}
                  className="mt-2 gap-2"
                >
                  <Plus size={14} />
                  Upload First Photo
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <Card key={photo.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="relative group">
                        <img
                          src={getPhotoUrl(photo)}
                          alt={photo.description || "Project photo"}
                          className="w-full h-32 object-cover"
                          onClick={() => setSelectedPhoto(photo)}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity" />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(photo.id);
                          }}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                      {photo.description && (
                        <div className="p-2">
                          <p className="text-xs text-gray-600 truncate">{photo.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Upload Photo</Label>
              <div className="mt-1 space-y-3">
                {/* Drag and Drop Zone - Primary method */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragOver
                      ? 'border-blue-500 bg-blue-50'
                      : uploadMutation.isPending
                      ? 'border-gray-300 bg-gray-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <FileImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  {uploadMutation.isPending ? (
                    <div>
                      <p className="text-lg font-medium text-blue-600">Uploading...</p>
                      <p className="text-sm text-gray-500">Please wait while your photo is being uploaded</p>
                    </div>
                  ) : isDragOver ? (
                    <div>
                      <p className="text-lg font-medium text-blue-600">Drop your photo here</p>
                      <p className="text-sm text-gray-500">Release to upload</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-medium text-gray-900">Drag and drop a photo here</p>
                      <p className="text-sm text-gray-500">Or click below to browse files</p>
                    </div>
                  )}
                </div>

                {/* File Input - Fallback method */}
                <div className="text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    onClick={() => console.log("📁 File input directly clicked")}
                    multiple={false}
                    disabled={uploadMutation.isPending}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      console.log("🖱️ Browse button clicked");
                      fileInputRef.current?.click();
                    }}
                    disabled={uploadMutation.isPending}
                    className="gap-2"
                  >
                    <Upload size={16} />
                    Browse Files
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Supports JPG, PNG, GIF, WebP (max 10MB)
                  </p>
                </div>
              </div>
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">
                    Selected Photo Preview: ({selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''})
                  </p>
                  <p className="text-xs text-gray-500">
                    Preview URLs: {previewUrls.length > 0 ? previewUrls.join(', ') : 'None generated'}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {previewUrls.length > 0 ? previewUrls.map((url, index) => (
                      <div key={index} className="relative bg-gray-50 p-2 rounded-lg border-2 border-dashed border-gray-300">
                        <div className="w-32 h-32 border border-gray-200 rounded-lg overflow-hidden bg-white">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                            onLoad={() => console.log('Preview image loaded successfully:', url)}
                            onError={(e) => {
                              console.error('Image preview failed to load:', e, 'URL:', url);
                            }}
                          />
                        </div>
                        <div className="mt-2 text-center">
                          <Badge variant="outline" className="text-xs truncate max-w-32">
                            {selectedFiles[index]?.name || 'Unknown file'}
                          </Badge>
                        </div>
                      </div>
                    )) : (
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        <p className="text-xs text-gray-500 text-center">No preview<br/>generated</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for these photos..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={!selectedFiles || selectedFiles.length === 0 || uploadMutation.isPending}
                className="gap-2"
              >
                <Upload size={14} />
                {uploadMutation.isPending ? "Uploading..." : "Upload Photos"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setView("grid")}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Photo viewer modal */}
        {selectedPhoto && (
          <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Photo Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <img
                  src={getPhotoUrl(selectedPhoto)}
                  alt={selectedPhoto.description || "Project photo"}
                  className="w-full max-h-96 object-contain rounded-lg"
                />
                {selectedPhoto.description && (
                  <div>
                    <Label>Description</Label>
                    <p className="text-sm text-gray-600 mt-1">{selectedPhoto.description}</p>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  Uploaded: {new Date(selectedPhoto.createdAt).toLocaleDateString()}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}