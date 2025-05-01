import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Define mocks before importing the component
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockChannel = jest.fn();
const mockRemoveChannel = jest.fn();

// Mock the module before importing the component
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
    from: jest.fn(() => ({
      update: mockUpdate.mockReturnThis(),
      eq: mockEq,
    })),
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
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

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com'
        }
      }
    });

    mockChannel.mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      }),
    });
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
    mockUpdate.mockResolvedValue({ error: null });

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/mark as read/i)).toBeInTheDocument();
    });

    const button = screen.getByText(/mark as read/i);
    userEvent.click(button);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'msg-1');
    });
  });

  test('displays error from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
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
