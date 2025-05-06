import React, { useState } from 'react';
import { triggerImageAnalysis, checkImageAnalysisStatus } from '../../services/imageAnalysisService';
import Button from './Button';
import ImageAnalysisResults from './ImageAnalysisResults';

interface ManualImageAnalyzerProps {
  imageId: string;
  onAnalysisComplete?: (results: any) => void;
  className?: string;
}

/**
 * Component for manually triggering AI analysis on any image
 * Used as a workaround when automatic analysis via the database trigger fails
 */
const ManualImageAnalyzer: React.FC<ManualImageAnalyzerProps> = ({ 
  imageId, 
  onAnalysisComplete,
  className = '' 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  const startAnalysis = async () => {
    if (!imageId) {
      setError('No image ID provided');
      return;
    }
    
    try {
      setIsAnalyzing(true);
      setError(null);
      
      // Call our service to manually trigger analysis
      const result = await triggerImageAnalysis(imageId);
      
      if (result.success) {
        setAnalysisResults(result);
        
        if (onAnalysisComplete) {
          onAnalysisComplete(result);
        }
      } else {
        setError(result.error || 'Analysis failed with no specific error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={`p-4 border rounded-md ${className}`}>
      <h3 className="text-lg font-medium mb-2">AI Analysis</h3>
      
      {error && (
        <div className="p-3 mb-3 bg-red-50 border border-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {analysisResults ? (
        <div className="mb-3">
          <ImageAnalysisResults 
            isAnalyzed={true}
            damageDetected={analysisResults.damage_detected}
            damageType={analysisResults.damage_type}
            severity={analysisResults.severity}
            confidence={analysisResults.confidence}
            showDetails={true}
          />
          
          <div className="mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => startAnalysis()}
              isLoading={isAnalyzing}
              loadingText="Analyzing..."
            >
              Re-analyze Image
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Manually trigger AI analysis for this image to detect potential damage.
          </p>
          
          <Button 
            onClick={startAnalysis} 
            isLoading={isAnalyzing} 
            loadingText="Analyzing..."
          >
            Start Analysis
          </Button>
        </div>
      )}
    </div>
  );
};

export default ManualImageAnalyzer;