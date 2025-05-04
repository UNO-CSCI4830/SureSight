import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../../pages/login';
import { supabase } from '../../utils/supabaseClient';

// Mock supabase client
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: 'test@example.com' }
        },
        error: null
      }),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: { unsubscribe: jest.fn() }
        }
      })),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null })
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { id: 'test-db-id' }, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'test-profile-id' }, error: null })
  }
}));

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    query: {}
  })
}));

// Mock Layout component
jest.mock('../../components/layout/Layout', () => {
  return {
    __esModule: true,
    default: ({ children }) => <div data-testid="layout-container">{children}</div>
  };
});

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows validation error if form is submitted empty', async () => {
    render(<Login />);
    fireEvent.click(screen.getByTestId('login-button'));
    
    await waitFor(() => {
      expect(screen.getAllByText(/required/i)).toHaveLength(2);
    });
  });

  test('disables button while submitting', async () => {
    const { getByTestId } = render(<Login />);
    
    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'password123' } 
    });
    
    // Submit form
    fireEvent.click(getByTestId('login-button'));
    
    // Button should be disabled during submission
    expect(getByTestId('login-button')).toBeDisabled();
    // Should show loading state
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });

  test('shows error for too short password', async () => {
    render(<Login />);
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: '123' } 
    });
    fireEvent.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  test('shows API error message if login fails', async () => {
    // Mock a failed login
    (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValueOnce(
      new Error('Invalid credentials')
    );

    render(<Login />);
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'fail@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'wrongpass' } 
    });
    fireEvent.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  test('submits form on Enter key', async () => {
    render(<Login />);
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'password123' } 
    });
    fireEvent.keyDown(screen.getByLabelText(/password/i), { 
      key: 'Enter', 
      code: 'Enter' 
    });

    // Verify that supabase.auth.signInWithPassword was called with correct credentials
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });
});