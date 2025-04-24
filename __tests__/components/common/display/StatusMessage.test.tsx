import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StatusMessage, { MessageType } from '../../../../components/common/display/StatusMessage';

// Mock the Icon component
jest.mock('../../../../components/ui/icons/Icon', () => {
  return function MockedIcon({ name, className }: { name: string; className?: string }) {
    return <span data-testid={`icon-${name}`} className={className}>{name} icon</span>;
  };
});

describe('StatusMessage Component', () => {
  const defaultProps = {
    text: 'This is a test message',
    type: 'info' as MessageType,
  };

  it('renders message text correctly', () => {
    render(<StatusMessage {...defaultProps} />);
    expect(screen.getByText('This is a test message')).toBeInTheDocument();
  });

  it('applies correct classes for info type', () => {
    const { container } = render(<StatusMessage {...defaultProps} type="info" />);
    const messageDiv = container.firstChild as HTMLElement;
    expect(messageDiv).toHaveClass('bg-blue-50');
    expect(messageDiv).toHaveClass('text-blue-800');
    expect(messageDiv).toHaveClass('border-blue-200');
  });

  it('applies correct classes for success type', () => {
    const { container } = render(<StatusMessage {...defaultProps} type="success" />);
    const messageDiv = container.firstChild as HTMLElement;
    expect(messageDiv).toHaveClass('bg-green-50');
    expect(messageDiv).toHaveClass('text-green-800');
    expect(messageDiv).toHaveClass('border-green-200');
  });

  it('applies correct classes for error type', () => {
    const { container } = render(<StatusMessage {...defaultProps} type="error" />);
    const messageDiv = container.firstChild as HTMLElement;
    expect(messageDiv).toHaveClass('bg-red-50');
    expect(messageDiv).toHaveClass('text-red-800');
    expect(messageDiv).toHaveClass('border-red-200');
  });

  it('applies correct classes for warning type', () => {
    const { container } = render(<StatusMessage {...defaultProps} type="warning" />);
    const messageDiv = container.firstChild as HTMLElement;
    expect(messageDiv).toHaveClass('bg-amber-50');
    expect(messageDiv).toHaveClass('text-amber-800');
    expect(messageDiv).toHaveClass('border-amber-200');
  });

  it('renders icon based on message type', () => {
    const types: MessageType[] = ['info', 'success', 'error', 'warning'];
    
    types.forEach(type => {
      const { unmount } = render(<StatusMessage {...defaultProps} type={type} />);
      expect(screen.getByTestId(`icon-${type}`)).toBeInTheDocument();
      unmount();
    });
  });

  it('does not render icon when withIcon is false', () => {
    render(<StatusMessage {...defaultProps} withIcon={false} />);
    expect(screen.queryByTestId(`icon-info`)).not.toBeInTheDocument();
  });

  it('renders dismiss button when onDismiss prop is provided', () => {
    render(<StatusMessage {...defaultProps} onDismiss={() => {}} />);
    expect(screen.getByRole('button', { name: 'Dismiss message' })).toBeInTheDocument();
    expect(screen.getByTestId('icon-close')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const handleDismiss = jest.fn();
    render(<StatusMessage {...defaultProps} onDismiss={handleDismiss} />);
    
    const dismissButton = screen.getByRole('button', { name: 'Dismiss message' });
    fireEvent.click(dismissButton);
    
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-status-class';
    const { container } = render(<StatusMessage {...defaultProps} className={customClass} />);
    
    const statusDiv = container.firstChild as HTMLElement;
    expect(statusDiv).toHaveClass(customClass);
  });
});