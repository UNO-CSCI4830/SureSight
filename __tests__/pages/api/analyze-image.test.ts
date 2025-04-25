import { createMocks } from 'node-mocks-http';

// Define mock functions first
const mockInvoke = jest.fn();
const mockInsert = jest.fn();
const mockFrom = jest.fn();
const mockGetUser = jest.fn();

// Mock the module before importing the handler
jest.mock('../../../utils/supabaseClient', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnThis(),
      getPublicUrl: jest.fn()
    },
    functions: {
      invoke: mockInvoke
    },
    from: mockFrom,
    auth: {
      getUser: mockGetUser
    }
  }
}));

// Set default mock implementation
mockFrom.mockImplementation(() => ({
  insert: mockInsert,
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis()
}));

// Now import the handler after mocks are set up
import handler from '../../../pages/api/analyze-image';

describe('API: /api/analyze-image', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('returns 401 when not authenticated', async () => {
    // Mock unauthenticated state
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' }
    });
    
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        imageId: 'test-image-id',
        imageUrl: 'https://example.com/test.jpg'
      }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Authentication required'
    });
  });
  
  test('returns 400 when missing required fields', async () => {
    // Mock authenticated state
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
    
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        // Missing imageUrl
        imageId: 'test-image-id'
      }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Image URL is required'
    });
  });
  
  test('returns 405 when method is not POST', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed'
    });
  });
  
  test('successfully analyzes image and returns results', async () => {
    // Mock authenticated state
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
    
    // Mock successful analysis
    mockInvoke.mockResolvedValue({
      data: {
        damage_detected: true,
        damage_type: 'roof',
        confidence: 0.92,
        severity: 'moderate'
      },
      error: null
    });
    
    // Mock successful database insert
    mockInsert.mockResolvedValue({
      data: { id: 'analysis-123' },
      error: null
    });
    
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        imageId: 'test-image-id',
        imageUrl: 'https://example.com/test.jpg'
      }
    });
    
    await handler(req, res);
    
    // Check response
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      success: true,
      analysis: {
        damage_detected: true,
        damage_type: 'roof',
        confidence: 0.92,
        severity: 'moderate'
      }
    });
    
    // Verify invocation of analysis function
    expect(mockInvoke).toHaveBeenCalledWith('analyze-image-damage', {
      body: {
        imageUrl: 'https://example.com/test.jpg',
        imageId: 'test-image-id'
      }
    });
    
    // Verify storing results in database
    expect(mockFrom).toHaveBeenCalledWith('image_analysis');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      image_id: 'test-image-id',
      damage_detected: true, 
      damage_type: 'roof',
      confidence: 0.92,
      severity: 'moderate',
      analyzed_at: expect.any(String),
      user_id: 'user-123'
    }));
  });
  
  test('handles analysis service error gracefully', async () => {
    // Mock authenticated state
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
    
    // Mock analysis failure
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Analysis service unavailable' }
    });
    
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        imageId: 'test-image-id',
        imageUrl: 'https://example.com/test.jpg'
      }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Analysis service unavailable'
    });
  });
  
  test('handles database error gracefully', async () => {
    // Mock authenticated state
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
    
    // Mock successful analysis
    mockInvoke.mockResolvedValue({
      data: {
        damage_detected: true,
        confidence: 0.92
      },
      error: null
    });
    
    // Mock database error
    mockInsert.mockResolvedValue({
      data: null,
      error: { message: 'Database error' }
    });
    
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        imageId: 'test-image-id',
        imageUrl: 'https://example.com/test.jpg'
      }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Failed to save analysis results: Database error'
    });
  });
});