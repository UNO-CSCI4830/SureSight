import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { triggerImageAnalysis } from '../../services/imageAnalysisService';
import ImageAnalysisResults from './ImageAnalysisResults';
import Button from './Button';
import { supabase } from '../../utils/supabaseClient';

interface ReportImagesProps {
  reportId: string;
  areaId?: string;
  onDeleteImage?: (imageId: string) => void;
  readonly?: boolean;
}

interface ReportImage {
  id: string;
  storage_path: string;
  created_at: string;
  ai_processed: boolean;
  ai_damage_type: string | null;
  ai_damage_severity: string | null;
  ai_confidence: number | null;
  assessment_area_id: string | null;
  filename: string;
}

const ReportImages: React.FC<ReportImagesProps> = ({ 
  reportId, 
  areaId, 
  onDeleteImage,
  readonly = false 
}) => {
  const [images, setImages] = useState<ReportImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ReportImage | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [analyzingImageId, setAnalyzingImageId] = useState<string | null>(null);

  useEffect(() => {
    fetchImages();
  }, [reportId, areaId]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      
      // Build the query to fetch images
      let query = supabase
        .from('images')
        .select(`
          id,
          storage_path,
          created_at,
          ai_processed,
          ai_damage_type,
          ai_damage_severity,
          ai_confidence,
          assessment_area_id,
          filename
        `)
        .eq('report_id', reportId);
        
      // If area ID is provided, filter by that area
      if (areaId) {
        query = query.eq('assessment_area_id', areaId);
      } else {
        // If no area ID, get images not associated with any area (general images)
        query = query.is('assessment_area_id', null);
      }
      
      const { data: imageData, error: imageError } = await query;
        
      if (imageError) {
        throw imageError;
      }

      setImages(imageData || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching report images:', err);
      setError('Failed to load report images');
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (image: ReportImage) => {
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
  const getPublicImageUrl = (() => {
    // Create a cache to store previously processed URLs
    const urlCache = new Map<string, string>();
    
    return (storagePath: string) => {
      if (!storagePath) return '';
      
      // Check if we've already processed this path and have it in the cache
      if (urlCache.has(storagePath)) {
        return urlCache.get(storagePath) || '';
      }
      
      // If the path already contains the full URL, return it directly
      if (storagePath.startsWith('http')) {
        urlCache.set(storagePath, storagePath);
        return storagePath;
      }
      
      // Extract bucket and path from storage_path
      const firstSlashIndex = storagePath.indexOf('/');
      
      // If no slash found, use as-is with the reports bucket
      if (firstSlashIndex === -1) {
        const url = supabase.storage.from('reports').getPublicUrl(storagePath).data?.publicUrl || '';
        urlCache.set(storagePath, url);
        return url;
      }
      
      // Extract bucket name and remaining path
      const bucketName = storagePath.substring(0, firstSlashIndex);
      const filePath = storagePath.substring(firstSlashIndex + 1);
      
      // Get public URL using the correct bucket and path
      const publicUrl = supabase.storage.from(bucketName).getPublicUrl(filePath).data?.publicUrl || '';
      
      // Store URL in cache for future reference
      urlCache.set(storagePath, publicUrl);
      
      return publicUrl;
    };
  })();
  
  // Function to handle image deletion
  const handleDeleteImage = async (imageId: string) => {
    if (readonly || !onDeleteImage) return;
    
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }
    
    try {
      setDeletingImageId(imageId);
      
      // Call the parent's delete handler
      await onDeleteImage(imageId);
      
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

  // Function to handle AI analysis
  const handleAnalyzeImage = async (imageId: string) => {
    try {
      setAnalyzingImageId(imageId);
      
      // Call the analysis service
      const result = await triggerImageAnalysis(imageId);
      
      if (result.success) {
        // Refresh images to show updated analysis results
        await fetchImages();
        alert('Analysis complete!');
      } else {
        alert(`Analysis failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error analyzing image:', err);
      alert('Failed to analyze image. Please try again.');
    } finally {
      setAnalyzingImageId(null);
    }
  };

  const formatDamageTypeName = (type: string | null) => {
    if (!type) return 'Unknown';
    
    switch (type) {
      case 'roof':
        return 'Roof Damage';
      case 'siding':
        return 'Siding Damage';
      case 'window':
        return 'Window Damage';
      case 'structural':
        return 'Structural Damage';
      case 'water':
        return 'Water Damage';
      case 'other':
        return 'Other Damage';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading images...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  if (images.length === 0) {
    return <div className="text-center p-4">No images found.</div>;
  }

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Report Images</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image) => (
          <div key={image.id} className="bg-white border border-gray-200 rounded-lg shadow overflow-hidden dark:bg-gray-800 dark:border-gray-700">
            <div className="relative h-48 w-full cursor-pointer" onClick={() => handleImageClick(image)}>
              <Image
                src={getPublicImageUrl(image.storage_path)}
                alt="Report image"
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
                  {!readonly && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="mt-2 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyzeImage(image.id);
                      }}
                      disabled={analyzingImageId === image.id}
                    >
                      {analyzingImageId === image.id ? "Analyzing..." : "Analyze with AI"}
                    </Button>
                  )}
                </div>
              )}
              
              <div className="flex justify-between mt-3">
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => handleImageClick(image)}
                >
                  View Details
                </Button>
                
                {!readonly && onDeleteImage && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(image.id);
                    }}
                    disabled={deletingImageId === image.id}
                    className={deletingImageId === image.id ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    {deletingImageId === image.id ? "Deleting..." : "Delete"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Image Modal */}
      {showModal && selectedImage && (
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
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="relative h-96 w-full">
                      <Image
                        src={getPublicImageUrl(selectedImage.storage_path)}
                        alt="Report image"
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
                      <div>
                        <ImageAnalysisResults
                          isAnalyzed={true}
                          damageDetected={Boolean(selectedImage.ai_damage_type && selectedImage.ai_damage_type !== 'other')}
                          damageType={selectedImage.ai_damage_type || undefined}
                          severity={selectedImage.ai_damage_severity || undefined}
                          confidence={selectedImage.ai_confidence || 0}
                          showDetails={true}
                        />
                        
                        {!readonly && (
                          <Button 
                            size="sm"
                            variant="outline"
                            className="mt-4"
                            onClick={() => handleAnalyzeImage(selectedImage.id)}
                            disabled={analyzingImageId === selectedImage.id}
                          >
                            {analyzingImageId === selectedImage.id ? "Analyzing..." : "Re-analyze Image"}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-700">
                            This image has not been analyzed by our AI system yet.
                          </p>
                        </div>
                        
                        {!readonly && (
                          <Button 
                            variant="primary"
                            className="mt-4"
                            onClick={() => handleAnalyzeImage(selectedImage.id)}
                            disabled={analyzingImageId === selectedImage.id}
                          >
                            {analyzingImageId === selectedImage.id ? "Analyzing..." : "Analyze with AI"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Modal footer */}
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between">
                {!readonly && onDeleteImage && (
                  <Button 
                    variant="danger"
                    disabled={deletingImageId === selectedImage.id}
                    onClick={() => handleDeleteImage(selectedImage.id)}
                  >
                    {deletingImageId === selectedImage.id ? "Deleting..." : "Delete Image"}
                  </Button>
                )}
                
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

export default ReportImages;