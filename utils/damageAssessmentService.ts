import { supabase } from './supabaseClient';

export interface DamageAnalysisResult {
  damageDetected: boolean;
  damageType: string[];
  severity: 'none' | 'minor' | 'moderate' | 'severe';
  affectedAreas: string[];
  confidenceScore: number;
  rawData?: any;
}

export interface DamageAnalysisDBRecord {
  id: string;
  image_id: string;
  property_id: string;
  report_id: string;
  assessment_area_id?: string;
  damage_detected: boolean;
  damage_types: string[];
  damage_severity: 'none' | 'minor' | 'moderate' | 'severe';
  affected_areas: string[];
  confidence: number;
  raw_results?: any;
  analyzed_at: string;
  created_at: string;
}

/**
 * Interface for image analysis data
 */
interface ImageAnalysisData {
  image_id: string;
  report_id?: string;
  assessment_area_id?: string;
  damage_detected: boolean;
  damage_types?: string[];
  damage_severity?: string;
  affected_areas?: string[];
  confidence?: number;
  raw_results?: any;
}

/**
 * Saves image analysis data to the database
 * 
 * @param analysisData - The analysis data to save
 * @returns A promise resolving to success/failure with data or error
 */
export const saveImageAnalysisData = async (analysisData: ImageAnalysisData): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('image_analysis')
      .insert(analysisData)
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    return {
      success: true,
      data
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to save image analysis data';
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Retrieves all image analysis results for a given report
 * 
 * @param reportId - The ID of the report to get analysis results for
 * @returns A promise resolving to success/failure with data or error
 */
export const getImageAnalysisForReport = async (reportId: string): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('image_analysis')
      .select('*, images(filename, storage_path)')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return {
      success: true,
      data
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to retrieve image analysis results';
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Updates an existing image analysis record
 * 
 * @param analysisId - The ID of the analysis record to update
 * @param updateData - The data to update
 * @returns A promise resolving to success/failure with data or error
 */
export const updateImageAnalysis = async (
  analysisId: string,
  updateData: Partial<ImageAnalysisData>
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('image_analysis')
      .update(updateData)
      .eq('id', analysisId);

    if (error) throw new Error(error.message);

    return {
      success: true,
      data
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to update image analysis';
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Deletes an image analysis record
 * 
 * @param analysisId - The ID of the analysis record to delete
 * @returns A promise resolving to success/failure with error if applicable
 */
export const deleteImageAnalysis = async (analysisId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const { error } = await supabase
      .from('image_analysis')
      .delete()
      .eq('id', analysisId);

    if (error) throw new Error(error.message);

    return {
      success: true
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to delete image analysis';
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Gets aggregate damage statistics for a report
 * 
 * @param reportId - The ID of the report to get statistics for
 * @returns A promise resolving to success/failure with statistics or error
 */
export const getReportDamageStatistics = async (reportId: string): Promise<{
  success: boolean;
  data?: {
    totalImages: number;
    imagesWithDamage: number;
    damagePercentage: number;
    severityCounts: Record<string, number>;
    averageConfidence: number;
    mostCommonDamageType: string;
  };
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('image_analysis')
      .select('damage_detected, damage_severity, damage_types, confidence')
      .eq('report_id', reportId);

    if (error) throw new Error(error.message);

    // Calculate statistics
    const totalImages = data.length;
    const imagesWithDamage = data.filter(item => item.damage_detected).length;
    
    // Get severity counts
    const severityCounts: Record<string, number> = {};
    data.forEach(item => {
      if (item.damage_severity) {
        severityCounts[item.damage_severity] = (severityCounts[item.damage_severity] || 0) + 1;
      }
    });
    
    // Calculate average confidence for damaged images
    const confidenceValues = data
      .filter(item => item.damage_detected && item.confidence)
      .map(item => item.confidence);
    
    const averageConfidence = confidenceValues.length > 0
      ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length
      : 0;
    
    // Find most common damage type
    const damageTypeCounts: Record<string, number> = {};
    data.forEach(item => {
      if (item.damage_types && Array.isArray(item.damage_types)) {
        item.damage_types.forEach(type => {
          damageTypeCounts[type] = (damageTypeCounts[type] || 0) + 1;
        });
      }
    });
    
    const mostCommonDamageType = Object.entries(damageTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])[0] || 'none';

    return {
      success: true,
      data: {
        totalImages,
        imagesWithDamage,
        damagePercentage: totalImages > 0 ? (imagesWithDamage / totalImages) * 100 : 0,
        severityCounts,
        averageConfidence,
        mostCommonDamageType
      }
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to retrieve damage statistics';
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Service for managing damage assessments and integrating with the AI analysis
 */
export const DamageAssessmentService = {
  /**
   * Request an AI analysis for an image
   */
  async analyzeImage(
    imageUrl: string, 
    imageId: string, 
    propertyId?: string, 
    reportId?: string, 
    assessmentAreaId?: string
  ): Promise<DamageAnalysisResult | null> {
    try {
      // Call the Supabase Edge Function that performs AI analysis
      const { data, error } = await supabase.functions.invoke('analyze-image-damage', {
        body: { 
          imageUrl, 
          imageId, 
          propertyId, 
          reportId, 
          assessmentAreaId 
        }
      });

      if (error) {
        console.error('Error analyzing image:', error);
        return null;
      }

      return data as DamageAnalysisResult;
    } catch (error) {
      console.error('Error in analyzeImage:', error);
      return null;
    }
  },

  /**
   * Get the damage assessment for a specific image
   */
  async getImageAnalysis(imageId: string): Promise<DamageAnalysisDBRecord | null> {
    try {
      const { data, error } = await supabase
        .from('image_analysis')
        .select('*')
        .eq('image_id', imageId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching image analysis:', error);
        return null;
      }

      return data as DamageAnalysisDBRecord;
    } catch (error) {
      console.error('Error in getImageAnalysis:', error);
      return null;
    }
  },

  /**
   * Get all damage assessments for a report
   */
  async getReportAnalyses(reportId: string): Promise<DamageAnalysisDBRecord[]> {
    try {
      const { data, error } = await supabase
        .from('image_analysis')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching report analyses:', error);
        return [];
      }

      return data as DamageAnalysisDBRecord[];
    } catch (error) {
      console.error('Error in getReportAnalyses:', error);
      return [];
    }
  },

  /**
   * Get all damage assessments for a property
   */
  async getPropertyAnalyses(propertyId: string): Promise<DamageAnalysisDBRecord[]> {
    try {
      const { data, error } = await supabase
        .from('image_analysis')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching property analyses:', error);
        return [];
      }

      return data as DamageAnalysisDBRecord[];
    } catch (error) {
      console.error('Error in getPropertyAnalyses:', error);
      return [];
    }
  },

  /**
   * Get all damage assessments for an assessment area
   */
  async getAssessmentAreaAnalyses(assessmentAreaId: string): Promise<DamageAnalysisDBRecord[]> {
    try {
      const { data, error } = await supabase
        .from('image_analysis')
        .select('*')
        .eq('assessment_area_id', assessmentAreaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching assessment area analyses:', error);
        return [];
      }

      return data as DamageAnalysisDBRecord[];
    } catch (error) {
      console.error('Error in getAssessmentAreaAnalyses:', error);
      return [];
    }
  },

  /**
   * Get a summary of damage for a report
   */
  async getReportDamageSummary(reportId: string): Promise<{
    hasDamage: boolean;
    severityCount: Record<string, number>;
    mostSevereDamage: 'none' | 'minor' | 'moderate' | 'severe';
    commonDamageTypes: string[];
    commonAffectedAreas: string[];
    totalImagesAnalyzed: number;
    assessmentAreaBreakdown: Record<string, {
      damageDetected: boolean;
      severity: string;
      damageTypes: string[];
      confidence: number;
    }>;
  }> {
    try {
      // Get all analyses for the report
      const analyses = await this.getReportAnalyses(reportId);
      
      if (!analyses.length) {
        return {
          hasDamage: false,
          severityCount: { none: 0, minor: 0, moderate: 0, severe: 0 },
          mostSevereDamage: 'none',
          commonDamageTypes: [],
          commonAffectedAreas: [],
          totalImagesAnalyzed: 0,
          assessmentAreaBreakdown: {}
        };
      }

      // Initialize counters
      const severityCount: Record<string, number> = { 
        none: 0, minor: 0, moderate: 0, severe: 0 
      };

      // Track all damage types and affected areas
      const damageTypeMap: Record<string, number> = {};
      const affectedAreaMap: Record<string, number> = {};
      
      // Track assessment area breakdowns
      const assessmentAreaBreakdown: Record<string, {
        damageDetected: boolean;
        severity: string;
        damageTypes: string[];
        confidence: number;
      }> = {};
      
      // Process each analysis
      let hasDamage = false;
      
      analyses.forEach(analysis => {
        // Count severity levels
        const severity = analysis.damage_severity || 'none';
        severityCount[severity] = (severityCount[severity] || 0) + 1;
        
        // Check if any damage is detected
        if (analysis.damage_detected) {
          hasDamage = true;
          
          // Count damage types
          analysis.damage_types?.forEach(type => {
            damageTypeMap[type] = (damageTypeMap[type] || 0) + 1;
          });
          
          // Count affected areas
          analysis.affected_areas?.forEach(area => {
            affectedAreaMap[area] = (affectedAreaMap[area] || 0) + 1;
          });
        }
        
        // Add to assessment area breakdown if available
        if (analysis.assessment_area_id) {
          assessmentAreaBreakdown[analysis.assessment_area_id] = {
            damageDetected: analysis.damage_detected,
            severity: analysis.damage_severity,
            damageTypes: analysis.damage_types || [],
            confidence: analysis.confidence
          };
        }
      });

      // Determine most severe damage
      let mostSevereDamage: 'none' | 'minor' | 'moderate' | 'severe' = 'none';
      if (severityCount.severe > 0) {
        mostSevereDamage = 'severe';
      } else if (severityCount.moderate > 0) {
        mostSevereDamage = 'moderate';
      } else if (severityCount.minor > 0) {
        mostSevereDamage = 'minor';
      }

      // Get most common damage types (top 5)
      const commonDamageTypes = Object.entries(damageTypeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type]) => type);

      // Get most common affected areas (top 5)
      const commonAffectedAreas = Object.entries(affectedAreaMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([area]) => area);

      return {
        hasDamage,
        severityCount,
        mostSevereDamage,
        commonDamageTypes,
        commonAffectedAreas,
        totalImagesAnalyzed: analyses.length,
        assessmentAreaBreakdown
      };
    } catch (error) {
      console.error('Error generating report damage summary:', error);
      return {
        hasDamage: false,
        severityCount: { none: 0, minor: 0, moderate: 0, severe: 0 },
        mostSevereDamage: 'none',
        commonDamageTypes: [],
        commonAffectedAreas: [],
        totalImagesAnalyzed: 0,
        assessmentAreaBreakdown: {}
      };
    }
  },

  /**
   * Get a summary of damage for a property
   */
  async getPropertyDamageSummary(propertyId: string): Promise<{
    hasDamage: boolean;
    severityCount: Record<string, number>;
    mostSevereDamage: 'none' | 'minor' | 'moderate' | 'severe';
    commonDamageTypes: string[];
    commonAffectedAreas: string[];
    totalImagesAnalyzed: number;
  }> {
    try {
      // Get all analyses for the property
      const analyses = await this.getPropertyAnalyses(propertyId);
      
      if (!analyses.length) {
        return {
          hasDamage: false,
          severityCount: { none: 0, minor: 0, moderate: 0, severe: 0 },
          mostSevereDamage: 'none',
          commonDamageTypes: [],
          commonAffectedAreas: [],
          totalImagesAnalyzed: 0
        };
      }

      // Initialize counters
      const severityCount: Record<string, number> = { 
        none: 0, minor: 0, moderate: 0, severe: 0 
      };

      // Track all damage types and affected areas
      const damageTypeMap: Record<string, number> = {};
      const affectedAreaMap: Record<string, number> = {};
      
      // Process each analysis
      let hasDamage = false;
      
      analyses.forEach(analysis => {
        // Count severity levels
        const severity = analysis.damage_severity || 'none';
        severityCount[severity] = (severityCount[severity] || 0) + 1;
        
        // Check if any damage is detected
        if (analysis.damage_detected) {
          hasDamage = true;
          
          // Count damage types
          analysis.damage_types?.forEach(type => {
            damageTypeMap[type] = (damageTypeMap[type] || 0) + 1;
          });
          
          // Count affected areas
          analysis.affected_areas?.forEach(area => {
            affectedAreaMap[area] = (affectedAreaMap[area] || 0) + 1;
          });
        }
      });

      // Determine most severe damage
      let mostSevereDamage: 'none' | 'minor' | 'moderate' | 'severe' = 'none';
      if (severityCount.severe > 0) {
        mostSevereDamage = 'severe';
      } else if (severityCount.moderate > 0) {
        mostSevereDamage = 'moderate';
      } else if (severityCount.minor > 0) {
        mostSevereDamage = 'minor';
      }

      // Get most common damage types (top 5)
      const commonDamageTypes = Object.entries(damageTypeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type]) => type);

      // Get most common affected areas (top 5)
      const commonAffectedAreas = Object.entries(affectedAreaMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([area]) => area);

      return {
        hasDamage,
        severityCount,
        mostSevereDamage,
        commonDamageTypes,
        commonAffectedAreas,
        totalImagesAnalyzed: analyses.length
      };
    } catch (error) {
      console.error('Error generating property damage summary:', error);
      return {
        hasDamage: false,
        severityCount: { none: 0, minor: 0, moderate: 0, severe: 0 },
        mostSevereDamage: 'none',
        commonDamageTypes: [],
        commonAffectedAreas: [],
        totalImagesAnalyzed: 0
      };
    }
  },

  /**
   * Re-analyze an image that was previously analyzed
   */
  async reanalyzeImage(
    imageUrl: string, 
    imageId: string, 
    propertyId?: string, 
    reportId?: string, 
    assessmentAreaId?: string
  ): Promise<DamageAnalysisResult | null> {
    return this.analyzeImage(imageUrl, imageId, propertyId, reportId, assessmentAreaId);
  },
  
  /**
   * Get all images and their analyses for a report
   */
  async getReportImagesWithAnalysis(reportId: string): Promise<any[]> {
    try {
      // Get all images for the report
      const { data: images, error: imagesError } = await supabase
        .from('images')
        .select(`
          *,
          assessment_area:assessment_area_id(id, damage_type, location, severity),
          image_analysis!image_analysis_image_id_fkey(
            id, damage_detected, damage_severity, damage_types, 
            affected_areas, confidence, analyzed_at
          )
        `)
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });
        
      if (imagesError) {
        console.error('Error fetching report images:', imagesError);
        return [];
      }
      
      return images || [];
    } catch (error) {
      console.error('Error in getReportImagesWithAnalysis:', error);
      return [];
    }
  }
};

export default DamageAssessmentService;