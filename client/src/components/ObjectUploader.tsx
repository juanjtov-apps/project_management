import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export interface UploadResult {
  previewURL: string;
  objectPath: string;
}

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: (file?: any) => Promise<{
    method: "PUT";
    url: string;
    previewURL?: string;
    objectPath?: string;
    headers?: Record<string, string>;
  }>;
  onComplete?: (results: UploadResult[]) => void;
  onFilesSelected?: (files: File[]) => void; // New prop for deferred upload
  buttonClassName?: string;
  children: ReactNode;
  deferUpload?: boolean; // New prop to control when upload happens
}

export interface ObjectUploaderRef {
  uploadSelectedFiles: () => Promise<string[]>;
}

/**
 * A streamlined file upload component that provides direct file selection
 * with support for mobile camera capture.
 */
const ObjectUploader = forwardRef<ObjectUploaderRef, ObjectUploaderProps>(({
  maxNumberOfFiles = 5,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  onFilesSelected,
  buttonClassName,
  children,
  deferUpload = false, // Default to immediate upload for backward compatibility
}, ref) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesToUpload = Array.from(files).slice(0, maxNumberOfFiles);
    const validFiles = filesToUpload.filter(file => {
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

    if (deferUpload) {
      // Store files for later upload
      setSelectedFiles(validFiles);
      onFilesSelected?.(validFiles);
      console.log(`📁 Selected ${validFiles.length} files for upload`);
      return;
    }

    // Immediate upload (existing behavior)
    setIsUploading(true);
    const uploadResults: UploadResult[] = [];

    try {
      for (const file of validFiles) {
        console.log(`📤 Uploading ${file.name}...`);
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Get upload parameters (includes previewURL and objectPath)
        const params = await onGetUploadParameters(file);

        // Upload file directly using the PUT URL
        const response = await fetch(params.url, {
          method: params.method,
          body: file,
          headers: {
            'Content-Type': file.type,
            ...params.headers
          }
        });

        if (response.ok) {
          // Store the preview URL and object path (not the upload URL)
          uploadResults.push({
            previewURL: params.previewURL || params.url,
            objectPath: params.objectPath || params.url
          });
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          console.log(`✅ Uploaded ${file.name} successfully, preview: ${params.previewURL?.substring(0, 50)}...`);
        } else {
          console.error(`❌ Failed to upload ${file.name}:`, response.statusText);
        }
      }

      // Call completion callback with results containing previewURL and objectPath
      if (uploadResults.length > 0 && onComplete) {
        onComplete(uploadResults);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress({});

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Function to upload selected files (for deferred upload mode)
  const uploadSelectedFiles = async () => {
    if (selectedFiles.length === 0) return [];

    setIsUploading(true);
    const uploadResults: UploadResult[] = [];

    try {
      for (const file of selectedFiles) {
        console.log(`📤 Uploading ${file.name}...`);
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Get upload parameters (includes previewURL and objectPath)
        const params = await onGetUploadParameters(file);

        // Upload file directly using the PUT URL
        const response = await fetch(params.url, {
          method: params.method,
          body: file,
          headers: {
            'Content-Type': file.type,
            ...params.headers
          }
        });

        if (response.ok) {
          uploadResults.push({
            previewURL: params.previewURL || params.url,
            objectPath: params.objectPath || params.url
          });
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          console.log(`✅ Uploaded ${file.name} successfully`);
        } else {
          console.error(`❌ Failed to upload ${file.name}:`, response.statusText);
        }
      }

      // Clear selected files after upload
      setSelectedFiles([]);

      // Call completion callback
      if (uploadResults.length > 0 && onComplete) {
        onComplete(uploadResults);
      }

      return uploadResults.map(r => r.objectPath);
    } catch (error) {
      console.error('Upload error:', error);
      return [];
    } finally {
      setIsUploading(false);
      setUploadProgress({});

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Expose the upload function via ref for deferred upload mode
  useImperativeHandle(ref, () => ({
    uploadSelectedFiles
  }));

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)}
      />
      
      <Button 
        type="button"
        onClick={handleButtonClick}
        disabled={isUploading}
        className={buttonClassName}
        data-testid="button-upload-photos"
      >
        {isUploading ? "Uploading..." : children}
      </Button>

      {/* Show selected files preview (for deferred upload mode) */}
      {deferUpload && selectedFiles.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-600 mb-1">
            {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected for upload
          </p>
          <div className="grid grid-cols-3 gap-1">
            {selectedFiles.map((file, index) => (
              <div key={index} className="text-xs text-gray-500 truncate">
                {file.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show upload progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="mt-2 space-y-1">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="text-xs text-gray-600">
              <div className="flex justify-between">
                <span>{fileName}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-construction-teal h-1 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

ObjectUploader.displayName = 'ObjectUploader';

export { ObjectUploader };