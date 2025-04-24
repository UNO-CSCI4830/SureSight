import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormInput from '../../../components/ui/FormInput';

describe('FormInput Component', () => {
  const defaultProps = {
    id: 'test-input',
    value: '',
    onChange: jest.fn(),
  };

  it('renders correctly with minimal props', () => {
    render(<FormInput {...defaultProps} />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'test-input');
    expect(input).toHaveAttribute('name', 'test-input');
  });

  it('renders with a label when provided', () => {
    render(<FormInput {...defaultProps} label="Test Label" />);
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  it('shows required indicator when required prop is true', () => {
    render(<FormInput {...defaultProps} label="Required Field" required />);
    // Look for the asterisk directly
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('calls onChange handler when input value changes', async () => {
    const handleChange = jest.fn();
    render(<FormInput {...defaultProps} onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'test');
    
    expect(handleChange).toHaveBeenCalledTimes(4); // Once per character
  });

  it('shows error message when error prop is provided', () => {
    const errorMessage = 'This field is required';
    render(<FormInput {...defaultProps} error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    
    // Input should have error styling
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500');
  });

  it('shows help text when helpText prop is provided', () => {
    const helpText = 'Enter your email address';
    render(<FormInput {...defaultProps} helpText={helpText} />);
    
    expect(screen.getByText(helpText)).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<FormInput {...defaultProps} disabled />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('can have different input types', () => {
    const { rerender } = render(<FormInput {...defaultProps} type="email" />);
    let input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
    
    // For password inputs, we need to use getByTestId or another query strategy
    rerender(<FormInput {...defaultProps} type="password" />);
    input = screen.getByDisplayValue(''); // Find by empty value
    expect(input).toHaveAttribute('type', 'password');
    
    rerender(<FormInput {...defaultProps} type="number" />);
    input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('type', 'number');
  });

  it('supports min and max attributes for number inputs', () => {
    render(
      <FormInput 
        {...defaultProps} 
        type="number" 
        min={0} 
        max={100} 
      />
    );
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
  });

  it('applies custom className', () => {
    render(<FormInput {...defaultProps} className="custom-class" />);
    
    // The className should be applied to the wrapper div
    const wrapper = screen.getByRole('textbox').parentElement;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('can be set to readonly', () => {
    render(<FormInput {...defaultProps} readOnly />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
  });
});