import React from 'react';

// Types
interface DamageAssessmentProps {
  analysis: {
    damage_detected: boolean;
    damage_types: string[];
    damage_severity: 'none' | 'minor' | 'moderate' | 'severe';
    affected_areas: string[];
    confidence: number;
    analyzed_at?: string;
  };
  isLoading?: boolean;
}

const DamageAssessment: React.FC<DamageAssessmentProps> = ({ analysis, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm mb-6 mt-4 bg-white dark:bg-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Analyzing Damage...</h2>
        </div>
        <div className="p-6">
          <div className="w-full">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
              <div className="bg-primary-600 h-2.5 rounded-full animate-pulse w-3/4"></div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Our AI is analyzing the image for damage...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If no analysis is available
  if (!analysis) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm mb-6 mt-4 bg-white dark:bg-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">No Damage Assessment Available</h2>
        </div>
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-300">
            This image hasn't been analyzed yet. Upload the image to generate a damage assessment.
          </p>
        </div>
      </div>
    );
  }

  // Helper functions
  const getSeverityColorClass = (severity: string): string => {
    switch (severity) {
      case 'severe':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'moderate':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'minor':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-green-100 text-green-700 border-green-200';
    }
  };
  
  const getSeverityTextColor = (severity: string): string => {
    switch (severity) {
      case 'severe':
        return 'text-red-600';
      case 'moderate':
        return 'text-amber-600';
      case 'minor':
        return 'text-blue-600';
      default:
        return 'text-green-600';
    }
  };

  const getSeverityBgColor = (severity: string): string => {
    switch (severity) {
      case 'severe':
        return 'bg-red-600';
      case 'moderate':
        return 'bg-amber-600';
      case 'minor':
        return 'bg-blue-600';
      default:
        return 'bg-green-600';
    }
  };

  // Get icon based on damage detection
  const getDamageIcon = () => {
    if (!analysis.damage_detected) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    
    switch (analysis.damage_severity) {
      case 'severe':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'moderate':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'minor':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm mb-6 mt-4 bg-white dark:bg-gray-800">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
        <span className="mr-3">{getDamageIcon()}</span>
        <div>
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mr-2">
              Damage Assessment
            </h2>
            <span className={`px-2 py-1 text-xs font-bold rounded ${getSeverityColorClass(analysis.damage_severity)}`}>
              {analysis.damage_severity.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Analyzed on {formatDate(analysis.analyzed_at)}</p>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col gap-6">
          {/* Damage Status */}
          <div>
            <p className="text-gray-800 dark:text-gray-200 mb-2 font-medium">
              <strong>Status:</strong> {analysis.damage_detected ? 'Damage Detected' : 'No Damage Detected'}
            </p>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
              <div 
                className={`h-2.5 rounded-full ${getSeverityBgColor(analysis.damage_severity)}`}
                style={{ width: `${analysis.confidence * 100}%` }}
              ></div>
            </div>
            
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Confidence: {Math.round(analysis.confidence * 100)}%
            </p>
          </div>

          {/* Damage Details Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Damage Types if damage detected */}
            {analysis.damage_detected && analysis.damage_types.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white mb-2">
                  <strong>Damage Types:</strong>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.damage_types.map((type, index) => (
                    <span 
                      key={index} 
                      className={`px-3 py-1 text-sm rounded-full border ${getSeverityColorClass(analysis.damage_severity)}`}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Affected Areas if any */}
            {analysis.affected_areas.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white mb-2">
                  <strong>Affected Areas:</strong>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.affected_areas.map((area, index) => (
                    <span 
                      key={index} 
                      className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DamageAssessment;