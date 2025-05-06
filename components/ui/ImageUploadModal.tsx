import React, { useState, useEffect } from 'react';
import FileUpload from './FileUpload';
import { getPropertyImageAnalyses, getOrCreateGenericPropertyReport } from '../../services/imageAnalysisService';
import Button from './Button';
import { supabase } from '../../utils/supabaseClient';

interface ImageUploadModalProps {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  propertyId,
  isOpen,
  onClose,
  onUploadComplete
}) => {
  const [uploading, setUploading] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Get user ID
  useEffect(() => {
    const getUserId = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Store the auth user ID
          setAuthUserId(session.user.id);
          
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
      } catch (err) {
        console.error('Error getting user ID:', err);
      }
    };

    if (isOpen) {
      getUserId();
    }
  }, [isOpen]);

  // Get or create a generic report for this property
  useEffect(() => {
    const getReport = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const reportId = await getOrCreateGenericPropertyReport(propertyId);
        if (!reportId) {
          throw new Error('Unable to create or find a report for this property');
        }
        setReportId(reportId);
      } catch (err) {
        console.error('Error getting report for property:', err);
        setError('Failed to prepare upload. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && propertyId) {
      getReport();
    }
  }, [propertyId, isOpen]);

  const handleUploadComplete = (urls: string[]) => {
    console.log(`Upload completed with ${urls.length} images for property ${propertyId}`);
    
    // Refresh the property images after upload
    onUploadComplete();
    
    // Close the modal after a short delay to show success message
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop with click handler to close */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
        
        {/* Modal panel */}
        <div className="bg-white rounded-lg max-w-3xl w-full mx-auto shadow-xl overflow-hidden z-10">
          {/* Modal header */}
          <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900" id="modal-title">
              Upload Property Images
            </h3>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Modal body */}
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-t-blue-500 border-gray-200"></div>
                <p className="mt-2 text-gray-600">Preparing upload...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 rounded-md border border-red-200">
                <p className="text-red-700">{error}</p>
                <Button variant="outline" className="mt-3" onClick={onClose}>Close</Button>
              </div>
            ) : (
              <div className="p-2">
                <p className="mb-4 text-gray-600">
                  Upload new images of your property. Each image will be automatically analyzed 
                  for potential damage using our AI-powered detection system.
                </p>
                <FileUpload 
                  bucket="property-images"
                  storagePath={`${authUserId}/properties/${propertyId}`}
                  acceptedFileTypes="image/*"
                  maxFileSize={5}
                  multiple={true}
                  onUploadComplete={handleUploadComplete}
                  isPropertyUpload={true}
                  propertyId={propertyId}
                  dbUserId={userId}
                />
                <div className="mt-4 text-sm text-gray-500">
                  <p>Only new images will be automatically analyzed.</p>
                  <p>Supported formats: JPG, PNG, WebP (Max: 5MB per image)</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModal;