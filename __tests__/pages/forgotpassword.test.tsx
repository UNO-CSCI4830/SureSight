import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ForgotPassword from '../../pages/forgotpassword';
import { supabase } from '../../utils/supabaseClient';

jest.mock('../../utils/supabaseClient', () => ({
    supabase: {
        auth: {
            resetPasswordForEmail: jest.fn()
        }
    }
}));
  

jest.mock('../../components/layout/Layout', () => ({
    __esModule: true,
    default: ({ children }) => <div data-testid="mocked-layout">{children}</div>
}));

jest.mock('../../components/ui', () => ({
    __esModule:true,
    FormInput: ({ value, onChange, ...props }) => (
        <input value={value} onChange={onChange} {...props} data-testid="email-input" />
    )
}));

describe('ForgotPassword Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('submits email, calls supabase reset', async () => {
        (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValueOnce({ error: null });
        render(<ForgotPassword />);

        const emailInput = screen.getByTestId('email-input');
        const submitButton = screen.getByRole('button', { name: /send reset email/i });
        
        fireEvent.change(emailInput, { target: { value: 'fake@test.com' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
                'fake@test.com',
                expect.objectContaining({ redirectTo: expect.stringContaining('/updatepassword') })
            );
            expect(screen.getByText('Password reset email sent! Check your inbox.')).toBeInTheDocument();
        });
    });
});