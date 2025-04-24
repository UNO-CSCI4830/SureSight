import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../../../components/ui/Button';

// Mock the LoadingSpinner component
jest.mock('../../../components/common', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading Spinner</div>,
}));

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Test Button</Button>);
    const button = screen.getByRole('button', { name: 'Test Button' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
    // Should have primary classes (this is a simplified test)
    expect(button.className).toContain('bg-primary-500');
  });

  it('handles different variants', () => {
    const { rerender } = render(<Button variant="secondary">Secondary Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-secondary-500');

    rerender(<Button variant="outline">Outline Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-gray-300');

    rerender(<Button variant="danger">Danger Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-500');

    rerender(<Button variant="success">Success Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-green-500');
  });

  it('handles different sizes', () => {
    const { rerender } = render(<Button size="sm">Small Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-3 py-1.5 text-sm');

    rerender(<Button size="md">Medium Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-4 py-2');

    rerender(<Button size="lg">Large Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6 py-3 text-lg');
  });

  it('handles onClick events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    const handleClick = jest.fn();
    render(
      <Button onClick={handleClick} disabled>
        Disabled Button
      </Button>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders loading state with spinner', () => {
    render(
      <Button isLoading loadingText="Loading...">
        Submit
      </Button>
    );
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
  });

  it('renders with full width when specified', () => {
    render(<Button fullWidth>Full Width Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('renders with an icon when provided', () => {
    render(
      <Button icon={<span data-testid="test-icon">Icon</span>}>
        Button with Icon
      </Button>
    );
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('Button with Icon')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    render(<Button className="test-class">Custom Class Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('test-class');
  });
});