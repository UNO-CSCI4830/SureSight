import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StatusMessage from '../../../../components/common/display/StatusMessage';

// Mock the Icon component
jest.mock('../../../../components/ui/icons/Icon', () => {
  return function MockIcon({ name, className }: { name: string, className?: string }) {
    return <span data-testid={`icon-${name}`} className={className}>{name}</span>;
  };
});

describe('StatusMessage Component', () => {
  test('renders success message with icon', () => {
    const { container } = render(<StatusMessage text="Operation successful" type="success" />);
    
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
    expect(screen.getByTestId('icon-success')).toBeInTheDocument();
    
    // Check styling on outer container
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('bg-green-50');
    expect(outerDiv).toHaveClass('text-green-800');
    expect(outerDiv).toHaveClass('border-green-200');
  });

  test('renders error message with icon', () => {
    const { container } = render(<StatusMessage text="An error occurred" type="error" />);
    
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(screen.getByTestId('icon-error')).toBeInTheDocument();
    
    // Check styling on outer container
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('bg-red-50');
    expect(outerDiv).toHaveClass('text-red-800');
    expect(outerDiv).toHaveClass('border-red-200');
  });

  test('renders warning message with icon', () => {
    const { container } = render(<StatusMessage text="This is a warning" type="warning" />);
    
    expect(screen.getByText('This is a warning')).toBeInTheDocument();
    expect(screen.getByTestId('icon-warning')).toBeInTheDocument();
    
    // Check styling on outer container
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('bg-amber-50');
    expect(outerDiv).toHaveClass('text-amber-800');
    expect(outerDiv).toHaveClass('border-amber-200');
  });

  test('renders info message with icon', () => {
    const { container } = render(<StatusMessage text="This is information" type="info" />);
    
    expect(screen.getByText('This is information')).toBeInTheDocument();
    expect(screen.getByTestId('icon-info')).toBeInTheDocument();
    
    // Check styling on outer container
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('bg-blue-50');
    expect(outerDiv).toHaveClass('text-blue-800');
    expect(outerDiv).toHaveClass('border-blue-200');
  });

  test('renders message without icon when withIcon is false', () => {
    render(<StatusMessage text="No icon message" type="info" withIcon={false} />);
    
    expect(screen.getByText('No icon message')).toBeInTheDocument();
    expect(screen.queryByTestId('icon-info')).not.toBeInTheDocument();
  });

  test('calls onDismiss when dismiss button is clicked', () => {
    const handleDismiss = jest.fn();
    render(<StatusMessage text="Dismissible message" type="info" onDismiss={handleDismiss} />);
    
    const dismissButton = screen.getByLabelText('Dismiss message');
    fireEvent.click(dismissButton);
    
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  test('applies custom className', () => {
    const { container } = render(<StatusMessage text="Custom class message" type="success" className="my-custom-class" />);
    
    // Check styling on outer container
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('my-custom-class');
  });
});