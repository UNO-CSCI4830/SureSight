import React, { useState, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';

interface FileUploadProps {
  bucket: string;
  onUploadComplete?: (urls: string[]) => void;
  acceptedFileTypes?: string;
  storagePath?: string;
  maxFileSize?: number; // in MB
  multiple?: boolean; // Allow multiple file selection
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
}) => {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [message, setMessage] = useState<{text: string; type: 'success' | 'error' | 'info'} | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      for (const filePreview of files) {
        const file = filePreview.file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${storagePath}${storagePath ? '/' : ''}${Date.now()}-${filePreview.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file);
        
        if (uploadError) {
          failedUploads.push(file.name);
          continue;
        }
        
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);
        
        const imageUrl = publicUrlData?.publicUrl;
        
        if (!imageUrl) {
          failedUploads.push(file.name);
          continue;
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
        onUploadComplete(uploadedUrls);
      }
    } catch (error: any) {
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
      <form onSubmit={handleUpload} className="space-y-6">
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
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          
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
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
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
          <button
            type="submit"
            className={`btn-primary ${files.length === 0 || isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={files.length === 0 || isUploading}
          >
            {isUploading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </span>
            ) : (
              'Upload'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FileUpload;