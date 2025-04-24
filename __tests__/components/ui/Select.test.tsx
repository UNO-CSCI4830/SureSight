import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Select from '../../../components/ui/Select';

describe('Select Component', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ];
  
  const defaultProps = {
    id: 'test-select',
    value: '',
    onChange: jest.fn(),
    options: options
  };

  it('renders correctly with default props', () => {
    render(<Select {...defaultProps} />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveAttribute('id', 'test-select');
  });

  it('renders all options correctly', () => {
    render(<Select {...defaultProps} />);
    
    options.forEach(option => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
    
    // Verify the correct number of options (no extra options)
    const optionElements = screen.getAllByRole('option');
    expect(optionElements).toHaveLength(options.length);
  });

  it('renders label when provided', () => {
    render(<Select {...defaultProps} label="Select an option" />);
    
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('shows required indicator when required prop is true', () => {
    render(<Select {...defaultProps} label="Required Field" required />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('calls onChange handler when selection changes', () => {
    const handleChange = jest.fn();
    render(<Select {...defaultProps} onChange={handleChange} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option2' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('shows error message when error prop is provided', () => {
    const errorMessage = 'Please select an option';
    render(<Select {...defaultProps} error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    
    // Select should have error styling
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('border-red-500');
  });

  it('shows help text when helpText prop is provided', () => {
    const helpText = 'Choose from the available options';
    render(<Select {...defaultProps} helpText={helpText} />);
    
    expect(screen.getByText(helpText)).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<Select {...defaultProps} disabled />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('uses name attribute when provided', () => {
    render(<Select {...defaultProps} name="custom-name" />);
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('name', 'custom-name');
  });

  it('uses id as name attribute when name is not provided', () => {
    render(<Select {...defaultProps} />);
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('name', 'test-select');
  });

  it('renders placeholder option when placeholder is provided', () => {
    const placeholder = 'Select an item...';
    render(<Select {...defaultProps} placeholder={placeholder} />);
    
    // First option should be the placeholder
    expect(screen.getByText(placeholder)).toBeInTheDocument();
    
    // There should be options.length + 1 option elements due to placeholder
    const optionElements = screen.getAllByRole('option');
    expect(optionElements).toHaveLength(options.length + 1);
    expect(optionElements[0]).toHaveTextContent(placeholder);
  });

  it('applies custom className to wrapper div', () => {
    const customClass = 'custom-select-class';
    const { container } = render(<Select {...defaultProps} className={customClass} />);
    
    const wrapperDiv = container.firstChild as HTMLElement;
    expect(wrapperDiv).toHaveClass(customClass);
  });
});