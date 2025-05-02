import React from 'react'
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForElementToBeRemoved } from '@testing-library/react';
import SignUp from '../../pages/signup';

/*
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
    },
  },
}));

*/

describe('Signup form test', () => {

  test('sign up form', () => {
    render(<SignUp />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  test('should display the main heading and description', () => {
    render(<SignUp />);
    expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();
    expect(screen.getByText(/join suresight to start streamlining/i)).toBeInTheDocument();
  });

  test('should display the login link initially', () => {
    render(<SignUp />);
    const loginLink = screen.getByRole('link', { name: /log in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login'); // Ensure the href is correct
  });

  test('should allow typing into input fields', async () => {
    const user = userEvent.setup();
    render(<SignUp />);
  
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i); // Use precise regex
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
  
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'securepassword123');
    await user.type(confirmPasswordInput, 'securepassword123');
  
    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('securepassword123');
    expect(confirmPasswordInput).toHaveValue('securepassword123');
  });

 test('should display error if password is too short', async () => {
    const user = userEvent.setup();
    render(<SignUp />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'short');
    await user.type(confirmPasswordInput, 'short');
    await user.click(submitButton);

   // Check for the password length error message
   expect(await screen.findByText('Password must be at least 8 characters long')).toBeInTheDocument();
 });

  test('should display success message', async () => {
    const user = userEvent.setup();
    const mockHandleSignUp = jest.fn(() => {
       // render(<SignUp onSubmitSuccess={() => { setIsSubmitted(true); }} />);
       // mockApiCall.mockResolvedValue({ success: true });
       return Promise.resolve({ success: true });
    });
  
    render(<SignUp handleSignUp={mockHandleSignUp} />);
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'securepassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'securepassword123');
    await user.selectOptions(screen.getByLabelText(/i am a.../i), 'contractor');
  
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);
    
    //const successHeading = await screen.getByLabelText(/verification email sent/i);
    //expect(successHeading).toBeInTheDocument();
 
  });

  });
