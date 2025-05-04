// Mock environment variables before importing modules
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.com';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

// Mock the supabaseClient module
jest.mock('../../utils/supabaseClient', () => {
  return {
    supabase: {
      from: jest.fn(),
      auth: {
        getUser: jest.fn(),
        resend: jest.fn(),
        signUp: jest.fn()
      }
    }
  };
});

import { supabase } from '../../utils/supabaseClient';

/**
 * Utility class for email verification functions
 */
class EmailVerificationService {
  /**
   * Updates a user's email verification status in the database
   */
  static async updateVerificationStatus(userId: string, isVerified: boolean) {
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
        data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update verification status'
      };
    }
  }

  /**
   * Resends a verification email to the user
   */
  static async resendVerificationEmail(email: string, redirectUrl: string) {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;
      
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send verification email'
      };
    }
  }

  /**
   * Checks if a user's email is verified
   */
  static async isEmailVerified(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email_confirmed')
        .eq('auth_user_id', userId)
        .single();

      if (error) throw error;
      
      return {
        success: true,
        isVerified: data?.email_confirmed || false
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to check email verification status',
        isVerified: false
      };
    }
  }
}

describe('Email Verification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateVerificationStatus', () => {
    test('should update verification status successfully', async () => {
      // Setup mocks for update chain
      const mockSingle = jest.fn().mockResolvedValue({
        data: { 
          id: 'user-1', 
          email_confirmed: true, 
          auth_user_id: 'auth-1',
          email: 'test@example.com'
        },
        error: null
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle
      });

      const mockEq = jest.fn().mockReturnValue({
        select: mockSelect
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate
      });

      // Execute test
      const result = await EmailVerificationService.updateVerificationStatus('auth-1', true);

      // Assert results
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        id: 'user-1',
        email_confirmed: true
      }));

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(mockUpdate).toHaveBeenCalledWith({ email_confirmed: true });
      expect(mockEq).toHaveBeenCalledWith('auth_user_id', 'auth-1');
    });

    test('should handle error when updating verification status', async () => {
      // Setup mocks for error case
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle
      });

      const mockEq = jest.fn().mockReturnValue({
        select: mockSelect
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate
      });

      // Execute test
      const result = await EmailVerificationService.updateVerificationStatus('invalid-id', true);

      // Assert results
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('resendVerificationEmail', () => {
    test('should resend verification email successfully', async () => {
      // Setup mock
      (supabase.auth.resend as jest.Mock).mockResolvedValue({
        data: {},
        error: null
      });

      // Execute test
      const result = await EmailVerificationService.resendVerificationEmail(
        'test@example.com', 
        'https://example.com/verify'
      );

      // Assert results
      expect(result.success).toBe(true);
      expect(supabase.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'test@example.com',
        options: {
          emailRedirectTo: 'https://example.com/verify'
        }
      });
    });

    test('should handle error when resending verification email', async () => {
      // Setup mock for error case
      (supabase.auth.resend as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Email not found' }
      });

      // Execute test
      const result = await EmailVerificationService.resendVerificationEmail(
        'invalid@example.com', 
        'https://example.com/verify'
      );

      // Assert results
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email not found');
    });
  });

  describe('isEmailVerified', () => {
    test('should check if email is verified successfully', async () => {
      // Setup mocks
      const mockSingle = jest.fn().mockResolvedValue({
        data: { email_confirmed: true },
        error: null
      });

      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      // Execute test
      const result = await EmailVerificationService.isEmailVerified('auth-1');

      // Assert results
      expect(result.success).toBe(true);
      expect(result.isVerified).toBe(true);

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith('email_confirmed');
      expect(mockEq).toHaveBeenCalledWith('auth_user_id', 'auth-1');
    });

    test('should handle unverified email status', async () => {
      // Setup mocks for unverified case
      const mockSingle = jest.fn().mockResolvedValue({
        data: { email_confirmed: false },
        error: null
      });

      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      // Execute test
      const result = await EmailVerificationService.isEmailVerified('auth-1');

      // Assert results
      expect(result.success).toBe(true);
      expect(result.isVerified).toBe(false);
    });

    test('should handle error when checking verification status', async () => {
      // Setup mocks for error case
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      // Execute test
      const result = await EmailVerificationService.isEmailVerified('invalid-id');

      // Assert results
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(result.isVerified).toBe(false);
    });
  });
});