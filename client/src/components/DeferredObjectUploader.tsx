import { useState, useRef, forwardRef, useImperativeHandle, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface DeferredObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
    headers?: Record<string, string>;
  }>;
  onComplete?: (urls: string[]) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export interface DeferredObjectUploaderRef {
  getSelectedFiles: () => File[];
  uploadFiles: () => Promise<string[]>;
  clearFiles: () => void;
}

/**
 * A file uploader that defers uploads until explicitly triggered.
 * Files are selected immediately but uploads only happen when uploadFiles() is called.
 */
const DeferredObjectUploader = forwardRef<DeferredObjectUploaderRef, DeferredObjectUploaderProps>(({
  maxNumberOfFiles = 5,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}, ref) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesToSelect = Array.from(files).slice(0, maxNumberOfFiles);
    const validFiles = filesToSelect.filter(file => {
      if (file.size > maxFileSize) {
        console.warn(`File ${file.name} exceeds size limit`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        console.warn(`File ${file.name} is not an image`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Store files for later upload - NO UPLOAD HAPPENS HERE
    setSelectedFiles(validFiles);
    console.log(`📁 Selected ${validFiles.length} files for deferred upload (NOT uploading yet)`);
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (selectedFiles.length === 0) {
      console.log('📁 No files selected for upload');
      return [];
    }

    console.log(`🚀 Starting deferred upload of ${selectedFiles.length} files`);
    setIsUploading(true);
    
    try {
      const uploadedUrls: string[] = [];

      for (const file of selectedFiles) {
        console.log(`📤 Uploading ${file.name}...`);
        
        // Get upload parameters
        const { url, method, headers } = await onGetUploadParameters();
        
        // Upload file
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': file.type,
            ...headers,
          },
          body: file,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}: ${response.statusText}`);
        }

        // Extract object ID from the upload URL
        const uploadedUrl = url;
        uploadedUrls.push(uploadedUrl);
        console.log(`✅ Successfully uploaded ${file.name}`);
      }

      // Clear selected files after successful upload
      setSelectedFiles([]);

      // Call completion callback
      if (uploadedUrls.length > 0 && onComplete) {
        onComplete(uploadedUrls);
      }

      console.log(`🎉 All ${uploadedUrls.length} files uploaded successfully`);
      return uploadedUrls;
    } catch (error) {
      console.error('❌ Upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    console.log('🗑️ Cleared selected files');
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getSelectedFiles: () => selectedFiles,
    uploadFiles,
    clearFiles
  }));

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"


        capture="environment" // Enable mobile camera

        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)}
      />
      
      <Button 
        type="button"
        onClick={handleButtonClick}
        disabled={isUploading}
        className={buttonClassName}
        data-testid="button-select-photos"
      >
        {isUploading ? "Uploading..." : children}
      </Button>

      {/* Show selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="mt-2 p-2 bg-blue-50 rounded border">
          <p className="text-xs text-blue-700 font-medium mb-1">
            {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected (will upload when form is saved)
          </p>
          <div className="space-y-1">
            {selectedFiles.map((file, index) => (
              <div key={index} className="text-xs text-blue-600 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span className="truncate">{file.name}</span>
                <span className="text-blue-500">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show upload status */}
      {isUploading && (
        <div className="mt-2 p-2 bg-yellow-50 rounded border">
          <p className="text-xs text-yellow-700 font-medium">
            Uploading {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}...
          </p>
        </div>
      )}
    </div>
  );
});

DeferredObjectUploader.displayName = 'DeferredObjectUploader';

export { DeferredObjectUploader };