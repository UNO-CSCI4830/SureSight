// Mock environment variables before importing the module
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.com';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

import { supabase } from '../../utils/supabaseClient';

// Mock the React hooks
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  return {
    ...originalReact,
    useState: jest.fn(),
    useEffect: jest.fn()
  };
});

// Mock Supabase client
jest.mock('../../utils/supabaseClient', () => {
  const mockAuth = {
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({ 
      data: { 
        subscription: { 
          unsubscribe: jest.fn() 
        } 
      } 
    })),
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn()
  };

  return {
    supabase: {
      auth: mockAuth,
      from: jest.fn()
    }
  };
});

describe('Supabase Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Tests for direct auth methods
  describe('Authentication Methods', () => {
    // Helper function to simulate a simple auth service
    const authService = {
      async signUp(email: string, password: string) {
        try {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
          return { success: true, data };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
      
      async signIn(email: string, password: string) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          return { success: true, data };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
      
      async signOut() {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }
    };

    test('should call signUp with correct parameters', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: { id: 'new-user' } },
        error: null
      });
      
      const email = 'newuser@example.com';
      const password = 'securePassword123';
      
      const result = await authService.signUp(email, password);
      
      expect(result.success).toBe(true);
      expect(supabase.auth.signUp).toHaveBeenCalledWith({ 
        email, 
        password 
      });
    });

    test('should handle signUp errors', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Email already in use' }
      });
      
      const result = await authService.signUp('existing@example.com', 'password');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already in use');
    });

    test('should call signIn with correct parameters', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null
      });
      
      const email = 'user@example.com';
      const password = 'correctPassword';
      
      const result = await authService.signIn(email, password);
      
      expect(result.success).toBe(true);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ 
        email, 
        password 
      });
    });

    test('should handle signIn errors', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      });
      
      const result = await authService.signIn('user@example.com', 'wrongPassword');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid login credentials');
    });

    test('should call signOut correctly', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null
      });
      
      const result = await authService.signOut();
      
      expect(result.success).toBe(true);
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    test('should handle signOut errors', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Network error' }
      });
      
      const result = await authService.signOut();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});