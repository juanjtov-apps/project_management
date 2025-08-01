import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Download, Eye, Calendar, Tag } from "lucide-react";
import type { Photo } from "@shared/schema";

interface PhotoGalleryProps {
  photos: Photo[];
  onDelete?: (id: string) => void;
}

export default function PhotoGallery({ photos, onDelete }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
    setIsViewerOpen(true);
  };

  const handleDownload = async (photo: Photo) => {
    try {
      const response = await fetch(`/api/photos/${photo.id}/file`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = photo.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download photo:', error);
    }
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No photos uploaded yet
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {photos.map((photo) => {
          // Parse tags safely
          let photoTags: string[] = [];
          try {
            photoTags = typeof photo.tags === 'string' ? JSON.parse(photo.tags) : photo.tags || [];
          } catch {
            photoTags = [];
          }

          return (
            <div
              key={photo.id}
              className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handlePhotoClick(photo)}
            >
              <img
                src={`/api/photos/${photo.id}/file`}
                alt={photo.originalName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Tags overlay - always visible */}
              {photoTags.length > 0 && (
                <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[calc(100%-1rem)]">
                  {photoTags.slice(0, 2).map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs bg-black bg-opacity-70 text-white hover:bg-opacity-90 transition-opacity"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {photoTags.length > 2 && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-black bg-opacity-70 text-white"
                    >
                      +{photoTags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePhotoClick(photo);
                  }}
                >
                  <Eye size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(photo);
                  }}
                >
                  <Download size={16} />
                </Button>
                {onDelete && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(photo.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Photo info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
              <p className="text-white text-xs truncate">{photo.originalName}</p>
              <p className="text-gray-300 text-xs">
                {new Date(photo.createdAt).toLocaleDateString()}
              </p>
            </div>
            </div>
          );
        })}
      </div>

      {/* Photo Viewer Dialog */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="sr-only">Photo Viewer</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={`/api/photos/${selectedPhoto.id}/file`}
                  alt={selectedPhoto.originalName}
                  className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
                />
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold construction-secondary">
                    {selectedPhoto.originalName}
                  </h3>
                  {selectedPhoto.description && (
                    <p className="text-gray-600 mt-1">{selectedPhoto.description}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar size={16} className="mr-1" />
                    {new Date(selectedPhoto.createdAt).toLocaleString()}
                  </div>
                </div>
                
                {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Tag size={16} className="text-gray-500" />
                    <div className="flex flex-wrap gap-1">
                      {selectedPhoto.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(selectedPhoto)}
                  >
                    <Download size={16} className="mr-2" />
                    Download
                  </Button>
                  {onDelete && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        onDelete(selectedPhoto.id);
                        setIsViewerOpen(false);
                      }}
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
