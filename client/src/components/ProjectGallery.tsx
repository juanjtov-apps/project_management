import { useState, useEffect } from "react";
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
import { Camera, Upload, X, Eye, Image as ImageIcon, Plus } from "lucide-react";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos", projectId] });
      setSelectedFiles(null);
      setPreviewUrls([]);
      setDescription("");
      setView("grid");
      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
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
    const files = event.target.files;
    console.log("📁 Files selected:", files);
    console.log("📁 Files length:", files?.length || 0);
    
    if (files) {
      for (let i = 0; i < files.length; i++) {
        console.log(`📁 File ${i}:`, files[i].name, files[i].type, files[i].size);
      }
    }
    
    setSelectedFiles(files);
    
    // Create preview URLs
    if (files && files.length > 0) {
      // Clean up previous preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      
      const newPreviewUrls = Array.from(files).map(file => {
        if (!file.type.startsWith('image/')) {
          console.log("❌ Invalid file type:", file.type);
          toast({
            title: "Invalid File",
            description: "Please select only image files",
            variant: "destructive",
          });
          return null;
        }
        const url = URL.createObjectURL(file);
        console.log("✅ Created preview URL:", url, "for file:", file.name);
        return url;
      }).filter(Boolean) as string[];
      
      setPreviewUrls(newPreviewUrls);
      console.log("🖼️ Preview URLs set:", newPreviewUrls);
      
      toast({
        title: "File Selected",
        description: `Selected ${files.length} file(s)`,
      });
    } else {
      console.log("📭 No files selected");
      setPreviewUrls([]);
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
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon size={20} />
            {projectName} - Photo Gallery
          </DialogTitle>
        </DialogHeader>

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
              <Label htmlFor="photo-upload">Select Photo</Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*,image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="mt-1 cursor-pointer file:cursor-pointer"
                multiple={false}
              />
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