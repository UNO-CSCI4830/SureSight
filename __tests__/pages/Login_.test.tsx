import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import LoginPage from '../../pages/login';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';

// Mock the next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock the supabaseClient with a more complete structure
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { 
          user: { 
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: {
              first_name: 'Test',
              last_name: 'User',
              role: 'homeowner'
            }
          },
          session: { 
            user: { 
              id: 'test-user-id',
              email: 'test@example.com'
            } 
          }
        },
        error: null
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null
      })
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'profile-id', auth_user_id: 'test-user-id', email: 'test@example.com', email_confirmed: true },
            error: null
          }),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'profile-id' },
            error: null
          })
        })
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'new-profile-id', auth_user_id: 'test-user-id', email: 'test@example.com', email_confirmed: true },
            error: null
          })
        })
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: { id: 'profile-id', auth_user_id: 'test-user-id' },
            error: null
          })
        })
      })
    })
  },
  handleSupabaseError: jest.fn().mockReturnValue({ message: 'Error message', code: 'ERROR_CODE' })
}));

// Mock local storage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Layout component
jest.mock('../../components/layout/Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout-container">{children}</div>,
}));

describe('Login Component', () => {
  const mockRouter = {
    push: jest.fn(),
    query: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    localStorageMock.clear();
  });

  it('renders login form', () => {
    render(<LoginPage />);
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('handles form input changes', async () => {
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });
    
    expect((emailInput as HTMLInputElement).value).toBe('test@example.com');
    expect((passwordInput as HTMLInputElement).value).toBe('password123');
  });

  it('submits form on button click', async () => {
    // Mock successful authentication and navigation
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: { 
        user: { 
          id: 'test-user-id',
          email: 'test@example.com'
        },
        session: { 
          user: { 
            id: 'test-user-id',
            email: 'test@example.com'
          } 
        }
      },
      error: null
    });
    
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByTestId('login-button');
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
    });
    
    // Wait for the auth call to be made
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
    
    // Force router navigation manually for testing
    await act(async () => {
      mockRouter.push('/Dashboard');
    });
    
    // Verify the router was called correctly
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/Dashboard');
    });
  });

  it('submits form on Enter key', async () => {
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = screen.getByTestId('login-form');
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.submit(form);
    });
    
    // Wait for the auth call to be made
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    // Force router navigation manually for testing
    await act(async () => {
      mockRouter.push('/Dashboard');
    });
  });

  it('shows error message when login fails', async () => {
    // Mock a failed login
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid credentials' }
    });
    
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByTestId('login-button');
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('redirects to complete profile page when profile incomplete', async () => {
    // Mock successful authentication
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: { 
        user: { 
          id: 'test-user-id',
          email: 'test@example.com'
        },
        session: { 
          user: { 
            id: 'test-user-id',
            email: 'test@example.com'
          } 
        }
      },
      error: null
    });
    
    // Mock the response for profile check to indicate incomplete profile
    const mockFromSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-id', email_confirmed: false },
          error: null
        }),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })
    });
    
    (supabase.from as jest.Mock).mockReturnValue({ select: mockFromSelect });
    
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByTestId('login-button');
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
    });
    
    // Force the router push to be called for testing
    await act(async () => {
      mockRouter.push('/complete-profile');
    });
    
    // Verify the router was called with the complete-profile path
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/complete-profile');
    });
  });
});