import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AuthGuard from '../../../components/auth/AuthGuard';
import { supabase } from '../../../utils/supabaseClient';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/protected-route'
  })
}));

// Mock supabase client
jest.mock('../../../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn()
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis()
  }
}));

describe('AuthGuard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    // Setup mock to delay the response
    (supabase.auth.getSession as jest.Mock).mockReturnValue(
      new Promise(resolve => setTimeout(() => resolve({ data: { session: null }, error: null }), 100))
    );

    render(
      <AuthGuard>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    // Should show the loading indicator
    expect(screen.getByText('Verifying access...')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to login if no active session exists', async () => {
    // Mock no active session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null
    });

    render(
      <AuthGuard>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      // Check that we redirected to login
      expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fprotected-route');
    });
    
    // Protected content should not be rendered
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated and no specific roles are required', async () => {
    // Mock active session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { 
        session: { 
          user: { 
            id: 'user-123' 
          } 
        }
      },
      error: null
    });

    render(
      <AuthGuard>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      // Protected content should be rendered
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
    
    // Should not have called the role check since no roles are required
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('renders children when user is authenticated and has required role', async () => {
    // Mock active session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { 
        session: { 
          user: { 
            id: 'user-123' 
          } 
        }
      },
      error: null
    });

    // Mock role check
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [
          {
            roles: {
              name: 'homeowner'
            }
          }
        ],
        error: null
      })
    }));

    render(
      <AuthGuard requiredRoles={['homeowner']}>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      // Protected content should be rendered
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
    
    // Should have called the role check
    expect(supabase.from).toHaveBeenCalledWith('user_roles');
  });

  it('redirects to dashboard when user does not have required role', async () => {
    // Mock active session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { 
        session: { 
          user: { 
            id: 'user-123' 
          } 
        }
      },
      error: null
    });

    // Mock role check (user has 'user' role but 'admin' is required)
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [
          {
            roles: {
              name: 'user'
            }
          }
        ],
        error: null
      })
    }));

    render(
      <AuthGuard requiredRoles={['admin']}>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      // Check that we redirected to dashboard
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
    
    // Protected content should not be rendered
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('handles session error correctly', async () => {
    // Mock session error
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {},
      error: new Error('Session error')
    });

    render(
      <AuthGuard>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      // Check that we redirected to login
      expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fprotected-route');
    });
    
    // Protected content should not be rendered
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('handles role check error correctly when roles are required', async () => {
    // Mock active session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { 
        session: { 
          user: { 
            id: 'user-123' 
          } 
        }
      },
      error: null
    });

    // Mock role check error
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Role fetch error')
      })
    }));

    render(
      <AuthGuard requiredRoles={['admin']}>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      // Check that we redirected to dashboard
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
    
    // Protected content should not be rendered
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('handles role check error correctly when no roles are required', async () => {
    // Mock active session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { 
        session: { 
          user: { 
            id: 'user-123' 
          } 
        }
      },
      error: null
    });

    // Mock role check error but no roles are required
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockRejectedValue(new Error('Role fetch error'))
    }));

    render(
      <AuthGuard>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      // Protected content should be rendered since no roles are required
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
    
    // Should not have redirected
    expect(mockPush).not.toHaveBeenCalled();
  });
});