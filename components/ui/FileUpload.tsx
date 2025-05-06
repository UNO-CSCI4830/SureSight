import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { analyzeImage } from '../../services/imageAnalysisService';
import Icon from './icons/Icon';
import Button from './Button';

interface FileUploadProps {
  bucket: string;
  onUploadComplete?: (urls: string[]) => void;
  acceptedFileTypes?: string;
  storagePath?: string;
  maxFileSize?: number; // in MB
  multiple?: boolean; // Allow multiple file selection
  buttonLabel?: string; // Custom label for the button
  buttonClassName?: string; // Custom class for the button
  reportId?: string; // ID of the report to link images to
}

interface FilePreview {
  id: string;
  file: File;
  previewUrl: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  bucket,
  onUploadComplete,
  acceptedFileTypes = 'image/*',
  storagePath = '',
  maxFileSize = 5, // 5MB default
  multiple = true, // Default to true for multiple file uploads
  buttonLabel,
  buttonClassName,
  reportId
}) => {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [message, setMessage] = useState<{text: string; type: 'success' | 'error' | 'info'} | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get the user ID on component mount
  useEffect(() => {
    async function getUserId() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Get the database user ID from the auth user ID
        const { data: userData, error } = await supabase
          .from("users")
          .select("id")
          .eq("auth_user_id", session.user.id)
          .single();

        if (!error && userData) {
          setUserId(userData.id);
        }
      }
    }
    getUserId();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    processFiles(selectedFiles);
  };

  const processFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }
    
    const newFiles: FilePreview[] = [];
    const invalidFiles: string[] = [];
    
    Array.from(selectedFiles).forEach(file => {
      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        invalidFiles.push(`${file.name} (exceeds ${maxFileSize}MB)`);
        return;
      }
      
      // Create preview URL for images
      const previewUrl = URL.createObjectURL(file);
      
      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        previewUrl
      });
    });
    
    if (invalidFiles.length > 0) {
      setMessage({
        text: `Some files were too large: ${invalidFiles.join(', ')}`,
        type: 'error'
      });
    } else if (newFiles.length > 0) {
      setMessage(null);
    }
    
    // If multiple is false, replace existing files, otherwise add to array
    setFiles(prevFiles => multiple ? [...prevFiles, ...newFiles] : newFiles);
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prevFiles => {
      const updatedFiles = prevFiles.filter(f => f.id !== id);
      
      // Find the file to remove and revoke its object URL to prevent memory leaks
      const fileToRemove = prevFiles.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      
      return updatedFiles;
    });
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    
    if (files.length === 0) {
      setMessage({
        text: 'Please select at least one file to upload',
        type: 'info'
      });
      return;
    }
    
    setIsUploading(true);
    const uploadedUrls: string[] = [];
    const uploadedImageIds: string[] = [];
    const failedUploads: string[] = [];
    
    try {
      // Get the current authenticated user's auth_user_id (not the database user_id)
      const { data: sessionData } = await supabase.auth.getSession();
      const authUserId = sessionData?.session?.user?.id;
      
      if (!authUserId) {
        throw new Error('User is not authenticated');
      }
      
      console.log(`Starting upload of ${files.length} files to bucket: ${bucket}, path: ${storagePath}`);
      if (reportId) {
        console.log(`Using explicit report ID: ${reportId}`);
      }
      
      for (const filePreview of files) {
        const file = filePreview.file;
        const fileExt = file.name.split('.').pop();
        const fileId = `${Date.now()}-${filePreview.id}`;
        
        // Construct storage path based on bucket type to match RLS policies
        let fileName;
        if (bucket === 'reports') {
          // For reports bucket: reports/{bucket}/{auth_user_id}/{optional_report_id}-{timestamp}-{file_id}.{ext}
          const reportPrefix = reportId ? `${reportId}-` : '';
          fileName = `${bucket}/${authUserId}/${reportPrefix}${fileId}.${fileExt}`;
        } else if (bucket === 'property-images') {
          // For property-images bucket: property-images/{auth_user_id}/properties/{optional_property_id}/{timestamp}-{file_id}.{ext}
          // Extract property ID from storage path if available
          const propertyId = storagePath.includes('properties/') ? 
            storagePath.split('properties/')[1].split('/')[0] : '';
          fileName = `${bucket}/${authUserId}/properties/${propertyId}/${fileId}.${fileExt}`;
        } else {
          // For other buckets, include auth user ID at the beginning of the path
          fileName = `${bucket}/${authUserId}/${storagePath}${storagePath ? '/' : ''}${fileId}.${fileExt}`;
        }
        
        console.log(`Uploading file: ${file.name} to path: ${fileName}`);
        const imageUrl = publicUrlData?.publicUrl;
        
        if (!imageUrl) {
          console.error(`Failed to get public URL for ${fileName}`);
          failedUploads.push(file.name);
          continue;
        }
        
        console.log(`Got public URL: ${imageUrl}`);
        
        // Determine the report ID from the provided prop or from the storage path
        const imageReportId = reportId || 
          (storagePath.split('/')[0] === 'reports' ? storagePath.split('/')[1] : null);
        
        console.log(`Using report ID for database entry: ${imageReportId || 'none'}`);
        
        // Check if an assessment area ID is included in the path
        let assessmentAreaId: string | null = null;
        const pathParts = storagePath.split('/');
        if (pathParts[0] === 'reports' && pathParts.length >= 3 && pathParts[2] !== 'general') {
          assessmentAreaId = pathParts[2];
          console.log(`Detected assessment area ID from path: ${assessmentAreaId}`);
        }
        
        // Store image metadata in the database
        const imageInsertData = {
          storage_path: fileName,
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
          report_id: imageReportId,
          assessment_area_id: assessmentAreaId,
          uploaded_by: userId
        };
        
        console.log(`Inserting image record:`, imageInsertData);
        
        const { data: imageData, error: dbError } = await supabase
          .from('images')
          .insert(imageInsertData)
          .select('id')
          .single();
          
        if (dbError) {
          console.error('Error storing image metadata:', dbError);
          // Continue anyway, as the file was uploaded successfully
        } else if (imageData) {
          uploadedImageIds.push(imageData.id);
          console.log(`Image record created with ID: ${imageData.id}`);

          // Record the activity with the user_id
          if (userId) {
            // Add entry in activities table to track image upload
            const { error: activityError } = await supabase
              .from('activities')
              .insert({
                user_id: userId,
                report_id: imageReportId,
                activity_type: 'image_upload',
                details: {
                  image_id: imageData.id,
                  filename: file.name
                }
              });

            if (activityError) {
              console.error('Error recording activity:', activityError);
              // Continue anyway as the image was uploaded successfully
            }
          }
          
          // Trigger image analysis for newly uploaded images
          if (file.type.startsWith('image/')) {
            try {
              console.log(`Starting image analysis for ${imageData.id}`);
              await analyzeImage(imageUrl, imageData.id);
            } catch (analyzeErr) {
              console.error('Error analyzing image:', analyzeErr);
              // Continue anyway, as the file was uploaded successfully
            }
          }
        }
        
        uploadedUrls.push(imageUrl);
      }
      
      // Clean up previews after upload
      files.forEach(file => {
        URL.revokeObjectURL(file.previewUrl);
      });
      
      // Report success or partial success
      if (failedUploads.length === 0) {
        setMessage({
          text: `${uploadedUrls.length} file(s) uploaded successfully!`,
          type: 'success'
        });
        setFiles([]);
      } else {
        setMessage({
          text: `${uploadedUrls.length} file(s) uploaded. Failed: ${failedUploads.join(', ')}`,
          type: 'error'
        });
        // Remove only successfully uploaded files
        const successIds = new Set(uploadedUrls.map(url => {
          const parts = url.split('/');
          const fileNameWithExt = parts[parts.length - 1];
          return fileNameWithExt.split('.')[0]; // Extract the ID part
        }));
        
        setFiles(prevFiles => prevFiles.filter(f => !successIds.has(f.id)));
      }
      
      // Call the callback with URLs if provided
      if (onUploadComplete && uploadedUrls.length > 0) {
        console.log(`Upload complete, calling onUploadComplete with ${uploadedUrls.length} URLs`);
        onUploadComplete(uploadedUrls);
      }
    } catch (error: any) {
      console.error('Error in file upload process:', error);
      setMessage({
        text: `Upload failed: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    processFiles(droppedFiles);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getMessageClass = () => {
    if (!message) return '';
    
    switch (message.type) {
      case 'success':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'info':
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleUpload} className={buttonLabel ? "" : "space-y-6"}>
        {/* If buttonLabel is provided, render a simple button UI */}
        {buttonLabel ? (
          <div>
            <button
              type="button"
              onClick={triggerFileInput}
              className={buttonClassName || "px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"}
              disabled={isUploading}
            >
              {buttonLabel}
            </button>
            
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              accept={acceptedFileTypes}
              disabled={isUploading}
              multiple={multiple}
              className="hidden"
              title="Upload your files here"
            />
            
            {message && (
              <div className={`p-2 mt-2 text-xs rounded-md border ${getMessageClass()}`}>
                <p>{message.text}</p>
              </div>
            )}
            
            {isUploading && (
              <div className="mt-2 text-xs text-gray-500">Uploading...</div>
            )}
          </div>
        ) : (
          // Otherwise render the full drag-and-drop UI
          <>
            <div 
              className={`border-2 border-dashed rounded-lg p-6 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer
                ${isDragging ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              tabIndex={0}
              role="button"
              aria-label="File upload area"
            >
              <Icon 
                name="upload" 
                className="h-12 w-12 text-primary-400" 
                viewBox="0 0 24 24"
                stroke="currentColor" 
                fill="none" 
              />
              
              <div className="mt-4 text-center">
                <p className="text-sm font-medium text-gray-700">
                  {multiple ? (
                    <span>Drag & drop multiple files here, or <span className="text-primary-500">browse</span></span>
                  ) : (
                    <span>Drag & drop a file here, or <span className="text-primary-500">browse</span></span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">{acceptedFileTypes.replace('*', 'all')} (Max: {maxFileSize}MB)</p>
              </div>
              
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                accept={acceptedFileTypes}
                disabled={isUploading}
                multiple={multiple}
                className="hidden"
                title="Upload your files here"
              />
            </div>
            
            {message && (
              <div className={`p-3 rounded-md border ${getMessageClass()}`}>
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            {files.length > 0 && (
              <>
                <h3 className="text-lg font-medium text-gray-800">
                  Selected Files ({files.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                  {files.map(file => (
                    <div key={file.id} className="relative group rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="aspect-square w-full bg-gray-100 relative">
                        <img 
                          src={file.previewUrl} 
                          alt={`Preview of ${file.file.name}`}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute top-2 right-2 bg-black bg-opacity-60 text-white rounded-full w-8 h-8 flex items-center justify-center
                                    opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleRemoveFile(file.id); 
                          }}
                          title="Remove file"
                          aria-label={`Remove ${file.file.name}`}
                          disabled={isUploading}
                        >
                          <Icon name="close" className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="p-2 bg-white">
                        <p className="text-xs text-gray-600 truncate" title={file.file.name}>
                          {file.file.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={files.length === 0 || isUploading}
                isLoading={isUploading}
                className={files.length === 0 || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
              >
                Upload
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default FileUpload;