// __tests__/utils/visionServiceMock.test.ts
// Mock test for the analyze-image-damage edge function

/**
 * This test file provides a mock implementation of the analyze-image-damage 
 * Supabase Edge Function that mimics the behavior of the Google Cloud Vision API
 * without making actual API calls or incurring any charges.
 */

import { analyzeExistingImage } from '../../utils/visionService';
import { supabase } from '../../utils/supabaseClient';

// Mock the supabase client
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/mock-image.jpg' }
        })
      })
    },
    functions: {
      invoke: jest.fn()
    },
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: { updated: true },
          error: null
        })
      })
    })
  }
}));

/**
 * Mock implementation of the Google Vision API image analysis
 * This mimics the behavior of the API without making actual calls
 */
const mockAnalyzeImage = (imageUrl: string) => {
  // Extract keywords from the image URL to simulate different scenarios
  const hasRoofDamage = imageUrl.toLowerCase().includes('roof');
  const hasWaterDamage = imageUrl.toLowerCase().includes('water');
  const hasSidingDamage = imageUrl.toLowerCase().includes('siding');
  
  // If image URL contains specific keywords, simulate detecting that damage type
  const isDamaged = hasRoofDamage || hasWaterDamage || hasSidingDamage;
  let damageType = 'other';
  let confidenceScore = 0.5; // default medium confidence
  
  if (hasRoofDamage) {
    damageType = 'roof';
    confidenceScore = 0.85;
  } else if (hasWaterDamage) {
    damageType = 'water';
    confidenceScore = 0.78;
  } else if (hasSidingDamage) {
    damageType = 'siding';
    confidenceScore = 0.92;
  }
  
  // Determine severity based on confidence score
  const getSeverity = (score: number) => {
    if (score > 0.9) return 'severe';
    if (score > 0.7) return 'moderate';
    return 'minor';
  };
  
  return {
    damage_detected: isDamaged,
    confidence: confidenceScore,
    damage_type: isDamaged ? damageType : undefined,
    severity: isDamaged ? getSeverity(confidenceScore) : undefined
  };
};

describe('Vision Service Mock Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('mock analyze-image-damage function should detect roof damage', async () => {
    // Setup: mock the Supabase functions.invoke to use our mock implementation
    const mockInvoke = supabase.functions.invoke as jest.Mock;
    mockInvoke.mockImplementation((_functionName, { body }) => {
      const { imageUrl } = body;
      const mockResult = mockAnalyzeImage(imageUrl);
      return Promise.resolve({
        data: mockResult,
        error: null
      });
    });
    
    // Test with a URL containing 'roof' keyword
    const mockPublicUrl = supabase.storage.from('reports').getPublicUrl as jest.Mock;
    mockPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/reports/roof-damage.jpg' }
    });
    
    const result = await analyzeExistingImage('image-123', 'reports/roof-damage.jpg');
    
    // Verify results for roof damage
    expect(result.success).toBe(true);
    expect(result.data?.damage_detected).toBe(true);
    expect(result.data?.damage_type).toBe('roof');
    expect(result.data?.confidence).toBeGreaterThan(0.8);
    expect(result.data?.damage_severity).toBe('moderate');
    
    // Verify function was called correctly
    expect(mockInvoke).toHaveBeenCalledWith('analyze-image-damage', expect.any(Object));
  });
  
  test('mock analyze-image-damage function should detect water damage', async () => {
    const mockInvoke = supabase.functions.invoke as jest.Mock;
    mockInvoke.mockImplementation((_functionName, { body }) => {
      const { imageUrl } = body;
      const mockResult = mockAnalyzeImage(imageUrl);
      return Promise.resolve({
        data: mockResult,
        error: null
      });
    });
    
    // Test with a URL containing 'water' keyword
    const mockPublicUrl = supabase.storage.from('reports').getPublicUrl as jest.Mock;
    mockPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/reports/water-damage-kitchen.jpg' }
    });
    
    const result = await analyzeExistingImage('image-123', 'reports/water-damage-kitchen.jpg');
    
    // Verify results for water damage
    expect(result.success).toBe(true);
    expect(result.data?.damage_detected).toBe(true);
    expect(result.data?.damage_type).toBe('water');
    expect(result.data?.confidence).toBeGreaterThan(0.7);
    expect(result.data?.damage_severity).toBe('moderate');
  });
  
  test('mock analyze-image-damage function should detect siding damage', async () => {
    const mockInvoke = supabase.functions.invoke as jest.Mock;
    mockInvoke.mockImplementation((_functionName, { body }) => {
      const { imageUrl } = body;
      const mockResult = mockAnalyzeImage(imageUrl);
      return Promise.resolve({
        data: mockResult,
        error: null
      });
    });
    
    // Test with a URL containing 'siding' keyword
    const mockPublicUrl = supabase.storage.from('reports').getPublicUrl as jest.Mock;
    mockPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/reports/siding-damage-north.jpg' }
    });
    
    const result = await analyzeExistingImage('image-123', 'reports/siding-damage-north.jpg');
    
    // Verify results for siding damage
    expect(result.success).toBe(true);
    expect(result.data?.damage_detected).toBe(true);
    expect(result.data?.damage_type).toBe('siding');
    expect(result.data?.confidence).toBeGreaterThan(0.9);
    expect(result.data?.damage_severity).toBe('severe');
  });
  
  test('mock analyze-image-damage function should not detect damage in normal images', async () => {
    const mockInvoke = supabase.functions.invoke as jest.Mock;
    mockInvoke.mockImplementation((_functionName, { body }) => {
      const { imageUrl } = body;
      const mockResult = mockAnalyzeImage(imageUrl);
      return Promise.resolve({
        data: mockResult,
        error: null
      });
    });
    
    // Test with a URL not containing damage keywords
    const mockPublicUrl = supabase.storage.from('reports').getPublicUrl as jest.Mock;
    mockPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/reports/normal-house-exterior.jpg' }
    });
    
    const result = await analyzeExistingImage('image-123', 'reports/normal-house-exterior.jpg');
    
    // Verify results for no damage
    expect(result.success).toBe(true);
    expect(result.data?.damage_detected).toBe(false);
    expect(result.data?.confidence).toBe(0.5); // default confidence
    expect(result.data?.damage_type).toBeUndefined();
    expect(result.data?.damage_severity).toBeUndefined();
  });
  
  test('should handle analysis error gracefully', async () => {
    // Mock an error response from the function
    const mockInvoke = supabase.functions.invoke as jest.Mock;
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Mock analysis service error' }
    });
    
    const result = await analyzeExistingImage('image-123', 'reports/test-image.jpg');
    
    // Verify error is handled correctly
    expect(result.success).toBe(false);
    expect(result.error).toBe('Mock analysis service error');
  });
});