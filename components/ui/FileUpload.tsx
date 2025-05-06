import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
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
    const failedUploads: string[] = [];
    
    try {
      // Get the current authenticated user's auth_user_id
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Auth session:', sessionData);
      const authUserId = sessionData?.session?.user?.id;
      
      if (!authUserId) {
        throw new Error('User is not authenticated');
      }
      
      console.log(`Starting upload of ${files.length} files to bucket: ${bucket}, path: ${storagePath}`);
      console.log('Current user ID:', userId);
      console.log('Auth user ID:', authUserId);
      if (reportId) {
        console.log(`Using report ID: ${reportId}`);
      }
      
      for (const filePreview of files) {
        const file = filePreview.file;
        const fileId = `${Date.now()}-${filePreview.id}`;
        
        // Generate file path based on provided storagePath or default path
        let fileName: string;
        if (storagePath) {
          fileName = `${storagePath}/${fileId}-${file.name}`;
        } else {
          fileName = `${authUserId}/${fileId}-${file.name}`;
        }
        
        console.log(`Uploading file: ${file.name} to path: ${fileName} in bucket: ${bucket}`);
        
        // Upload the file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (uploadError) {
          console.error(`Error uploading file ${file.name}:`, uploadError);
          failedUploads.push(file.name);
          continue;
        }
        
        // Get the public URL for the uploaded file
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);
          
        const imageUrl = publicUrlData?.publicUrl;
        
        if (!imageUrl) {
          console.error(`Failed to get public URL for ${fileName}`);
          failedUploads.push(file.name);
          continue;
        }
        
        console.log(`Got public URL: ${imageUrl}`);
        
        // Determine assessment area ID if applicable from the storage path
        let assessmentAreaId: string | null = null;
        if (storagePath && storagePath.includes('/')) {
          const pathParts = storagePath.split('/');
          // For paths like reports/[reportId]/[areaId]
          if (pathParts.length >= 3 && pathParts[2] && pathParts[2] !== 'general') {
            assessmentAreaId = pathParts[2];
            console.log(`Detected assessment area ID from path: ${assessmentAreaId}`);
          }
        }
        
        // Only try to insert into database if we have a user ID
        if (userId) {
          try {
            // Store the full path with bucket prefix for consistent retrieval
            const fullStoragePath = `${bucket}/${fileName}`;
            
            // Use the RPC function to safely insert the image record
            const { data: imageId, error: rpcError } = await supabase.rpc(
              'insert_image_record',
              {
                p_storage_path: fullStoragePath,
                p_filename: file.name,
                p_content_type: file.type,
                p_file_size: file.size,
                p_report_id: reportId ?? undefined,
                p_assessment_area_id: assessmentAreaId ?? undefined,
                p_uploaded_by: userId ?? undefined,
                p_ai_processed: false
              }
            );
            
            if (rpcError) {
              console.error('Error calling insert_image_record function:', rpcError);
            } else if (imageId) {
              console.log(`Successfully inserted image record with ID: ${imageId}`);
              
              // Directly trigger image analysis after successful upload
              try {
                console.log(`Triggering AI analysis for image: ${imageId}`);
                const { data: analysisData, error: analysisError } = await supabase.functions
                  .invoke("analyze-image-damage", {
                    body: { 
                      imageId: imageId,
                      imageUrl: imageUrl
                    }
                  });
                
                if (analysisError) {
                  console.error(`Error analyzing image ${imageId}:`, analysisError);
                } else {
                  console.log(`Analysis completed for image ${imageId}:`, analysisData);
                }
              } catch (analysisErr) {
                console.error(`Exception during image analysis for ${imageId}:`, analysisErr);
              }
            }
          } catch (dbError) {
            console.error('Exception during database operations:', dbError);
            // Continue with the upload even if database insertion fails
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
        // Provide more detailed error messaging
        let errorMessage = `${uploadedUrls.length} of ${uploadedUrls.length + failedUploads.length} files uploaded.`;
        if (failedUploads.length > 0) {
          errorMessage += ` Failed: ${failedUploads.join(', ')}`;
        }
        
        setMessage({
          text: errorMessage,
          type: 'error'
        });
        // Remove only successfully uploaded files
        const successIds = new Set(uploadedUrls.map(url => {
          const parts = url.split('/');
          const fileNameWithExt = parts[parts.length - 1];
          const fileIdPart = fileNameWithExt.split('-')[0];
          return fileIdPart;
        }));
        
        setFiles(prevFiles => prevFiles.filter(f => {
          const fileIdPart = f.id.split('-')[1];
          return !successIds.has(fileIdPart);
        }));
      }
      
      // Call the callback with URLs if provided
      if (onUploadComplete && uploadedUrls.length > 0) {
        console.log(`Upload complete, calling onUploadComplete with ${uploadedUrls.length} URLs`);
        onUploadComplete(uploadedUrls);
      }
    } catch (error: any) {
      console.error('Error in file upload process:', error);
      setMessage({
        text: `Upload failed: ${(error as Error).message || String(error)}`,
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
            
            {/* Show file thumbnails when files are selected, even in button mode */}
            {files.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-700 mb-1">{files.length} file(s) selected:</div>
                <div className="flex flex-wrap gap-2">
                  {files.map(file => (
                    <div key={file.id} className="relative w-16 h-16 border border-gray-200 rounded overflow-hidden">
                      <img 
                        src={file.previewUrl}
                        alt={file.file.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs rounded-bl"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(file.id);
                        }}
                        title="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  type="submit" 
                  className="mt-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : `Upload ${files.length} file(s)`}
                </button>
              </div>
            )}
            
            {message && (
              <div className={`p-2 mt-2 text-xs rounded-md border ${getMessageClass()}`}>
                <p>{message.text}</p>
              </div>
            )}
            
            {isUploading && !files.length && (
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