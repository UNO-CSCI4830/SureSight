import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../../pages/login';
import { supabase } from '../../utils/supabaseClient';

// Mock supabase client
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
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
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
  }
}));

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    query: {}
  })
}));

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows validation error if form is submitted empty', async () => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  test('calls submit handler with correct values', async () => {
    const mockSubmit = jest.fn();
    render(<Login onSubmit={mockSubmit} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  test('disables button while submitting', () => {
    render(<Login isSubmitting={true} />);
    expect(screen.getByRole('button', { name: /login/i })).toBeDisabled();
  });

  test('shows error for too short password', async () => {
    render(<Login />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/password.*too short/i)).toBeInTheDocument();
    });
  });

  test('password input type is password', () => {
    render(<Login />);
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('shows API error message if login fails', async () => {
    const mockSubmit = jest.fn().mockImplementation(() => {
      throw new Error('Invalid credentials');
    });
    render(<Login onSubmit={mockSubmit} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fail@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  test('submits form on Enter key', async () => {
    const mockSubmit = jest.fn();
    render(<Login onSubmit={mockSubmit} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.keyDown(screen.getByLabelText(/password/i), { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  test('renders remember me checkbox if present and can toggle', () => {
    render(<Login />);
    const rememberCheckbox = screen.queryByLabelText(/remember me/i);
    if (rememberCheckbox) {
      expect(rememberCheckbox).not.toBeChecked();
      fireEvent.click(rememberCheckbox);
      expect(rememberCheckbox).toBeChecked();
    }
  });
});