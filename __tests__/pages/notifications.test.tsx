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
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      })),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(callback => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      })
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
      expect(screen.getByText(/from: user-123/i)).toBeInTheDocument();
      expect(screen.getByText(/hello from another user!/i)).toBeInTheDocument();
    });
  });

  test('handles mark as read', async () => {
    const user = userEvent.setup();
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/mark as read/i)).toBeInTheDocument();
    });

    const button = screen.getByText(/mark as read/i);
    await user.click(button);

    // Success is implied if no errors are thrown
    expect(screen.queryByText(/error marking message as read/i)).not.toBeInTheDocument();
  });

  test('displays error from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Fetch failed' }),
    });

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/fetch failed/i)).toBeInTheDocument();
    });
  });

  test('displays empty message state', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
    });
  });
});