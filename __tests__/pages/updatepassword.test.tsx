import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const mockUpdateUser = jest.fn();
const mockSetSession = jest.fn().mockResolvedValue({
    data: { session: { user: { id: 'test-user-id' } } },
    error: null
});
const mockGetSession = jest.fn().mockResolvedValue({
    data: {
        session: {
            user: { id: 'test-user-id' },
            access_token: 'fake-access-token'
        }
    }
});
const mockPush = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        auth: {
            updateUser: mockUpdateUser,
            setSession: mockSetSession,
            getSession: mockGetSession
        }
    })
}));

jest.mock('next/router', () => ({
    useRouter: () => ({
        push: mockPush
    })
}));

jest.mock('../../components/layout/Layout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

import UpdatePassword from '../../pages/updatepassword';


describe('UpdatePassword Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.location.hash = '#access_token=fake-access-token&refresh_token=fake-refresh-token';
    });

    //Test 1 Page fully loads
    test('renders without error message initially', () => {
        render(<UpdatePassword />);

        expect(screen.getByText('Update Password')).toBeInTheDocument();
        expect(screen.queryByText(/Password must be at least 8 characters long/)).toBeNull();
    });

    //Test 2 Passwords match upon submit and redirects to login
    test('submits matching passwords and shows success message', async () => {
        mockUpdateUser.mockResolvedValueOnce({ data: {}, error: null });

        render(<UpdatePassword />);

        const passwordInput = await screen.findByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: /Update Password/i });

        fireEvent.change(passwordInput, { target: { value: 'ValidP@ssword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'ValidP@ssword123' } });

        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Password updated successfully/i)).toBeInTheDocument();
        });
    });

    //Test 3 Passwords do not match
    test('shows error if passwords do not match', async () => {
        render(<UpdatePassword />);
        await waitFor(() => {
            expect(screen.getByLabelText('New Password')).toBeInTheDocument();
        });
    
        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: /Update Password/i });
    
        fireEvent.change(passwordInput, { target: { value: 'ValidP@ssword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentP@ssword123' } });
    
        fireEvent.click(submitButton);
    
        await waitFor(() => {
            expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
        });
        expect(mockPush).not.toHaveBeenCalled();
    });

    test('validates password requirements', async () => {
        render(<UpdatePassword />);
        const passwordInput = await screen.findByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: /Update Password/i });

        // Test minimum length requirement
        fireEvent.change(passwordInput, { target: { value: 'short' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            const errorMessages = screen.getAllByText(/must be at least 8 characters/i);
            expect(errorMessages.length).toBeGreaterThan(0);
        });

        // Test number requirement
        fireEvent.change(passwordInput, { target: { value: 'Passwordlong!' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'Passwordlong!' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText(/must contain at least one number/i)).toBeInTheDocument();
        });

        // Test special character requirement
        fireEvent.change(passwordInput, { target: { value: 'Password123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText(/must contain at least one special character/i)).toBeInTheDocument();
        });

        // Test uppercase requirement
        fireEvent.change(passwordInput, { target: { value: 'password123!' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'password123!' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText(/must contain at least one uppercase letter/i)).toBeInTheDocument();
        });

        // Test lowercase requirement
        fireEvent.change(passwordInput, { target: { value: 'PASSWORD123!' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'PASSWORD123!' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText(/must contain at least one lowercase letter/i)).toBeInTheDocument();
        });
    });

    test('shows success message and redirects after successful password update', async () => {
        mockUpdateUser.mockResolvedValueOnce({ data: {}, error: null });
        render(<UpdatePassword />);

        const passwordInput = await screen.findByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: /Update Password/i });

        fireEvent.change(passwordInput, { target: { value: 'ValidP@ssword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'ValidP@ssword123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Password updated successfully/i)).toBeInTheDocument();
        });
        
        // Wait for redirect timeout to complete
        await waitFor(() => {
            expect(mockPush).toHaveBeenCalled();
        }, { timeout: 3000 });
    });
});