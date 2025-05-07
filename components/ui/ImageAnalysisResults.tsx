import React from 'react';

// Custom Badge component
const Badge: React.FC<{
  color: string;
  children: React.ReactNode;
}> = ({ color, children }) => {
  const getColorClasses = () => {
    switch (color) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failure':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${getColorClasses()}`}>
      {children}
    </span>
  );
};

interface ImageAnalysisResultsProps {
  isAnalyzed: boolean;
  damageDetected?: boolean;
  damageType?: string;
  severity?: string;
  confidence?: number;
  showDetails?: boolean;
}

const ImageAnalysisResults: React.FC<ImageAnalysisResultsProps> = ({
  isAnalyzed,
  damageDetected = false,
  damageType,
  severity,
  confidence = 0,
  showDetails = false,
}) => {
  if (!isAnalyzed) {
    return (
      <div className="p-3 bg-gray-100 rounded-md">
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
          <span className="text-sm font-medium text-gray-600">Not analyzed</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          This image has not been analyzed by our AI system.
        </p>
      </div>
    );
  }

  const confidenceFormatted = Math.round(confidence * 100);
  
  const getDamageColor = () => {
    if (!damageDetected) return 'success';
    
    if (severity === 'high') return 'failure';
    if (severity === 'medium') return 'warning';
    return 'info';
  };

  const getDamageDisplayName = () => {
    if (!damageDetected || !damageType) return 'No damage detected';
    
    if (damageType === 'roof') return 'Roof damage';
    if (damageType === 'siding') return 'Siding damage';
    if (damageType === 'structural') return 'Structural damage';
    if (damageType === 'water') return 'Water damage';
    if (damageType === 'fire') return 'Fire damage';
    if (damageType === 'hail') return 'Hail damage';
    
    return damageType.charAt(0).toUpperCase() + damageType.slice(1) + ' damage';
  };

  const getSeverityText = () => {
    if (!severity) return '';
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  };

  return (
    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color={getDamageColor()}>
          {getDamageDisplayName()}
        </Badge>
        
        {severity && (
          <Badge color={severity === 'high' ? 'failure' : severity === 'medium' ? 'warning' : 'info'}>
            {getSeverityText()} severity
          </Badge>
        )}
      </div>
      
      {showDetails && (
        <div className="mt-3">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs font-medium text-gray-600">Confidence:</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full">
              <div 
                className={`h-2 rounded-full ${
                  confidenceFormatted > 80 ? 'bg-green-500' : 
                  confidenceFormatted > 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${confidenceFormatted}%` }}
              ></div>
            </div>
            <span className="text-xs font-medium ml-1">{confidenceFormatted}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            AI-powered damage detection helps identify potential issues with your property.
            {!damageDetected && ' No damage was detected in this image.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageAnalysisResults;