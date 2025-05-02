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
    default: ({ children }) => <div>{children}</div>
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
        mockUpdateUser.mockResolvedValueOnce({ error: null });

        render(<UpdatePassword />);

        const passwordInput = await screen.findByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: /Update Password/i });

        fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });

        fireEvent.click(submitButton);

        expect(await screen.findByText(/Password updated successfully/i)).toBeInTheDocument();
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
    
        fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
    
        fireEvent.click(submitButton);
    
        expect(await screen.findByText(/Passwords do not match/)).toBeInTheDocument();
        expect(mockPush).not.toHaveBeenCalled();
    });

});