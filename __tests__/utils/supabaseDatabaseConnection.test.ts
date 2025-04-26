// Setup environment variables before importing any modules
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.com';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

// Import necessary modules
import { supabase } from '../../utils/supabaseClient';
import { Database } from '../../types/database.types';

// Mock the Supabase client
jest.mock('../../utils/supabaseClient', () => {
  // Create a mock implementation of the Supabase client
  const mockFrom = (tableName: string) => {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockData[tableName], error: null })),
          limit: jest.fn(() => Promise.resolve({ data: mockData[tableName], error: null })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: mockData[tableName], error: null }))
          }))
        })),
        match: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockData[tableName], error: null })),
          limit: jest.fn(() => Promise.resolve({ data: mockData[tableName], error: null }))
        })),
        gte: jest.fn(() => ({
          lt: jest.fn(() => Promise.resolve({ data: mockData[tableName], error: null }))
        })),
        limit: jest.fn(() => Promise.resolve({ data: mockData[tableName], error: null })),
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: mockData[tableName], error: null }))
        })),
        textSearch: jest.fn(() => Promise.resolve({ data: mockData[tableName], error: null })),
        filter: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: mockData[tableName], error: null }))
        })),
      }),
      insert: jest.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
      update: jest.fn(() => Promise.resolve({ data: { updated: true }, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: { id: 'upsert-id' }, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: { deleted: true }, error: null }))
    };
  };

  // Mock RPC functions
  const mockRpc = jest.fn((funcName: string, params?: any) => {
    if (funcName === 'create_property') {
      return Promise.resolve({ data: 'new-property-id', error: null });
    }
    if (funcName === 'create_report') {
      return Promise.resolve({ data: 'new-report-id', error: null });
    }
    if (funcName === 'add_assessment_area') {
      return Promise.resolve({ data: 'new-area-id', error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  const mockStorage = {
    from: jest.fn((bucket: string) => ({
      upload: jest.fn(() => Promise.resolve({ data: { path: 'mock/path.jpg' }, error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/mock/path.jpg' } })),
      list: jest.fn(() => Promise.resolve({ data: [{ name: 'file1.jpg' }, { name: 'file2.jpg' }], error: null })),
      remove: jest.fn(() => Promise.resolve({ data: { deleted: true }, error: null })),
      download: jest.fn(() => Promise.resolve({ data: { blob: new Blob() }, error: null }))
    }))
  };

  const mockFunctions = {
    invoke: jest.fn((name: string, options?: any) => {
      if (name === 'analyze-image-damage') {
        return Promise.resolve({ data: { damage_detected: true, confidence: 0.85 }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    })
  };

  const mockAuth = {
    signUp: jest.fn(() => Promise.resolve({ data: { user: { id: 'new-user-id' } }, error: null })),
    signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: { id: 'user-id' } }, error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'user-id' } }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
  };

  return {
    supabase: {
      from: jest.fn(mockFrom),
      rpc: mockRpc,
      storage: mockStorage,
      functions: mockFunctions,
      auth: mockAuth
    }
  };
});

// Mock data for different tables
const mockData: Record<string, any[]> = {
  users: [
    { id: 'user-1', auth_user_id: 'auth-user-1', email: 'user1@example.com', role: 'homeowner' },
    { id: 'user-2', auth_user_id: 'auth-user-2', email: 'user2@example.com', role: 'inspector' }
  ],
  profiles: [
    { id: 'profile-1', user_id: 'user-1', first_name: 'John', last_name: 'Doe', phone: '1234567890' },
    { id: 'profile-2', user_id: 'user-2', first_name: 'Jane', last_name: 'Smith', phone: '0987654321' }
  ],
  properties: [
    { id: 'property-1', homeowner_id: 'user-1', address_line1: '123 Main St', city: 'Anytown', state: 'CA' },
    { id: 'property-2', homeowner_id: 'user-1', address_line1: '456 Oak Ave', city: 'Othertown', state: 'TX' }
  ],
  reports: [
    { id: 'report-1', property_id: 'property-1', creator_id: 'user-2', title: 'Roof Inspection', status: 'completed' },
    { id: 'report-2', property_id: 'property-2', creator_id: 'user-2', title: 'Damage Assessment', status: 'pending' }
  ],
  assessment_areas: [
    { id: 'area-1', report_id: 'report-1', damage_type: 'hail', severity: 'moderate' },
    { id: 'area-2', report_id: 'report-1', damage_type: 'wind', severity: 'severe' }
  ],
  images: [
    { id: 'image-1', report_id: 'report-1', path: 'reports/report-1/image1.jpg', uploaded_by: 'user-2' },
    { id: 'image-2', report_id: 'report-1', path: 'reports/report-1/image2.jpg', uploaded_by: 'user-2' }
  ],
  image_analysis: [
    { id: 'analysis-1', image_id: 'image-1', damage_detected: true, confidence: 0.85 },
    { id: 'analysis-2', image_id: 'image-2', damage_detected: false, confidence: 0.20 }
  ]
};

describe('Supabase Database Connection Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test basic database connection
  describe('Database Connection', () => {
    test('should have a functioning supabase client instance', () => {
      expect(supabase).toBeDefined();
      expect(supabase.from).toBeDefined();
      expect(supabase.rpc).toBeDefined();
      expect(supabase.storage).toBeDefined();
    });
  });

  // Test table queries
  describe('Table Queries', () => {
    test('should query users table', async () => {
      const { data, error } = await supabase
        .from('users')
        .select()
        .eq('email', 'user1@example.com')
        .single();
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.email).toBe('user1@example.com');
    });

    test('should query profiles table', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select()
        .eq('user_id', 'user-1')
        .single();
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.first_name).toBe('John');
    });

    test('should query properties table', async () => {
      const { data, error } = await supabase
        .from('properties')
        .select()
        .eq('homeowner_id', 'user-1')
        .limit(10);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    test('should query reports table with filters', async () => {
      const { data, error } = await supabase
        .from('reports')
        .select()
        .eq('property_id', 'property-1')
        .order('created_at', { ascending: false })
        .limit(5);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    test('should query assessment areas', async () => {
      const { data, error } = await supabase
        .from('assessment_areas')
        .select()
        .eq('report_id', 'report-1');
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // Test data insertion
  describe('Data Insertion', () => {
    test('should insert new user record', async () => {
      const newUser = {
        auth_user_id: 'auth-user-3',
        email: 'new@example.com',
        role: 'homeowner'
      };

      const { data, error } = await supabase
        .from('users')
        .insert(newUser);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBe('new-id');
    });

    test('should create profile for user', async () => {
      const newProfile = {
        user_id: 'user-3',
        first_name: 'New',
        last_name: 'User',
        phone: '5555555555'
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(newProfile);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  // Test data updates
  describe('Data Updates', () => {
    test('should update user record', async () => {
      const updateData = {
        email: 'updated@example.com'
      };

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', 'user-1');
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.updated).toBe(true);
    });

    test('should update profile information', async () => {
      const updateData = {
        phone: '9998887777'
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', 'user-1');
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  // Test data deletion
  describe('Data Deletion', () => {
    test('should delete a record', async () => {
      const { data, error } = await supabase
        .from('assessment_areas')
        .delete()
        .eq('id', 'area-1');
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.deleted).toBe(true);
    });
  });

  // Test RPC functions
  describe('RPC Function Calls', () => {
    test('should call create_property function', async () => {
      const propertyData = {
        p_homeowner_profile_id: 'user-1',
        p_address_line1: '789 Elm St',
        p_city: 'Somewhere',
        p_state: 'NY',
        p_postal_code: '12345',
        p_address_line2: 'Apt 4',
        p_country: 'US',
        p_property_type: 'residential'
      };

      const { data, error } = await supabase.rpc('create_property', propertyData);
      
      expect(error).toBeNull();
      expect(data).toBe('new-property-id');
    });

    test('should call create_report function', async () => {
      const reportData = {
        p_property_id: 'property-1',
        p_creator_id: 'user-2',
        p_title: 'New Report',
        p_description: 'Test description',
        p_incident_date: '2025-04-25'
      };

      const { data, error } = await supabase.rpc('create_report', reportData);
      
      expect(error).toBeNull();
      expect(data).toBe('new-report-id');
    });

    test('should call add_assessment_area function', async () => {
      const assessmentData = {
        p_report_id: 'report-1',
        p_damage_type: 'water',
        p_location: 'North side',
        p_severity: 'minor',
        p_added_by: 'user-2',
        p_dimensions: '10x15',
        p_notes: 'Minor water damage'
      };

      const { data, error } = await supabase.rpc('add_assessment_area', assessmentData);
      
      expect(error).toBeNull();
      expect(data).toBe('new-area-id');
    });
  });

  // Test storage operations
  describe('Storage Operations', () => {
    test('should upload a file to storage', async () => {
      const file = new File(['test content'], 'test-image.jpg', { type: 'image/jpeg' });
      
      const { data, error } = await supabase
        .storage
        .from('property-images')
        .upload('test-path/test-image.jpg', file);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.path).toBe('mock/path.jpg');
    });

    test('should get public URL for a file', () => {
      const { data } = supabase
        .storage
        .from('property-images')
        .getPublicUrl('test-path/test-image.jpg');
      
      expect(data).toBeDefined();
      expect(data.publicUrl).toBe('https://example.com/mock/path.jpg');
    });
  });

  // Test Edge Function invocation
  describe('Edge Functions', () => {
    test('should invoke analyze-image-damage function', async () => {
      const { data, error } = await supabase
        .functions
        .invoke('analyze-image-damage', {
          body: {
            imageUrl: 'https://example.com/test-image.jpg',
            imageId: 'image-1'
          }
        });
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.damage_detected).toBe(true);
      expect(data.confidence).toBe(0.85);
    });
  });

  // Test error handling
  describe('Error Handling', () => {
    test('should handle database query errors', async () => {
      // Override the mock for this specific test to simulate an error
      (supabase.from as jest.Mock).mockImplementationOnce((tableName: string) => {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } }))
            }))
          }))
        };
      });

      const { data, error } = await supabase
        .from('users')
        .select()
        .eq('id', 'non-existent')
        .single();
      
      expect(error).toBeDefined();
      expect(error.message).toBe('Database error');
      expect(data).toBeNull();
    });
  });
});