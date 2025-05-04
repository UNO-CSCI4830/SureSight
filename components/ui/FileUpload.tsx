import React, { useState, useRef, FormEvent } from 'react';
import { supabase } from '../../utils/supabaseClient';

interface FileUploadProps {
  bucket: string;
  onUploadComplete?: (urls: string[]) => void;
  acceptedFileTypes?: string;
  multiple?: boolean;
  maxFileSize?: number; // in MB
  className?: string;
  storagePath?: string; // Added for custom storage path
  buttonLabel?: string; // Added for custom button label
  buttonClassName?: string; // Added for custom button styling
}

interface FileWithPreview {
  file: File;
  previewUrl: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  bucket,
  onUploadComplete,
  acceptedFileTypes = 'image/*',
  multiple = true,
  maxFileSize = 5, // Default 5MB
  className = '',
  storagePath = '', // Default to empty string (root of bucket)
  buttonLabel,
  buttonClassName,
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'info' | 'success' | 'error' } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFiles(event.target.files);
    }
  };

  const handleFiles = (fileList: FileList) => {
    const filesArray = Array.from(fileList);
    let errorOccurred = false;
    
    // Filter files by size
    const validFiles = filesArray.filter((file) => {
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB > maxFileSize) {
        errorOccurred = true;
        return false;
      }
      return true;
    });

    if (errorOccurred) {
      setMessage({ 
        text: `Some files were too large (maximum size is ${maxFileSize}MB)`, 
        type: 'error' 
      });
    }

    const newFiles = validFiles.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    setFiles(prevFiles => [...prevFiles, ...newFiles]);
    // Clear any success/info messages when new files are added
    if (message?.type === 'success' || message?.type === 'info') {
      setMessage(null);
    }
  };

  const removeFile = (fileToRemove: FileWithPreview) => {
    setFiles(files.filter(f => f !== fileToRemove));
    URL.revokeObjectURL(fileToRemove.previewUrl);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const uploadFiles = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    
    if (files.length === 0) {
      setMessage({ text: 'Please select at least one file to upload', type: 'info' });
      return;
    }

    setUploading(true);
    setMessage(null);

    const uploadedUrls: string[] = [];
    let successCount = 0;
    let errorMessages: string[] = [];

    try {
      for (const fileObj of files) {
        const file = fileObj.file;
        // If storagePath provided, ensure it has a trailing slash
        const path = storagePath ? (storagePath.endsWith('/') ? storagePath : `${storagePath}/`) : '';
        const filePath = `${path}${Date.now()}-${file.name}`;
        
        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);
        
        if (error) {
          errorMessages.push(error.message);
          continue;
        }

        const { data } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
          
        if (data?.publicUrl) {
          uploadedUrls.push(data.publicUrl);
          successCount++;
        }
      }

      if (successCount > 0) {
        setMessage({ 
          text: `${successCount} file(s) uploaded successfully!${errorMessages.length > 0 ? ' Some files failed.' : ''}`, 
          type: 'success' 
        });
        
        // Clear files after successful upload
        files.forEach(f => URL.revokeObjectURL(f.previewUrl));
        setFiles([]);
        
        if (onUploadComplete) {
          onUploadComplete(uploadedUrls);
        }
      } else {
        setMessage({ 
          text: `0 file(s) uploaded. Failed: ${errorMessages.join(', ')}`, 
          type: 'error' 
        });
      }
    } catch (error) {
      setMessage({ 
        text: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        type: 'error' 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`file-upload ${className}`}>
      <form onSubmit={uploadFiles}>
        <div
          className={`border-2 border-dashed rounded-lg p-6 cursor-pointer ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          aria-label="file upload area"
        >
          <div className="flex flex-col items-center">
            <svg
              className="w-10 h-10 mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mb-2 text-sm font-medium text-gray-700">
              {`Drag & drop ${multiple ? 'multiple files' : 'a file'} here`}
            </p>
            <p className="text-xs text-gray-500">
              {acceptedFileTypes} (Max: {maxFileSize}MB)
            </p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept={acceptedFileTypes}
            multiple={multiple}
            title="Upload your files here"
          />
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Selected Files ({files.length})</h3>
            <ul className="space-y-2">
              {files.map((fileObj, index) => (
                <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <img
                      src={fileObj.previewUrl}
                      alt="Preview"
                      className="w-10 h-10 object-cover rounded mr-2"
                    />
                    <span className="text-sm truncate max-w-xs">{fileObj.file.name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({(fileObj.file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(fileObj)}
                    className="text-red-500 hover:text-red-700"
                    aria-label={`Remove ${fileObj.file.name}`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {message && (
          <div
            className={`mt-4 p-3 rounded ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : message.type === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={files.length === 0 || uploading}
          className={`mt-4 px-4 py-2 ${buttonClassName || 'bg-primary-500 text-white'} rounded w-full ${
            files.length === 0 || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600'
          }`}
          data-testid="upload-button"
        >
          {uploading ? 'Uploading...' : buttonLabel || 'Upload Files'}
        </button>
      </form>
    </div>
  );
};

export default FileUpload;