import { uploadAndAnalyzeImage, getImageDamageAnalysis } from '../../utils/supabaseClient';

// Mock the Supabase client
jest.mock('../../utils/supabaseClient', () => {
  const originalModule = jest.requireActual('../../utils/supabaseClient');
  
  return {
    __esModule: true,
    ...originalModule,
    supabase: {
      storage: {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({ 
            data: { path: 'test/image-123.jpg' },
            error: null 
          }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: 'https://example.com/storage/test/image-123.jpg' }
          })
        })
      },
      functions: {
        invoke: jest.fn()
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'analysis-123',
            image_id: 'image-123',
            damage_detected: true,
            damage_type: 'roof',
            confidence: 0.92,
            severity: 'moderate',
            raw_results: {
              labels: [
                { description: 'Roof', score: 0.95 },
                { description: 'Damage', score: 0.92 },
                { description: 'Shingle', score: 0.88 }
              ]
            }
          },
          error: null
        })
      })
    },
    uploadAndAnalyzeImage: jest.requireActual('../../utils/supabaseClient').uploadAndAnalyzeImage,
    getImageDamageAnalysis: jest.requireActual('../../utils/supabaseClient').getImageDamageAnalysis
  };
});

describe('Google Vision API Integration', () => {
  const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('uploadAndAnalyzeImage', () => {
    it('should upload image and return analysis results', async () => {
      // Mock the Edge Function response
      const mockSupabase = require('../../utils/supabaseClient').supabase;
      mockSupabase.functions.invoke.mockResolvedValueOnce({ 
        data: { 
          success: true,
          damage_detected: true,
          damage_type: 'roof',
          severity: 'moderate',
          confidence: 0.92,
          analysis: {
            labels: [
              { description: 'Roof', score: 0.95 },
              { description: 'Damage', score: 0.92 }
            ]
          }
        },
        error: null
      });
      
      const result = await uploadAndAnalyzeImage(mockFile);
      
      // Assertions
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.damageAnalysis).toBeDefined();
      expect(result.data?.damageAnalysis.damageDetected).toBe(true);
      expect(result.data?.damageAnalysis.damageType).toBe('roof');
      expect(result.data?.damageAnalysis.severity).toBe('moderate');
      expect(result.data?.damageAnalysis.confidence).toBe(0.92);
      
      // Function call verification
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('property-images');
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('analyze-image-damage', {
        body: expect.objectContaining({
          imageUrl: expect.any(String),
          imageId: expect.any(String)
        })
      });
    });
    
    it('should handle upload errors', async () => {
      // Mock upload error
      const mockSupabase = require('../../utils/supabaseClient').supabase;
      mockSupabase.storage.from().upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage error' }
      });
      
      const result = await uploadAndAnalyzeImage(mockFile);
      
      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });
    
    it('should handle analysis errors', async () => {
      // Mock analysis error
      const mockSupabase = require('../../utils/supabaseClient').supabase;
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Analysis service unavailable' }
      });
      
      const result = await uploadAndAnalyzeImage(mockFile);
      
      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toBe('Analysis service unavailable');
    });
  });
  
  describe('getImageDamageAnalysis', () => {
    it('should retrieve image analysis results', async () => {
      const result = await getImageDamageAnalysis('image-123');
      
      // Assertions
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.damage_detected).toBe(true);
      expect(result.data.damage_type).toBe('roof');
      expect(result.data.severity).toBe('moderate');
      
      // Function call verification
      const mockSupabase = require('../../utils/supabaseClient').supabase;
      expect(mockSupabase.from).toHaveBeenCalledWith('image_analysis');
      expect(mockSupabase.from().select).toHaveBeenCalledWith('*');
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('image_id', 'image-123');
    });
    
    it('should handle retrieval errors', async () => {
      // Mock database error
      const mockSupabase = require('../../utils/supabaseClient').supabase;
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Record not found' }
      });
      
      const result = await getImageDamageAnalysis('non-existent-image');
      
      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toBe('Record not found');
    });
  });
});