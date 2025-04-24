import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../../../../components/common/display/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('renders correctly with default props', () => {
    render(<LoadingSpinner />);
    
    // Check SVG is rendered
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('animate-spin');
    expect(svg).toHaveClass('h-8 w-8'); // Default is 'md' size
  });

  it('applies small size class when size="sm"', () => {
    render(<LoadingSpinner size="sm" />);
    
    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('h-4 w-4');
    expect(svg).not.toHaveClass('h-8 w-8');
  });

  it('applies large size class when size="lg"', () => {
    render(<LoadingSpinner size="lg" />);
    
    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('h-12 w-12');
    expect(svg).not.toHaveClass('h-8 w-8');
  });

  it('applies custom color class', () => {
    render(<LoadingSpinner color="red-500" />);
    
    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('text-red-500');
    expect(svg).not.toHaveClass('text-primary-500');
  });

  it('displays loading text when provided', () => {
    const loadingText = 'Loading data...';
    render(<LoadingSpinner text={loadingText} />);
    
    expect(screen.getByText(loadingText)).toBeInTheDocument();
  });

  it('does not display text when not provided', () => {
    render(<LoadingSpinner />);
    
    const textElement = document.querySelector('p');
    expect(textElement).not.toBeInTheDocument();
  });

  it('applies custom className to wrapper', () => {
    const { container } = render(<LoadingSpinner className="custom-class" />);
    
    // Get the top level wrapper div - need to check it explicitly rather than using document.querySelector
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-class');
  });
});