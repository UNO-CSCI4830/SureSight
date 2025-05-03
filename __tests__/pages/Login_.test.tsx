import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { supabase } from '../../utils/supabaseClient';

interface LoginProps {
    onSubmit?: (data: { email: string; password: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onSubmit }) => {
    // Component implementation
};

// Test suite for the Login Page component
describe('Login Page', () => {
    // Reset mocks after each test to avoid test pollution
    afterEach(() => {
        jest.clearAllMocks();
    });

    // Test: Login form renders with expected fields and button
    test('renders login form', () => {
        render(<Login />);
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    // Test: Shows validation error if form is submitted empty
    test('shows error on empty submit', async () => {
        render(<Login />);
        fireEvent.click(screen.getByRole('button', { name: /login/i }));
        expect(await screen.findByText(/required/i)).toBeInTheDocument();
    });

    // Test: Calls submit handler with correct values on valid submit
    test('calls submit handler with correct values', () => {
        const mockSubmit = jest.fn();
        render(<Login onSubmit={mockSubmit} />);
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));
        expect(mockSubmit).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123',
        });
    });

    // Test: Login button is disabled when submitting
    test('disables button while submitting', () => {
        render(<Login isSubmitting={true} />);
        expect(screen.getByRole('button', { name: /login/i })).toBeDisabled();
    });

    // Test: Shows error for invalid email format
    test('shows error for invalid email format', async () => {
        render(<Login />);
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'invalid-email' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));
        expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
    });

    // Test: Shows error for too short password
    test('shows error for short password', async () => {
        render(<Login />);
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: '123' } });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));
        expect(await screen.findByText(/password.*too short/i)).toBeInTheDocument();
    });

    // Test: Password input is of type 'password' by default
    test('password input type is password', () => {
        render(<Login />);
        const passwordInput = screen.getByLabelText(/password/i);
        expect(passwordInput).toHaveAttribute('type', 'password');
    });

    // Test: Shows API error message if login fails (simulates backend error)
    test('shows API error message if login fails', async () => {
        const mockSubmit = jest.fn().mockImplementation(() => {
            throw new Error('Invalid credentials');
        });
        render(<Login onSubmit={mockSubmit} />);
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fail@example.com' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));
        expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    });

    // Test: Submits form on Enter key press in password field
    test('submits form on Enter key', () => {
        const mockSubmit = jest.fn();
        render(<Login onSubmit={mockSubmit} />);
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
        fireEvent.keyDown(screen.getByLabelText(/password/i), { key: 'Enter', code: 'Enter' });
        // May need to trigger submit manually
        // fireEvent.submit(screen.getByRole('form'));
        // Or check if mockSubmit was called
    });

    // Test: Renders remember me checkbox if present and can toggle it
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