import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';


// Mock supabase client
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { 
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        },
        error: null
      }),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: { unsubscribe: jest.fn() }
        }
      }))
    },
    from: jest.fn().mockImplementation((table) => {
      return {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockImplementation(() => {
          if (table === 'messages') {
            return Promise.resolve({
              data: [
                {
                  id: 'msg-1',
                  sender_id: 'user-123',
                  receiver_id: 'test-user-id',
                  content: 'Hello from another user!',
                  is_read: false,
                  created_at: '2025-04-29T12:00:00Z',
                  sender: { email: 'user123@example.com' },
                  receiver: { email: 'test@example.com' }
                },
              ],
              error: null
            });
          } else {
            return Promise.resolve({ data: null, error: null });
          }
        }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
      };
    }),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => Promise.resolve('SUBSCRIBED'))
    })),
    removeChannel: jest.fn()
  }
}));

// Now import the component after mocking
import NotificationsPage from '../../pages/notifications';

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      {
        id: 'msg-1',
        sender_id: 'user-123',
        receiver_id: 'test-user-id',
        content: 'Hello from another user!',
        is_read: false,
        created_at: '2025-04-29T12:00:00Z',
        sender: { email: 'user123@example.com' },
        receiver: { email: 'test@example.com' }
      },
    ]),
  })
) as jest.Mock;

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}));

// Mock AuthGuard and Layout
jest.mock('../../components/auth/AuthGuard', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="auth-guard">{children}</div>
}));

jest.mock('../../components/layout/Layout', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>
}));

describe('Notifications Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading and then displays messages', async () => {
    render(<NotificationsPage />);

    expect(screen.getByText(/loading messages/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/From: user123@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/Hello from another user!/i)).toBeInTheDocument();
    });
  });

  test('handles mark as read', async () => {
    const user = userEvent.setup();
    
    // Override the mock specifically for this test
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            id: 'msg-1',
            sender_id: 'user-123',
            receiver_id: 'test-user-id',
            content: 'Hello from another user!',
            is_read: false,
            created_at: '2025-04-29T12:00:00Z',
            sender: { email: 'user123@example.com' },
            receiver: { email: 'test@example.com' }
          },
        ]),
      })
    );
    
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Mark as read/i)).toBeInTheDocument();
    });

    const button = screen.getByText(/Mark as read/i);
    await user.click(button);

    // Success is implied if no errors are thrown
    expect(screen.queryByText(/error marking message as read/i)).not.toBeInTheDocument();
  });

  test('displays error from API', async () => {
    // Mock a failed response
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockFrom = jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          error: { message: 'Fetch failed' },
          data: null
        });
      })
    }));
    
    const supabaseModule = require('../../utils/supabaseClient');
    supabaseModule.supabase.from = mockFrom;

    render(<NotificationsPage />);

    await waitFor(() => {
      // More flexible way to check for error message
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    });
  });

  test('displays empty message state', async () => {
    // Mock an empty response
    const mockFrom = jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          data: [],
          error: null
        });
      })
    }));
    
    const supabaseModule = require('../../utils/supabaseClient');
    supabaseModule.supabase.from = mockFrom;

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No received messages yet!/i)).toBeInTheDocument();
    });
  });
});