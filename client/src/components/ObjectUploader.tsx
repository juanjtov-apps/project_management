import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: (file?: any) => Promise<{
    method: "PUT";
    url: string;
    headers?: Record<string, string>;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded
 *   (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL).
 *   Typically used to fetch a presigned URL from the backend server for direct-to-S3
 *   uploads.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL
 *   policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 5,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const modalClosedByUser = useRef(false);
  
  const [uppy] = useState(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['image/*', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
      },
      autoProceed: false,
      allowMultipleUploadBatches: true,
      debug: true
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file) => {
          console.log('🔧 Uppy requesting upload parameters for:', file.name, 'type:', file.type, 'size:', file.size);
          try {
            const params = await onGetUploadParameters(file);
            console.log('📋 Upload parameters received:', {
              method: params.method,
              url: params.url?.substring(0, 100) + '...',
              hasHeaders: !!(params as any).headers
            });
            
            // Return exactly what Uppy expects for PUT uploads
            const uploadParams = {
              method: params.method,
              url: params.url,
              headers: {
                ...(params.headers || {}),
                'Content-Type': file.type || 'application/octet-stream'
              }
            };
            
            console.log('📤 Returning to Uppy:', {
              method: uploadParams.method,
              url: uploadParams.url.substring(0, 100) + '...',
              headers: uploadParams.headers
            });
            
            return uploadParams;
          } catch (error) {
            console.error('❌ Failed to get upload parameters:', error);
            throw error;
          }
        },
      });

    // Prevent auto-close by handling all events that might close the modal
    uppyInstance.on('complete', (result) => {
      console.log('Upload complete:', result);
      console.log('Successful uploads:', result.successful?.length);
      console.log('Failed uploads:', result.failed?.length);
      if (result.failed && result.failed.length > 0) {
        console.error('Failed upload details:', result.failed);
      }
      onComplete?.(result);
      // Don't auto-close the modal - let user close it manually
    });

    uppyInstance.on('error', (error) => {
      console.error('Uppy general error:', error);
      // Don't auto-close on error either
    });

    uppyInstance.on('upload-error', (file, error, response) => {
      console.error('❌ File upload error for file:', file?.name);
      console.error('❌ Error details:', error);
      console.error('❌ Response details:', response);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Response status:', response?.status);
      console.error('❌ Response body:', response?.body);
      // Don't auto-close on individual file errors
    });

    uppyInstance.on('upload-success', (file, response) => {
      console.log('File uploaded successfully:', file?.name);
      console.log('Upload response:', response);
    });

    uppyInstance.on('upload-progress', (file, progress) => {
      console.log(`Upload progress for ${file?.name}: ${progress?.percentage || 0}%`);
    });

    return uppyInstance;
  });

  // Handle modal open/close state
  const handleOpenModal = () => {
    modalClosedByUser.current = false;
    setShowModal(true);
  };

  const handleCloseModal = () => {
    modalClosedByUser.current = true;
    setShowModal(false);
  };

  // Prevent any automatic modal closing unless user explicitly closed it
  useEffect(() => {
    if (showModal && !modalClosedByUser.current) {
      // Keep modal open if it wasn't explicitly closed by user
      const timer = setTimeout(() => {
        if (!modalClosedByUser.current) {
          setShowModal(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showModal]);

  return (
    <div>
      <Button 
        type="button"
        onClick={handleOpenModal} 
        className={buttonClassName}
        data-testid="button-upload-photos"
      >
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={handleCloseModal}
        proudlyDisplayPoweredByUppy={false}
        closeModalOnClickOutside={false}
        disableStatusBar={false}
        disableInformer={false}
        showProgressDetails={true}
        note="Upload multiple photos (up to 5 files, max 10MB each)"
      />
    </div>
  );
}