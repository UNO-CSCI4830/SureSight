import { supabase } from '../../utils/supabaseClient';
import {
  saveImageAnalysisData,
  getImageAnalysisForReport,
  updateImageAnalysis,
  deleteImageAnalysis
} from '../../utils/damageAssessmentService';

// Mock the Supabase client
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn()
        })
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn()
        })
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn()
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn()
      })
    })
  }
}));

describe('Damage Assessment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveImageAnalysisData', () => {
    const mockAnalysisData = {
      image_id: 'image-123',
      report_id: 'report-123',
      assessment_area_id: 'area-123',
      damage_detected: true,
      damage_types: ['roof', 'siding'],
      damage_severity: 'moderate',
      confidence: 0.85,
      raw_results: { details: 'test data' }
    };

    test('should save image analysis data successfully', async () => {
      // Mock successful insert
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'analysis-123', ...mockAnalysisData },
            error: null
          })
        })
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      const result = await saveImageAnalysisData(mockAnalysisData);

      expect(result).toEqual({
        success: true,
        data: { id: 'analysis-123', ...mockAnalysisData }
      });

      expect(supabase.from).toHaveBeenCalledWith('image_analysis');
      expect(mockInsert).toHaveBeenCalledWith(mockAnalysisData);
    });

    test('should handle database errors', async () => {
      // Mock database error
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      const result = await saveImageAnalysisData(mockAnalysisData);

      expect(result).toEqual({
        success: false,
        error: 'Database error'
      });
    });

    test('should handle unexpected errors', async () => {
      // Mock unexpected error
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockRejectedValue(new Error('Unexpected error'))
        })
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      const result = await saveImageAnalysisData(mockAnalysisData);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected error'
      });
    });
  });

  describe('getImageAnalysisForReport', () => {
    const reportId = 'report-123';
    const mockAnalysisResults = [
      {
        id: 'analysis-1',
        image_id: 'image-1',
        damage_detected: true
      },
      {
        id: 'analysis-2',
        image_id: 'image-2',
        damage_detected: false
      }
    ];

    test('should retrieve image analysis data for a report', async () => {
      // Mock successful select
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockAnalysisResults,
        error: null
      });

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      const result = await getImageAnalysisForReport(reportId);

      expect(result).toEqual({
        success: true,
        data: mockAnalysisResults
      });

      expect(supabase.from).toHaveBeenCalledWith('image_analysis');
      expect(mockSelect).toHaveBeenCalledWith('*, images(filename, storage_path)');
      expect(mockEq).toHaveBeenCalledWith('report_id', reportId);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    test('should handle database errors', async () => {
      // Mock database error
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      const result = await getImageAnalysisForReport(reportId);

      expect(result).toEqual({
        success: false,
        error: 'Database error'
      });
    });

    test('should handle unexpected errors', async () => {
      // Mock unexpected error
      const mockOrder = jest.fn().mockRejectedValue(new Error('Unexpected error'));

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      const result = await getImageAnalysisForReport(reportId);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected error'
      });
    });
  });

  describe('updateImageAnalysis', () => {
    const analysisId = 'analysis-123';
    const mockUpdateData = {
      damage_severity: 'severe',
      confidence: 0.95
    };

    test('should update image analysis successfully', async () => {
      // Mock successful update
      const mockEq = jest.fn().mockResolvedValue({
        data: { id: analysisId, ...mockUpdateData },
        error: null
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate
      });

      const result = await updateImageAnalysis(analysisId, mockUpdateData);

      expect(result).toEqual({
        success: true,
        data: { id: analysisId, ...mockUpdateData }
      });

      expect(supabase.from).toHaveBeenCalledWith('image_analysis');
      expect(mockUpdate).toHaveBeenCalledWith(mockUpdateData);
      expect(mockEq).toHaveBeenCalledWith('id', analysisId);
    });

    test('should handle database errors', async () => {
      // Mock database error
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate
      });

      const result = await updateImageAnalysis(analysisId, mockUpdateData);

      expect(result).toEqual({
        success: false,
        error: 'Database error'
      });
    });

    test('should handle unexpected errors', async () => {
      // Mock unexpected error
      const mockEq = jest.fn().mockRejectedValue(new Error('Unexpected error'));

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate
      });

      const result = await updateImageAnalysis(analysisId, mockUpdateData);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected error'
      });
    });
  });

  describe('deleteImageAnalysis', () => {
    const analysisId = 'analysis-123';

    test('should delete image analysis successfully', async () => {
      // Mock successful delete
      const mockEq = jest.fn().mockResolvedValue({
        data: { id: analysisId },
        error: null
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete
      });

      const result = await deleteImageAnalysis(analysisId);

      expect(result).toEqual({
        success: true
      });

      expect(supabase.from).toHaveBeenCalledWith('image_analysis');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', analysisId);
    });

    test('should handle database errors', async () => {
      // Mock database error
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete
      });

      const result = await deleteImageAnalysis(analysisId);

      expect(result).toEqual({
        success: false,
        error: 'Database error'
      });
    });

    test('should handle unexpected errors', async () => {
      // Mock unexpected error
      const mockEq = jest.fn().mockRejectedValue(new Error('Unexpected error'));

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete
      });

      const result = await deleteImageAnalysis(analysisId);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected error'
      });
    });
  });
});