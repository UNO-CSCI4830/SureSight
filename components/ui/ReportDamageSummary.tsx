import React, { useEffect, useState } from 'react';
import { DamageAssessmentService } from '../../utils/damageAssessmentService';

// Chart.js dependencies
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale);

interface ReportDamageSummaryProps {
  reportId: string;
}

const ReportDamageSummary: React.FC<ReportDamageSummaryProps> = ({ reportId }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch the summary data
        const summaryData = await DamageAssessmentService.getReportDamageSummary(reportId);
        setSummary(summaryData);
        
        // Fetch the images with analysis
        const imagesData = await DamageAssessmentService.getReportImagesWithAnalysis(reportId);
        setImages(imagesData);
      } catch (error) {
        console.error('Error fetching damage summary:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (reportId) {
      fetchData();
    }
  }, [reportId]);

  if (loading) {
    return (
      <div className="flex justify-center my-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Damage Assessment Summary</h2>
        </div>
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-300">No damage assessment data is available for this report.</p>
        </div>
      </div>
    );
  }

  // Prepare chart data for damage severity distribution
  const severityChartData = {
    labels: ['None', 'Minor', 'Moderate', 'Severe'],
    datasets: [
      {
        data: [
          summary.severityCount.none || 0,
          summary.severityCount.minor || 0,
          summary.severityCount.moderate || 0,
          summary.severityCount.severe || 0,
        ],
        backgroundColor: [
          '#10B981', // green-500 (success)
          '#60A5FA', // blue-400 (info)
          '#F59E0B', // amber-500 (warning)
          '#EF4444', // red-500 (error)
        ],
        borderColor: [
          '#059669', // green-600 (success darker)
          '#3B82F6', // blue-500 (info darker)
          '#D97706', // amber-600 (warning darker)
          '#DC2626', // red-600 (error darker)
        ],
        borderWidth: 1,
      },
    ],
  };

  // Helper functions
  const getSeverityColor = (severity: string): string => {
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
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

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Damage Assessment Summary</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Based on {summary.totalImagesAnalyzed} analyzed images</p>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overall Status */}
          <div className="col-span-1 md:col-span-2">
            <div className={`p-4 rounded-md flex items-center ${summary.hasDamage ? getSeverityColor(summary.mostSevereDamage) : 'bg-green-100 text-green-700'}`}>
              {summary.hasDamage ? getSeverityIcon(summary.mostSevereDamage) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <h3 className="text-lg font-medium ml-2">
                {summary.hasDamage ? 
                  `Damage Detected - ${summary.mostSevereDamage.charAt(0).toUpperCase() + summary.mostSevereDamage.slice(1)} Severity` : 
                  'No Damage Detected'}
              </h3>
            </div>
          </div>

          {/* Charts Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Damage Severity Distribution</h3>
            <div className="h-48">
              <Doughnut 
                data={severityChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Common Issues */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Common Issues Found</h3>
            
            {summary.commonDamageTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {summary.commonDamageTypes.map((type: string, index: number) => (
                  <span 
                    key={index}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm 
                    ${index === 0 ? 'bg-red-100 text-red-800 border border-red-200' : 
                      index === 1 ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                      'bg-gray-100 text-gray-800 border border-gray-200'}`}
                  >
                    {capitalizeWords(type)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No damage types identified.</p>
            )}

            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Affected Areas</h3>
            {summary.commonAffectedAreas.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {summary.commonAffectedAreas.map((area: string, index: number) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800 border border-primary-200"
                  >
                    {capitalizeWords(area)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No specific areas identified.</p>
            )}
          </div>

          {/* Image Analysis List */}
          <div className="col-span-1 md:col-span-2">
            <hr className="my-4 border-gray-200 dark:border-gray-700" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
              Image Analysis Details
            </h3>
            
            <ul className="space-y-2">
              {images.map((image: any) => {
                const imageAnalysis = image.image_analysis && image.image_analysis.length > 0 
                  ? image.image_analysis[0] 
                  : null;

                return (
                  <li
                    key={image.id}
                    className={`p-3 rounded-md border 
                      ${imageAnalysis?.damage_detected 
                        ? imageAnalysis.damage_severity === 'severe' 
                          ? 'bg-red-50 border-red-200' 
                          : imageAnalysis.damage_severity === 'moderate'
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-blue-50 border-blue-200'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                  >
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-1 mr-3 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {image.filename || 'Image'}
                          </p>
                          {imageAnalysis?.damage_detected && (
                            <div className="flex gap-1">
                              {imageAnalysis.damage_types?.slice(0, 2).map((type: string, index: number) => (
                                <span 
                                  key={index}
                                  className={`text-xs px-2 py-1 rounded-full
                                    ${imageAnalysis.damage_severity === 'severe' ? 'bg-red-100 text-red-800 border border-red-200' : 
                                      imageAnalysis.damage_severity === 'moderate' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                                      'bg-blue-100 text-blue-800 border border-blue-200'}`}
                                >
                                  {capitalizeWords(type)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {imageAnalysis ? 
                            `${imageAnalysis.damage_detected ? 
                              `Damage Detected: ${capitalizeWords(imageAnalysis.damage_severity)} severity` : 
                              'No Damage Detected'} | ${formatDate(imageAnalysis.analyzed_at)}` : 
                            'Not analyzed'}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            
            {images.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400">
                No images have been analyzed for this report.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to capitalize words
function capitalizeWords(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1));
}

// Helper function to format dates
function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

export default ReportDamageSummary;