// __tests__/utils/visionService.test.ts
import {
  uploadAndAnalyzeImage,
  getImageDamageAnalysis,
  saveImageWithAnalysis,
  analyzeExistingImage
} from '../../utils/visionService';
import { supabase } from '../../utils/supabaseClient';

// Mock the supabase client
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn(),
        getPublicUrl: jest.fn()
      })
    },
    functions: {
      invoke: jest.fn()
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn()
        })
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn()
        })
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn()
      })
    })
  }
}));

// Create a mock File object
const createMockFile = () => {
  return new File(['mock image content'], 'test-image.jpg', { type: 'image/jpeg' });
};

describe('Vision Service', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadAndAnalyzeImage', () => {
    test('should successfully upload and analyze an image', async () => {
      // Mock storage upload response
      const mockUpload = supabase.storage.from('reports').upload as jest.Mock;
      mockUpload.mockResolvedValue({
        data: { path: 'reports/report-123/test-image.jpg' },
        error: null
      });

      // Mock getPublicUrl response
      const mockGetPublicUrl = supabase.storage.from('reports').getPublicUrl as jest.Mock;
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/reports/report-123/test-image.jpg' }
      });

      // Mock functions invoke response
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({
        data: {
          damage_detected: true,
          confidence: 0.85,
          damage_type: 'roof',
          severity: 'moderate'
        },
        error: null
      });

      // Execute the function
      const result = await uploadAndAnalyzeImage(
        createMockFile(),
        'report-123'
      );

      // Assert results
      expect(result).toEqual({
        success: true,
        data: {
          path: 'reports/report-123/test-image.jpg',
          damageAnalysis: {
            damage_detected: true,
            confidence: 0.85,
            damage_type: 'roof',
            damage_severity: 'moderate'
          }
        }
      });

      // Verify function calls
      expect(mockUpload).toHaveBeenCalled();
      expect(mockGetPublicUrl).toHaveBeenCalled();
      expect(mockInvoke).toHaveBeenCalledWith('analyze-image-damage', {
        body: expect.objectContaining({
          imageUrl: expect.any(String),
          imageId: expect.any(String)
        })
      });
    });

    test('should handle upload error', async () => {
      // Mock storage upload error
      const mockUpload = supabase.storage.from('reports').upload as jest.Mock;
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'Storage error' }
      });

      // Execute the function
      const result = await uploadAndAnalyzeImage(
        createMockFile()
      );

      // Assert results
      expect(result).toEqual({
        success: false,
        error: 'Storage error'
      });

      // Verify function calls
      expect(mockUpload).toHaveBeenCalled();
    });

    test('should handle analysis error', async () => {
      // Mock storage upload response
      const mockUpload = supabase.storage.from('reports').upload as jest.Mock;
      mockUpload.mockResolvedValue({
        data: { path: 'reports/report-123/test-image.jpg' },
        error: null
      });

      // Mock getPublicUrl response
      const mockGetPublicUrl = supabase.storage.from('reports').getPublicUrl as jest.Mock;
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/reports/report-123/test-image.jpg' }
      });

      // Mock functions invoke error
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Analysis service unavailable' }
      });

      // Execute the function
      const result = await uploadAndAnalyzeImage(
        createMockFile(),
        'report-123'
      );

      // Assert results
      expect(result).toEqual({
        success: false,
        error: 'Analysis service unavailable'
      });

      // Verify function calls
      expect(mockUpload).toHaveBeenCalled();
      expect(mockGetPublicUrl).toHaveBeenCalled();
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  describe('getImageDamageAnalysis', () => {
    test('should retrieve image analysis data', async () => {
      // Mock database query response
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          damage_detected: true,
          confidence: 0.85,
          raw_results: {
            damage_type: 'roof',
            severity: 'moderate'
          }
        },
        error: null
      });

      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      supabase.from = jest.fn().mockReturnValue({
        select: mockSelect
      });

      // Execute the function
      const result = await getImageDamageAnalysis('image-123');

      // Assert results
      expect(result).toEqual({
        success: true,
        data: {
          damage_detected: true,
          confidence: 0.85,
          damage_type: 'roof',
          damage_severity: 'moderate'
        }
      });

      // Verify function calls
      expect(supabase.from).toHaveBeenCalledWith('image_analysis');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('image_id', 'image-123');
      expect(mockSingle).toHaveBeenCalled();
    });

    test('should handle database error', async () => {
      // Mock database query error
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      supabase.from = jest.fn().mockReturnValue({
        select: mockSelect
      });

      // Execute the function
      const result = await getImageDamageAnalysis('image-123');

      // Assert results
      expect(result).toEqual({
        success: false,
        error: 'Database error'
      });

      // Verify function calls
      expect(supabase.from).toHaveBeenCalledWith('image_analysis');
    });
  });

  describe('saveImageWithAnalysis', () => {
    test('should save image and analysis data', async () => {
      // Mock image insert response
      const mockImageSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'image-123',
          storage_path: 'reports/report-123/test-image.jpg',
          report_id: 'report-123'
        },
        error: null
      });

      const mockImageSelect = jest.fn().mockReturnValue({
        single: mockImageSingle
      });

      const mockImageInsert = jest.fn().mockReturnValue({
        select: mockImageSelect
      });

      // Mock analysis insert response
      const mockAnalysisSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'analysis-123',
          image_id: 'image-123',
          damage_detected: true,
          confidence: 0.85
        },
        error: null
      });

      const mockAnalysisSelect = jest.fn().mockReturnValue({
        single: mockAnalysisSingle
      });

      const mockAnalysisInsert = jest.fn().mockReturnValue({
        select: mockAnalysisSelect
      });

      // Setup the from mock to return different values for different tables
      supabase.from = jest.fn((table) => {
        if (table === 'images') {
          return { insert: mockImageInsert };
        } else {
          return { insert: mockAnalysisInsert };
        }
      });

      // Test data
      const imageData = {
        storage_path: 'reports/report-123/test-image.jpg',
        report_id: 'report-123',
        uploaded_by: 'user-123',
        filename: 'test-image.jpg'
      };

      const analysisResults = {
        damage_detected: true,
        confidence: 0.85,
        damage_type: 'roof',
        damage_severity: 'moderate'
      };

      // Execute the function
      const result = await saveImageWithAnalysis(imageData, analysisResults);

      // Assert results
      expect(result).toEqual({
        success: true,
        data: {
          image: {
            id: 'image-123',
            storage_path: 'reports/report-123/test-image.jpg',
            report_id: 'report-123'
          },
          analysis: {
            id: 'analysis-123',
            image_id: 'image-123',
            damage_detected: true,
            confidence: 0.85
          }
        }
      });

      // Verify function calls
      expect(supabase.from).toHaveBeenCalledWith('images');
      expect(supabase.from).toHaveBeenCalledWith('image_analysis');
      expect(mockImageInsert).toHaveBeenCalledWith(expect.objectContaining({
        storage_path: 'reports/report-123/test-image.jpg',
        report_id: 'report-123'
      }));
      expect(mockAnalysisInsert).toHaveBeenCalledWith(expect.objectContaining({
        image_id: 'image-123',
        damage_detected: true
      }));
    });

    test('should handle image insert error', async () => {
      // Mock image insert error
      const mockImageSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Image insert error' }
      });

      const mockImageSelect = jest.fn().mockReturnValue({
        single: mockImageSingle
      });

      const mockImageInsert = jest.fn().mockReturnValue({
        select: mockImageSelect
      });

      supabase.from = jest.fn().mockReturnValue({
        insert: mockImageInsert
      });

      // Test data
      const imageData = {
        storage_path: 'reports/report-123/test-image.jpg',
        report_id: 'report-123',
        uploaded_by: 'user-123',
        filename: 'test-image.jpg'
      };

      const analysisResults = {
        damage_detected: true,
        confidence: 0.85,
        damage_type: 'roof',
        damage_severity: 'moderate'
      };

      // Execute the function
      const result = await saveImageWithAnalysis(imageData, analysisResults);

      // Assert results
      expect(result).toEqual({
        success: false,
        error: 'Image insert error'
      });

      // Verify function calls
      expect(supabase.from).toHaveBeenCalledWith('images');
    });
  });

  describe('analyzeExistingImage', () => {
    test('should analyze an existing image', async () => {
      // Mock getPublicUrl response
      const mockGetPublicUrl = supabase.storage.from('reports').getPublicUrl as jest.Mock;
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/reports/test-image.jpg' }
      });

      // Mock functions invoke response
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({
        data: {
          damage_detected: true,
          confidence: 0.85,
          damage_type: 'roof',
          severity: 'moderate'
        },
        error: null
      });

      // Mock update response
      const mockEq = jest.fn().mockResolvedValue({
        data: { success: true },
        error: null
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq
      });

      supabase.from = jest.fn().mockReturnValue({
        update: mockUpdate
      });

      // Execute the function
      const result = await analyzeExistingImage(
        'image-123',
        'reports/test-image.jpg'
      );

      // Assert results
      expect(result).toEqual({
        success: true,
        data: {
          damage_detected: true,
          confidence: 0.85,
          damage_type: 'roof',
          damage_severity: 'moderate'
        }
      });

      // Verify function calls
      expect(mockGetPublicUrl).toHaveBeenCalled();
      expect(mockInvoke).toHaveBeenCalledWith('analyze-image-damage', {
        body: expect.objectContaining({
          imageUrl: expect.any(String),
          imageId: 'image-123'
        })
      });
      expect(supabase.from).toHaveBeenCalledWith('images');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        ai_processed: true,
        ai_damage_type: 'roof',
        ai_damage_severity: 'moderate',
        ai_confidence: 0.85
      }));
      expect(mockEq).toHaveBeenCalledWith('id', 'image-123');
    });

    test('should handle analysis error', async () => {
      // Mock getPublicUrl response
      const mockGetPublicUrl = supabase.storage.from('reports').getPublicUrl as jest.Mock;
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/reports/test-image.jpg' }
      });

      // Mock functions invoke error
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Analysis service unavailable' }
      });

      // Execute the function
      const result = await analyzeExistingImage(
        'image-123',
        'reports/test-image.jpg'
      );

      // Assert results
      expect(result).toEqual({
        success: false,
        error: 'Analysis service unavailable'
      });

      // Verify function calls
      expect(mockGetPublicUrl).toHaveBeenCalled();
      expect(mockInvoke).toHaveBeenCalled();
    });
  });
});