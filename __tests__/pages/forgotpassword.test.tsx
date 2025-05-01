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
    FormInput: ({ value, onChange, type, id, name, placeholder, required }) => (
        <input value={value} onChange={onChange} type={type} id={id} name={name} placeholder={placeholder} required={required} data-testid="email-input" />
    )
}));

describe('ForgotPassword Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });


    //TEST 1 it doesn't prepopulate a success
    test('renders without message initially', () => {
        render(<ForgotPassword />);
        expect(screen.queryByText('Password reset email sent! Check your inbox.')).toBeNull();
    });


    //TEST 2 Pasword reset email sent
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

    //TEST 3 Error message popluates if it fails
    test('displays error message if Supabase reset fails', async () => {
        (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValueOnce({
            error: { message: 'Something went wrong' }
        });

        render(<ForgotPassword />);

        const emailInput = screen.getByTestId('email-input');
        const submitButton = screen.getByRole('button', { name: /send reset email/i });

        fireEvent.change(emailInput, { target: { value: 'fail@test.com' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
                'fail@test.com',
                expect.any(Object)
            );
            expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        });
    });


});