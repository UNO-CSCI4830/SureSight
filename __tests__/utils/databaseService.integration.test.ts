// Setup environment variables before importing any modules
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.com';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

// Mock the entire supabaseClient module
jest.mock('../../utils/supabaseClient', () => {
  return {
    supabase: {
      from: jest.fn(),
      rpc: jest.fn(),
      storage: {
        from: jest.fn()
      }
    }
  };
});

import { supabase } from '../../utils/supabaseClient';
import { Database } from '../../types/database.types';

/**
 * Database Service - provides methods to interact with the database
 */
class DatabaseService {
  /**
   * Creates a new user in the database
   */
  async createUser(userData: {
    auth_user_id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          auth_user_id: userData.auth_user_id,
          email: userData.email,
          first_name: userData.first_name || null,
          last_name: userData.last_name || null,
          role: userData.role || 'homeowner',
          email_confirmed: true
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create user',
      };
    }
  }

  /**
   * Gets a user by auth_user_id
   */
  async getUserByAuthId(authUserId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get user',
      };
    }
  }

  /**
   * Creates a new property
   */
  async createProperty(propertyData: {
    homeowner_id: string;
    address_line1: string;
    city: string;
    state: string;
    postal_code: string;
    address_line2?: string;
    country?: string;
    property_type?: string;
    year_built?: number;
    square_footage?: number;
  }) {
    try {
      const result = await supabase.rpc('create_property', {
        p_homeowner_profile_id: propertyData.homeowner_id,
        p_address_line1: propertyData.address_line1,
        p_city: propertyData.city,
        p_state: propertyData.state,
        p_postal_code: propertyData.postal_code,
        p_address_line2: propertyData.address_line2 || null,
        p_country: propertyData.country || 'US',
        p_property_type: propertyData.property_type || null,
        p_year_built: propertyData.year_built || null,
        p_square_footage: propertyData.square_footage || null
      });

      if (result.error) throw result.error;

      return {
        success: true,
        property_id: result.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create property',
      };
    }
  }

  /**
   * Gets all properties for a homeowner
   */
  async getHomeownerProperties(homeownerId: string) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('homeowner_id', homeownerId);

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get properties',
      };
    }
  }

  /**
   * Creates a new report
   */
  async createReport(reportData: {
    property_id: string;
    creator_id: string;
    title: string;
    description?: string;
    incident_date?: string;
  }) {
    try {
      const result = await supabase.rpc('create_report', {
        p_property_id: reportData.property_id,
        p_creator_id: reportData.creator_id,
        p_title: reportData.title,
        p_description: reportData.description || null,
        p_incident_date: reportData.incident_date || null,
      });

      if (result.error) throw result.error;

      return {
        success: true,
        report_id: result.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create report',
      };
    }
  }

  /**
   * Gets a report by ID
   */
  async getReport(reportId: string) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          property:property_id(*),
          creator:creator_id(*),
          assessment_areas(*),
          images(*)
        `)
        .eq('id', reportId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get report',
      };
    }
  }

  /**
   * Adds an image to a report
   */
  async uploadReportImage(image: File, reportId: string, uploadedBy: string) {
    try {
      // Generate a unique file path
      const filePath = `reports/${reportId}/${Date.now()}-${image.name}`;
      
      // Upload the file to storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('report-images')
        .upload(filePath, image, { cacheControl: '3600', upsert: false });
      
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: urlData } = supabase
        .storage
        .from('report-images')
        .getPublicUrl(uploadData.path);
        
      // Add record to images table
      const { data: imageData, error: imageError } = await supabase
        .from('images')
        .insert({
          report_id: reportId,
          path: uploadData.path,
          url: urlData.publicUrl,
          uploaded_by: uploadedBy,
          file_name: image.name,
          file_size: image.size,
          file_type: image.type
        })
        .select('*')
        .single();
        
      if (imageError) throw imageError;
      
      return {
        success: true,
        data: imageData
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to upload image'
      };
    }
  }

  /**
   * Adds an assessment area to a report
   */
  async addAssessmentArea(assessmentData: {
    report_id: string;
    damage_type: string;
    location: string;
    severity: string;
    added_by: string;
    dimensions?: string;
    notes?: string;
  }) {
    try {
      const result = await supabase.rpc('add_assessment_area', {
        p_report_id: assessmentData.report_id,
        p_damage_type: assessmentData.damage_type,
        p_location: assessmentData.location,
        p_severity: assessmentData.severity,
        p_added_by: assessmentData.added_by,
        p_dimensions: assessmentData.dimensions || null,
        p_notes: assessmentData.notes || null,
      });

      if (result.error) throw result.error;

      return {
        success: true,
        assessment_area_id: result.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add assessment area',
      };
    }
  }
}

describe('DatabaseService', () => {
  let service: DatabaseService;
  
  // Mock implementations for chained Supabase query methods
  const mockSelect = jest.fn().mockReturnThis();
  const mockEq = jest.fn().mockReturnThis();
  const mockSingle = jest.fn();
  const mockUpdate = jest.fn().mockReturnThis();
  const mockInsert = jest.fn().mockReturnThis();
  
  // Mock implementation for from method
  const mockFromReturn = {
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
    update: mockUpdate,
    insert: mockInsert,
  };
  
  // Setup before each test
  beforeEach(() => {
    service = new DatabaseService();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Restore mock implementations
    (supabase.from as jest.Mock).mockReturnValue(mockFromReturn);
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: 'mock-id', error: null });
    
    // Setup select method to return this for chaining
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
  });

  describe('User Management', () => {
    test('should create a user successfully', async () => {
      // Mock the response for the createUser method
      mockSingle.mockResolvedValue({
        data: { id: 'user-1', auth_user_id: 'auth-1', email: 'test@example.com', role: 'homeowner' },
        error: null
      });
      
      const userData = {
        auth_user_id: 'auth-1',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      };
      
      const result = await service.createUser(userData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        id: 'user-1',
        auth_user_id: 'auth-1',
        email: 'test@example.com'
      }));
      
      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        auth_user_id: 'auth-1',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      }));
    });
    
    test('should handle error when creating a user', async () => {
      // Mock an error response
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' }
      });
      
      const userData = {
        auth_user_id: 'auth-1',
        email: 'duplicate@example.com',
      };
      
      const result = await service.createUser(userData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
    });
    
    test('should get a user by auth ID successfully', async () => {
      // Mock the response for the getUserByAuthId method
      mockSingle.mockResolvedValue({
        data: { id: 'user-1', auth_user_id: 'auth-1', email: 'test@example.com', role: 'homeowner' },
        error: null
      });
      
      const result = await service.getUserByAuthId('auth-1');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        id: 'user-1',
        auth_user_id: 'auth-1'
      }));
      
      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('auth_user_id', 'auth-1');
    });
    
    test('should handle error when user not found', async () => {
      // Mock an error response
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });
      
      const result = await service.getUserByAuthId('non-existent-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });
  
  describe('Property Management', () => {
    test('should create a property successfully', async () => {
      // Mock the RPC response
      (supabase.rpc as jest.Mock).mockResolvedValue({ 
        data: 'property-123', 
        error: null 
      });
      
      // Test data
      const propertyData = {
        homeowner_id: 'homeowner-123',
        address_line1: '123 Test Street',
        city: 'Testville',
        state: 'TS',
        postal_code: '12345',
        address_line2: 'Apt 4B',
        property_type: 'residential',
        year_built: 2010
      };
      
      // Execute test
      const result = await service.createProperty(propertyData);
      
      // Assert results
      expect(result).toEqual({
        success: true,
        property_id: 'property-123'
      });
      
      // Check if RPC was called with the right arguments
      expect(supabase.rpc).toHaveBeenCalledWith('create_property', expect.objectContaining({
        p_homeowner_profile_id: 'homeowner-123',
        p_address_line1: '123 Test Street',
        p_city: 'Testville',
        p_state: 'TS',
        p_postal_code: '12345',
        p_address_line2: 'Apt 4B'
      }));
    });
    
    test('should handle error when creating a property', async () => {
      // Mock error response
      (supabase.rpc as jest.Mock).mockResolvedValue({ 
        data: null, 
        error: { message: 'Invalid homeowner ID' } 
      });
      
      // Test data
      const propertyData = {
        homeowner_id: 'invalid-id',
        address_line1: '123 Test Street',
        city: 'Testville',
        state: 'TS',
        postal_code: '12345'
      };
      
      // Execute test
      const result = await service.createProperty(propertyData);
      
      // Assert results
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid homeowner ID');
    });
    
    test('should get homeowner properties successfully', async () => {
      // Mock response for getting properties
      const mockProperties = [
        { id: 'property-1', address_line1: '123 Main St', city: 'Anytown' },
        { id: 'property-2', address_line1: '456 Oak Ave', city: 'Othertown' }
      ];
      
      mockEq.mockResolvedValue({
        data: mockProperties,
        error: null
      });
      
      // Execute test
      const result = await service.getHomeownerProperties('homeowner-123');
      
      // Assert results
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProperties);
      expect(result.data).toHaveLength(2);
      
      // Verify supabase calls
      expect(supabase.from).toHaveBeenCalledWith('properties');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('homeowner_id', 'homeowner-123');
    });
    
    test('should handle error when getting properties', async () => {
      // Mock error response
      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'Database error occurred' }
      });
      
      // Execute test
      const result = await service.getHomeownerProperties('homeowner-123');
      
      // Assert results
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error occurred');
    });
  });
  
  describe('Report Management', () => {
    test('should create a report successfully', async () => {
      // Mock the RPC response
      (supabase.rpc as jest.Mock).mockResolvedValue({ 
        data: 'report-123', 
        error: null 
      });
      
      // Test data
      const reportData = {
        property_id: 'property-123',
        creator_id: 'inspector-123',
        title: 'Test Report',
        description: 'This is a test report',
        incident_date: '2025-04-25'
      };
      
      // Execute test
      const result = await service.createReport(reportData);
      
      // Assert results
      expect(result).toEqual({
        success: true,
        report_id: 'report-123'
      });
      
      expect(supabase.rpc).toHaveBeenCalledWith('create_report', expect.objectContaining({
        p_property_id: 'property-123',
        p_creator_id: 'inspector-123',
        p_title: 'Test Report'
      }));
    });
    
    test('should get a report by ID with all related data', async () => {
      // Complex mock response that includes nested related data
      const mockReportData = {
        id: 'report-123',
        title: 'Test Report',
        status: 'in_progress',
        property: {
          id: 'property-123',
          address_line1: '123 Main St'
        },
        creator: {
          id: 'user-123',
          email: 'inspector@example.com'
        },
        assessment_areas: [
          { id: 'area-1', damage_type: 'hail', severity: 'moderate' }
        ],
        images: [
          { id: 'image-1', path: 'reports/report-123/image1.jpg' }
        ]
      };
      
      // Mock the response
      mockSingle.mockResolvedValue({
        data: mockReportData,
        error: null
      });
      
      // Execute test
      const result = await service.getReport('report-123');
      
      // Assert results
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReportData);
      expect(result.data.property).toBeDefined();
      expect(result.data.creator).toBeDefined();
      expect(result.data.assessment_areas).toHaveLength(1);
      expect(result.data.images).toHaveLength(1);
      
      // Verify supabase was called correctly
      expect(supabase.from).toHaveBeenCalledWith('reports');
      expect(mockEq).toHaveBeenCalledWith('id', 'report-123');
    });
    
    test('should add assessment area successfully', async () => {
      const mockAssessmentAreaId = 'area-123';
      
      // Mock RPC response
      (supabase.rpc as jest.Mock).mockResolvedValue({ 
        data: mockAssessmentAreaId, 
        error: null 
      });

      // Test data
      const assessmentData = {
        report_id: 'report-123',
        damage_type: 'roof',
        location: 'North side',
        severity: 'severe',
        added_by: 'user-123',
        notes: 'Significant hail damage'
      };

      // Execute test
      const result = await service.addAssessmentArea(assessmentData);

      // Assert results
      expect(result).toEqual({
        success: true,
        assessment_area_id: mockAssessmentAreaId
      });
      
      expect(supabase.rpc).toHaveBeenCalledWith('add_assessment_area', expect.objectContaining({
        p_report_id: assessmentData.report_id,
        p_damage_type: assessmentData.damage_type,
        p_location: assessmentData.location,
        p_severity: assessmentData.severity
      }));
    });
  });
});