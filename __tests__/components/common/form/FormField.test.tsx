import React from 'react';
import { render, screen } from '@testing-library/react';
import FormField from '../../../../components/common/form/FormField';

describe('FormField Component', () => {
  const defaultProps = {
    id: 'test-field',
    children: <input id="test-field" type="text" />
  };

  it('renders children correctly', () => {
    render(<FormField {...defaultProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<FormField {...defaultProps} label="Field Label" />);
    expect(screen.getByText('Field Label')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    const { container } = render(<FormField {...defaultProps} />);
    const label = container.querySelector('label');
    expect(label).not.toBeInTheDocument();
  });

  it('shows required indicator when required prop is true', () => {
    render(<FormField {...defaultProps} label="Required Field" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not show required indicator when required prop is false', () => {
    render(<FormField {...defaultProps} label="Optional Field" required={false} />);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('shows help text when helpText prop is provided', () => {
    const helpText = 'This is a helpful instruction';
    render(<FormField {...defaultProps} helpText={helpText} />);
    
    const helpElement = screen.getByText(helpText);
    expect(helpElement).toBeInTheDocument();
    expect(helpElement).toHaveClass('text-gray-500');
  });

  it('shows error message when error prop is provided', () => {
    const errorMessage = 'This field is required';
    render(<FormField {...defaultProps} error={errorMessage} />);
    
    const errorElement = screen.getByText(errorMessage);
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveClass('text-red-600');
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-field-class';
    const { container } = render(<FormField {...defaultProps} className={customClass} />);
    
    const fieldDiv = container.firstChild as HTMLElement;
    expect(fieldDiv).toHaveClass(customClass);
  });
});