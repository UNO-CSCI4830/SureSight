import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TextArea from '../../../components/ui/TextArea';

describe('TextArea Component', () => {
  const defaultProps = {
    id: 'test-textarea',
    value: '',
    onChange: jest.fn()
  };

  it('renders correctly with default props', () => {
    render(<TextArea {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('id', 'test-textarea');
    expect(textarea).toHaveAttribute('rows', '3'); // Default rows
  });

  it('renders with custom rows attribute', () => {
    render(<TextArea {...defaultProps} rows={5} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('renders label when provided', () => {
    render(<TextArea {...defaultProps} label="Text Area Label" />);
    
    expect(screen.getByText('Text Area Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Text Area Label')).toBeInTheDocument();
  });

  it('shows required indicator when required prop is true', () => {
    render(<TextArea {...defaultProps} label="Required Field" required />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('calls onChange handler when textarea value changes', () => {
    const handleChange = jest.fn();
    render(<TextArea {...defaultProps} onChange={handleChange} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New text content' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('shows error message when error prop is provided', () => {
    const errorMessage = 'This field is required';
    render(<TextArea {...defaultProps} error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    
    // TextArea should have error styling
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('border-red-500');
  });

  it('shows help text when helpText prop is provided', () => {
    const helpText = 'Enter your comments here';
    render(<TextArea {...defaultProps} helpText={helpText} />);
    
    expect(screen.getByText(helpText)).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<TextArea {...defaultProps} disabled />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('uses name attribute when provided', () => {
    render(<TextArea {...defaultProps} name="custom-name" />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('name', 'custom-name');
  });

  it('uses id as name attribute when name is not provided', () => {
    render(<TextArea {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('name', 'test-textarea');
  });

  it('applies custom placeholder text', () => {
    const placeholder = 'Type your message here';
    render(<TextArea {...defaultProps} placeholder={placeholder} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder', placeholder);
  });

  it('applies custom className to wrapper div', () => {
    const customClass = 'custom-textarea-class';
    const { container } = render(<TextArea {...defaultProps} className={customClass} />);
    
    const wrapperDiv = container.firstChild as HTMLElement;
    expect(wrapperDiv).toHaveClass(customClass);
  });
});