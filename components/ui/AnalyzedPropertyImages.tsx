import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getPropertyImageAnalyses, deletePropertyImage } from '../../services/imageAnalysisService';
import ImageAnalysisResults from './ImageAnalysisResults';
import Button from './Button';
import { supabase } from '../../utils/supabaseClient';

interface AnalyzedPropertyImagesProps {
  propertyId: string;
}

interface PropertyImage {
  id: string;
  storage_path: string;
  created_at: string;
  ai_processed: boolean;
  ai_damage_type: string | null;
  ai_damage_severity: string | null;
  ai_confidence: number | null;
}

interface SelectQueryError {
  error: true;
}

const AnalyzedPropertyImages: React.FC<AnalyzedPropertyImagesProps> = ({ propertyId }) => {
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<PropertyImage | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const propertyImages = await getPropertyImageAnalyses(propertyId);
        // Ensure returned data matches the PropertyImage type
        const validImages: PropertyImage[] = Array.isArray(propertyImages) 
          ? propertyImages.filter((img): img is PropertyImage => 
              typeof img === 'object' && img !== null &&
              !('error' in img) && 
              'id' in img && 'storage_path' in img && 'created_at' in img && 'ai_processed' in img)
          : [];
        setImages(validImages);
        setError(null);
      } catch (err) {
        console.error('Error fetching property images:', err);
        setError('Failed to load property images');
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchImages();
    }
  }, [propertyId]);

  const handleImageClick = (image: PropertyImage) => {
    setSelectedImage(image);
    setShowModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Function to get the public URL for an image
  const getPublicImageUrl = (storagePath: string) => {
    if (!storagePath) return '';
    
    // Handle the case where the bucket name is "property-images"
    const bucket = 'property-images';
    
    // Extract the file path correctly, handling the duplicate "property-images/" prefix if present
    let filePath = storagePath;
    
    // If storagePath starts with the bucket name, remove it to prevent duplication
    if (storagePath.startsWith(`${bucket}/`)) {
      filePath = storagePath.substring(bucket.length + 1); // +1 for the slash
    }
    
    // Get public URL using Supabase client
    try {
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return data?.publicUrl || '';
    } catch (err) {
      console.error('Error getting public URL:', err);
      return '';
    }
  };
  
  // Function to handle image deletion
  const handleDeleteImage = async (imageId: string, storagePath: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }
    
    try {
      setDeletingImageId(imageId);
      
      // Call the service to delete the image
      await deletePropertyImage(imageId, storagePath);
      
      // Remove the image from the local state
      setImages(prevImages => prevImages.filter(img => img.id !== imageId));
      
      // If the deleted image was selected, close the modal
      if (selectedImage?.id === imageId) {
        setShowModal(false);
        setSelectedImage(null);
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      alert('Failed to delete image. Please try again.');
    } finally {
      setDeletingImageId(null);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading property images...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  if (images.length === 0) {
    return <div className="text-center p-4">No images found for this property.</div>;
  }

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Property Images</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image) => (
          <div key={image.id} className="bg-white border border-gray-200 rounded-lg shadow overflow-hidden dark:bg-gray-800 dark:border-gray-700">
            <div className="relative h-48 w-full cursor-pointer" onClick={() => handleImageClick(image)}>
              <Image
                src={getPublicImageUrl(image.storage_path)}
                alt="Property image"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                style={{ objectFit: "cover" }}
              />
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm text-gray-500">
                  {formatDate(image.created_at)}
                </span>
              </div>
              
              {image.ai_processed ? (
                <div className="mt-2">
                  <ImageAnalysisResults
                    isAnalyzed={true}
                    damageDetected={Boolean(image.ai_damage_type && image.ai_damage_type !== 'other')}
                    damageType={image.ai_damage_type || undefined}
                    severity={image.ai_damage_severity || undefined}
                    confidence={image.ai_confidence || 0}
                    showDetails={false}
                  />
                </div>
              ) : (
                <div className="mt-2">
                  <ImageAnalysisResults isAnalyzed={false} />
                </div>
              )}
              
              <div className="flex justify-between mt-2">
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => handleImageClick(image)}
                >
                  View Details
                </Button>
                
                <Button
                  size="sm"
                  variant="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(image.id, image.storage_path);
                  }}
                  disabled={deletingImageId === image.id}
                  className={deletingImageId === image.id ? "opacity-50 cursor-not-allowed" : ""}
                >
                  {deletingImageId === image.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Custom Modal (replacing Flowbite Modal) */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Backdrop with click handler to close */}
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowModal(false)}></div>
            
            {/* Modal panel */}
            <div className="bg-white rounded-lg max-w-5xl w-full mx-auto shadow-xl overflow-hidden z-10">
              {/* Modal header */}
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900" id="modal-title">
                  Image Details
                </h3>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={() => setShowModal(false)}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Modal body */}
              <div className="p-6">
                {selectedImage && (
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="relative h-96 w-full">
                        <Image
                          src={getPublicImageUrl(selectedImage.storage_path)}
                          alt="Property image"
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          style={{ objectFit: "contain" }}
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Uploaded on {formatDate(selectedImage.created_at)}
                      </p>
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="text-lg font-medium mb-4">Analysis Results</h4>
                      {selectedImage.ai_processed ? (
                        <ImageAnalysisResults
                          isAnalyzed={true}
                          damageDetected={Boolean(selectedImage.ai_damage_type && selectedImage.ai_damage_type !== 'other')}
                          damageType={selectedImage.ai_damage_type || undefined}
                          severity={selectedImage.ai_damage_severity || undefined}
                          confidence={selectedImage.ai_confidence || 0}
                          showDetails={true}
                        />
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-4 dark:bg-gray-800">
                          <p className="text-sm text-gray-700 dark:text-gray-400">
                            This image has not been analyzed by our AI system yet. 
                            Only newly uploaded images are automatically analyzed.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Modal footer with added delete button */}
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between">
                <Button 
                  variant="danger"
                  disabled={!!selectedImage && deletingImageId === selectedImage.id}
                  className={selectedImage && deletingImageId === selectedImage.id ? "opacity-50 cursor-not-allowed" : ""}
                  onClick={() => selectedImage && handleDeleteImage(selectedImage.id, selectedImage.storage_path)}
                >
                  {selectedImage && deletingImageId === selectedImage.id ? "Deleting..." : "Delete Image"}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyzedPropertyImages;