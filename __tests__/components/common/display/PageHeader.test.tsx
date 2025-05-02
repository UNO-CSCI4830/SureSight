import React from 'react';
import { render, screen } from '@testing-library/react';
import PageHeader from '../../../../components/common/display/PageHeader';

describe('PageHeader Component', () => {
  test('renders with title', () => {
    render(<PageHeader title="Test Title" />);
    
    const headingElement = screen.getByText('Test Title');
    expect(headingElement).toBeInTheDocument();
    expect(headingElement.tagName).toBe('H1');
  });

  test('renders with subtitle', () => {
    render(<PageHeader title="Test Title" subtitle="Test Subtitle" />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  test('renders with actions', () => {
    render(
      <PageHeader 
        title="Test Title" 
        actions={<button data-testid="test-action">Action</button>}
      />
    );
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByTestId('test-action')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(<PageHeader title="Test Title" className="my-custom-class" />);
    
    // Direct check on the container's first child, which is the outer div
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('my-custom-class');
    expect(outerDiv).toHaveClass('mb-8');
  });

  test('renders with all props', () => {
    const { container } = render(
      <PageHeader 
        title="Test Title" 
        subtitle="Test Subtitle" 
        className="my-custom-class"
        actions={<button data-testid="test-action">Action</button>}
      />
    );
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    expect(screen.getByTestId('test-action')).toBeInTheDocument();
    
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('my-custom-class');
  });
});