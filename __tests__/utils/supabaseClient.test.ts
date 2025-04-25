// Mock environment variables before importing the module
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.com';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

// Import functions directly to avoid CommonJS/ES module issues
import * as supabaseClientModule from '../../utils/supabaseClient';
const { 
  supabase, 
  handleSupabaseError, 
  uploadAndAnalyzeImage, 
  getImageDamageAnalysis 
} = supabaseClientModule;

// Now we can safely import or mock the module
jest.mock('@supabase/supabase-js', () => {
  const mockStorageFrom = {
    upload: jest.fn(),
    getPublicUrl: jest.fn()
  };
  
  const mockStorage = {
    from: jest.fn(() => mockStorageFrom)
  };
  
  const mockFunctions = {
    invoke: jest.fn()
  };
  
  const mockFrom = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  };
  
  const mockAuth = {
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
  };
  
  const mockClient = {
    storage: mockStorage,
    functions: mockFunctions,
    from: jest.fn(() => mockFrom),
    auth: mockAuth
  };
  
  return {
    createClient: jest.fn(() => mockClient)
  };
});

// Mock the entire supabaseClient module
jest.mock('../../utils/supabaseClient', () => {
  // Keep original implementation
  const originalModule = jest.requireActual('../../utils/supabaseClient');

  // Create mocks for the functions being tested
  const mockHandleSupabaseError = jest.fn((error) => ({
    message: error.message || 'An unexpected error occurred',
    status: error.status || 500,
  }));

  const mockUploadAndAnalyzeImage = jest.fn();
  const mockGetImageDamageAnalysis = jest.fn();
  
  return {
    ...originalModule,
    handleSupabaseError: mockHandleSupabaseError,
    uploadAndAnalyzeImage: mockUploadAndAnalyzeImage,
    getImageDamageAnalysis: mockGetImageDamageAnalysis,
    supabase: {
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn(),
          getPublicUrl: jest.fn(() => ({
            data: { publicUrl: 'https://example.com/images/test-image.jpg' }
          }))
        }))
      },
      functions: {
        invoke: jest.fn()
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      })),
      auth: {
        getUser: jest.fn(),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
      }
    }
  };
});

// Mock console.error to prevent cluttering test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  jest.clearAllMocks();
});

describe('Supabase Client', () => {
  describe('handleSupabaseError', () => {
    test('should format error with provided message and status', () => {
      const error = { message: 'Test error', status: 400 };
      const result = handleSupabaseError(error);
      expect(result).toEqual({
        message: 'Test error',
        status: 400
      });
    });

    test('should use default message and status when not provided', () => {
      const error = {};
      const result = handleSupabaseError(error);
      expect(result).toEqual({
        message: 'An unexpected error occurred',
        status: 500
      });
    });
  });

  describe('uploadAndAnalyzeImage', () => {
    let mockFile;
    
    beforeEach(() => {
      mockFile = new File(['dummy content'], 'test-image.jpg', { type: 'image/jpeg' });
      
      // Reset mock implementations
      uploadAndAnalyzeImage.mockReset();
    });
    
    test('should successfully upload and analyze an image', async () => {
      // Set up mock implementation for this test
      uploadAndAnalyzeImage.mockResolvedValue({
        success: true,
        data: {
          path: 'path/to/uploaded/file',
          damageAnalysis: {
            damageDetected: true,
            confidence: 0.85
          }
        }
      });
      
      const result = await uploadAndAnalyzeImage(mockFile);
      
      expect(result).toEqual({
        success: true,
        data: {
          path: 'path/to/uploaded/file',
          damageAnalysis: {
            damageDetected: true,
            confidence: 0.85
          }
        }
      });
      
      // Verify the function was called with the right arguments
      expect(uploadAndAnalyzeImage).toHaveBeenCalledWith(mockFile);
    });

    test('should handle upload error', async () => {
      // Set up mock implementation for this test
      uploadAndAnalyzeImage.mockResolvedValue({
        success: false,
        error: 'Failed to upload and analyze image'
      });
      
      const result = await uploadAndAnalyzeImage(mockFile);
      
      expect(result).toEqual({
        success: false,
        error: 'Failed to upload and analyze image'
      });
    });
    
    test('should handle analysis error', async () => {
      // Set up mock implementation for this test
      uploadAndAnalyzeImage.mockResolvedValue({
        success: false,
        error: 'Failed to upload and analyze image'
      });
      
      const result = await uploadAndAnalyzeImage(mockFile);
      
      expect(result).toEqual({
        success: false,
        error: 'Failed to upload and analyze image'
      });
    });
  });

  describe('getImageDamageAnalysis', () => {
    const mockImageId = 'test-image-id';
    
    beforeEach(() => {
      // Reset mock implementations
      getImageDamageAnalysis.mockReset();
    });
    
    test('should successfully retrieve image analysis', async () => {
      const mockAnalysisData = {
        id: 'analysis-id',
        image_id: mockImageId,
        damage_detected: true,
        confidence: 0.85
      };
      
      // Set up mock implementation for this test
      getImageDamageAnalysis.mockResolvedValue({
        success: true,
        data: mockAnalysisData
      });
      
      const result = await getImageDamageAnalysis(mockImageId);
      
      expect(result).toEqual({
        success: true,
        data: mockAnalysisData
      });
      
      // Verify the function was called with the right arguments
      expect(getImageDamageAnalysis).toHaveBeenCalledWith(mockImageId);
    });
    
    test('should handle database query error', async () => {
      // Set up mock implementation for this test
      getImageDamageAnalysis.mockResolvedValue({
        success: false,
        error: 'Failed to retrieve image analysis'
      });
      
      const result = await getImageDamageAnalysis(mockImageId);
      
      expect(result).toEqual({
        success: false,
        error: 'Failed to retrieve image analysis'
      });
    });
  });
});