// Mock environment variables before importing modules
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.com';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

// Mock the entire supabaseClient module
jest.mock('../../utils/supabaseClient', () => {
  return {
    supabase: {
      from: jest.fn(),
      rpc: jest.fn()
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
   * Updates an existing report
   */
  async updateReport(reportId: string, updateData: Partial<Database['public']['Tables']['reports']['Update']>) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .update(updateData)
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
        error: error.message || 'Failed to update report',
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
        p_square_footage: propertyData.square_footage || null,
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

  /**
   * Sends a message from one user to another
   */
  async sendMessage(messageData: {
    sender_id: string;
    receiver_id: string;
    content: string;
    is_read?: boolean;
  }) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: messageData.sender_id,
          receiver_id: messageData.receiver_id,
          content: messageData.content,
          is_read: messageData.is_read !== undefined ? messageData.is_read : false
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
        error: error.message || 'Failed to send message',
      };
    }
  }

  /**
   * Gets all messages for a user
   */
  async getUserMessages(userId: string, unreadOnly: boolean = false) {
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('receiver_id', userId);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get messages',
      };
    }
  }

  /**
   * Marks a message as read
   */
  async markMessageAsRead(messageId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to mark message as read',
      };
    }
  }

  /**
   * Updates a user's email verification status
   */
  async updateEmailVerificationStatus(userId: string, isVerified: boolean) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ email_confirmed: isVerified })
        .eq('auth_user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update email verification status',
      };
    }
  }

  /**
   * Checks if a user's email is verified
   */
  async isEmailVerified(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email_confirmed')
        .eq('auth_user_id', userId)
        .single();

      if (error) throw error;

      return {
        success: true,
        isVerified: data?.email_confirmed || false,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to check email verification status',
        isVerified: false,
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
  
  // Mock implementation for from method
  const mockFromReturn = {
    select: mockSelect,
    update: mockUpdate,
    eq: mockEq,
    single: mockSingle,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DatabaseService();
    
    // Reset and rebuild the mock chain
    (supabase.from as jest.Mock).mockReturnValue(mockFromReturn);
  });

  describe('createReport', () => {
    test('should successfully create a report', async () => {
      // Setup mock
      const mockReportId = '123e4567-e89b-12d3-a456-426614174000';
      (supabase.rpc as jest.Mock).mockResolvedValue({ 
        data: mockReportId, 
        error: null 
      });

      // Test data
      const reportData = {
        property_id: 'property-123',
        creator_id: 'user-123',
        title: 'Roof Damage Report',
        description: 'Damage after recent storm',
        incident_date: '2025-04-01'
      };

      // Execute test
      const result = await service.createReport(reportData);

      // Assert results
      expect(result).toEqual({
        success: true,
        report_id: mockReportId
      });
      expect(supabase.rpc).toHaveBeenCalledWith('create_report', expect.objectContaining({
        p_property_id: reportData.property_id,
        p_creator_id: reportData.creator_id,
        p_title: reportData.title
      }));
    });

    test('should handle error when creating a report', async () => {
      // Setup mock
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error occurred' }
      });

      // Test data
      const reportData = {
        property_id: 'property-123',
        creator_id: 'user-123',
        title: 'Roof Damage Report'
      };

      // Execute test
      const result = await service.createReport(reportData);

      // Assert results
      expect(result).toEqual({
        success: false,
        error: 'Database error occurred'
      });
    });
  });

  describe('getReport', () => {
    test('should successfully get a report with related data', async () => {
      // Setup mock
      const mockReport = {
        id: 'report-123',
        title: 'Roof Damage Report',
        property: { address_line1: '123 Main St' },
        assessment_areas: [{ damage_type: 'roof', severity: 'severe' }]
      };
      
      mockSingle.mockResolvedValue({
        data: mockReport,
        error: null
      });

      // Execute test
      const result = await service.getReport('report-123');

      // Assert results
      expect(result).toEqual({
        success: true,
        data: mockReport
      });
      
      expect(supabase.from).toHaveBeenCalledWith('reports');
      expect(mockSelect).toHaveBeenCalledWith(`
          *,
          property:property_id(*),
          creator:creator_id(*),
          assessment_areas(*),
          images(*)
        `);
      expect(mockEq).toHaveBeenCalledWith('id', 'report-123');
      expect(mockSingle).toHaveBeenCalled();
    });

    test('should handle error when getting a report', async () => {
      // Setup mock
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Report not found' }
      });

      // Execute test
      const result = await service.getReport('invalid-id');

      // Assert results
      expect(result).toEqual({
        success: false,
        error: 'Report not found'
      });
    });
  });

  describe('updateReport', () => {
    test('should successfully update a report', async () => {
      // Setup mock
      const mockUpdatedReport = {
        id: 'report-123',
        title: 'Updated Report Title',
        description: 'Updated description'
      };
      
      mockSingle.mockResolvedValue({
        data: mockUpdatedReport,
        error: null
      });

      // Test data
      const updateData = {
        title: 'Updated Report Title',
        description: 'Updated description'
      };

      // Execute test
      const result = await service.updateReport('report-123', updateData);

      // Assert results
      expect(result).toEqual({
        success: true,
        data: mockUpdatedReport
      });
      
      expect(supabase.from).toHaveBeenCalledWith('reports');
      expect(mockUpdate).toHaveBeenCalledWith(updateData);
      expect(mockEq).toHaveBeenCalledWith('id', 'report-123');
      expect(mockSingle).toHaveBeenCalled();
    });

    test('should handle error when updating a report', async () => {
      // Setup mock
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      });

      // Execute test
      const result = await service.updateReport('report-123', { title: 'New Title' });

      // Assert results
      expect(result).toEqual({
        success: false,
        error: 'Update failed'
      });
    });
  });

  describe('getHomeownerProperties', () => {
    test('should successfully get homeowner properties', async () => {
      // Setup mock
      const mockProperties = [
        { id: 'property-1', address_line1: '123 Main St' },
        { id: 'property-2', address_line1: '456 Oak Ave' }
      ];
      
      // For methods that don't use single(), we need a different mock approach
      mockEq.mockResolvedValue({
        data: mockProperties,
        error: null
      });

      // Execute test
      const result = await service.getHomeownerProperties('homeowner-123');

      // Assert results
      expect(result).toEqual({
        success: true,
        data: mockProperties
      });
      
      expect(supabase.from).toHaveBeenCalledWith('properties');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('homeowner_id', 'homeowner-123');
    });

    test('should handle error when getting properties', async () => {
      // Setup mock
      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'Properties not found' }
      });

      // Execute test
      const result = await service.getHomeownerProperties('invalid-id');

      // Assert results
      expect(result).toEqual({
        success: false,
        error: 'Properties not found'
      });
    });
  });

  describe('createProperty', () => {
    test('should successfully create a property', async () => {
      // Setup mock
      const mockPropertyId = 'property-123';
      (supabase.rpc as jest.Mock).mockResolvedValue({ 
        data: mockPropertyId, 
        error: null 
      });

      // Test data
      const propertyData = {
        homeowner_id: 'homeowner-123',
        address_line1: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        postal_code: '62701',
        property_type: 'residential',
        year_built: 1995
      };

      // Execute test
      const result = await service.createProperty(propertyData);

      // Assert results
      expect(result).toEqual({
        success: true,
        property_id: mockPropertyId
      });
      
      expect(supabase.rpc).toHaveBeenCalledWith('create_property', expect.objectContaining({
        p_homeowner_profile_id: propertyData.homeowner_id,
        p_address_line1: propertyData.address_line1,
        p_city: propertyData.city
      }));
    });

    test('should handle error when creating a property', async () => {
      // Setup mock
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Invalid input data' }
      });

      // Test data
      const propertyData = {
        homeowner_id: 'homeowner-123',
        address_line1: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        postal_code: '62701'
      };

      // Execute test
      const result = await service.createProperty(propertyData);

      // Assert results
      expect(result).toEqual({
        success: false,
        error: 'Invalid input data'
      });
    });
  });

  describe('addAssessmentArea', () => {
    test('should successfully add an assessment area', async () => {
      // Setup mock
      const mockAssessmentAreaId = 'assessment-123';
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

    test('should handle error when adding an assessment area', async () => {
      // Setup mock
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Invalid damage type' }
      });

      // Test data
      const assessmentData = {
        report_id: 'report-123',
        damage_type: 'invalid-type',
        location: 'North side',
        severity: 'severe',
        added_by: 'user-123'
      };

      // Execute test
      const result = await service.addAssessmentArea(assessmentData);

      // Assert results
      expect(result).toEqual({
        success: false,
        error: 'Invalid damage type'
      });
    });
  });

  describe('Message Management', () => {
    test('should send a message successfully', async () => {
      // Setup proper mock chain for new Supabase API
      const mockSelectAfterInsert = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'msg-123',
            sender_id: 'user-1',
            receiver_id: 'user-2',
            content: 'This is a test message',
            is_read: false,
            created_at: '2025-04-29T22:15:36.108Z'
          },
          error: null
        })
      });
      
      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelectAfterInsert
      });
      
      // Reset and rebuild the mock chain for this specific test
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });
      
      // Mock message data
      const mockMessageData = {
        id: 'msg-123',
        sender_id: 'user-1',
        receiver_id: 'user-2',
        content: 'This is a test message',
        is_read: false,
        created_at: '2025-04-29T22:15:36.108Z'
      };
      
      // Test data
      const messageData = {
        sender_id: 'user-1',
        receiver_id: 'user-2',
        content: 'This is a test message'
      };
      
      // Execute test
      const result = await service.sendMessage(messageData);
      
      // Assert results
      expect(result).toEqual({
        success: true,
        data: mockMessageData
      });
      
      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(mockInsert).toHaveBeenCalledWith({
        sender_id: 'user-1',
        receiver_id: 'user-2',
        content: 'This is a test message',
        is_read: false
      });
      expect(mockSelectAfterInsert).toHaveBeenCalledWith('*');
    });
    
    test('should handle error when sending a message', async () => {
      // Setup proper mock chain for new Supabase API with error
      const mockSelectAfterInsert = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid receiver ID' }
        })
      });
      
      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelectAfterInsert
      });
      
      // Reset and rebuild the mock chain for this specific test
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });
      
      // Test data
      const messageData = {
        sender_id: 'user-1',
        receiver_id: 'invalid-user',
        content: 'This is a test message'
      };
      
      // Execute test
      const result = await service.sendMessage(messageData);
      
      // Assert results
      expect(result).toEqual({
        success: false,
        error: 'Invalid receiver ID'
      });
    });
    
    test('should get user messages successfully', async () => {
      // Setup mocks for the ordering chain
      const mockOrder = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'msg-1',
            sender_id: 'user-2',
            receiver_id: 'user-1',
            content: 'Hello there',
            is_read: false,
            created_at: '2025-04-29T10:00:00Z'
          },
          {
            id: 'msg-2',
            sender_id: 'system',
            receiver_id: 'user-1',
            content: 'Welcome to the system',
            is_read: true,
            created_at: '2025-04-28T10:00:00Z'
          }
        ],
        error: null
      });
      
      // Setup the complete chain of mock methods
      const mockEqReturnValue = { order: mockOrder };
      const mockSelectReturnValue = { eq: jest.fn().mockReturnValue(mockEqReturnValue) };
      
      // Reset mock chain completely
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelectReturnValue)
      });
      
      // Execute test
      const result = await service.getUserMessages('user-1');
      
      // Assert results
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('msg-1');
      
      // Verify the chain of method calls
      expect(supabase.from).toHaveBeenCalledWith('messages');
    });
    
    test('should filter unread messages when specified', async () => {
      // Setup mocks for nested eq chains
      const mockOrder = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'msg-1',
            sender_id: 'user-2',
            receiver_id: 'user-1',
            content: 'Hello there',
            is_read: false,
            created_at: '2025-04-29T10:00:00Z'
          }
        ],
        error: null
      });
      
      const mockEqIsRead = jest.fn().mockReturnValue({ order: mockOrder });
      
      // Reset and rebuild the mock chain for this specific test
      const mockFromChain = {
        select: jest.fn().mockReturnValue({
          eq: mockEq
        })
      };
      
      (supabase.from as jest.Mock).mockReturnValue(mockFromChain);
      mockEq.mockReturnValueOnce({ eq: mockEqIsRead });
      
      // Execute test
      const result = await service.getUserMessages('user-1', true);
      
      // Assert results
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].is_read).toBe(false);
      
      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(mockFromChain.select).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('receiver_id', 'user-1');
      expect(mockEqIsRead).toHaveBeenCalledWith('is_read', false);
    });
    
    test('should mark a message as read successfully', async () => {
      // Setup proper mock chain for new Supabase API
      const mockSingleAfterEq = jest.fn().mockResolvedValue({
        data: {
          id: 'msg-1',
          sender_id: 'user-2',
          receiver_id: 'user-1',
          content: 'Hello there',
          is_read: true,
          created_at: '2025-04-29T10:00:00Z'
        },
        error: null
      });
      
      const mockEqAfterUpdate = jest.fn().mockReturnValue({
        single: mockSingleAfterEq
      });
      
      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEqAfterUpdate
      });
      
      // Reset and rebuild the mock chain for this specific test
      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate
      });
      
      // Execute test
      const result = await service.markMessageAsRead('msg-1');
      
      // Assert results
      expect(result.success).toBe(true);
      expect(result.data.is_read).toBe(true);
      
      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(mockUpdate).toHaveBeenCalledWith({ is_read: true });
      expect(mockEqAfterUpdate).toHaveBeenCalledWith('id', 'msg-1');
      expect(mockSingleAfterEq).toHaveBeenCalled();
    });
    
    test('should handle error when marking a message as read', async () => {
      // Setup proper mock chain for new Supabase API with error
      const mockSingleAfterEq = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Message not found' }
      });
      
      const mockEqAfterUpdate = jest.fn().mockReturnValue({
        single: mockSingleAfterEq
      });
      
      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEqAfterUpdate
      });
      
      // Reset and rebuild the mock chain for this specific test
      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate
      });
      
      // Execute test
      const result = await service.markMessageAsRead('invalid-msg-id');
      
      // Assert results
      expect(result.success).toBe(false);
      expect(result.error).toBe('Message not found');
    });
  });
});