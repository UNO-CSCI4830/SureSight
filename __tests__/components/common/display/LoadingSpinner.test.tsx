import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../../../../components/common/display/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  test('renders with default props', () => {
    render(<LoadingSpinner />);
    
    // Check if the spinner SVG is present
    const spinnerElement = document.querySelector('svg');
    expect(spinnerElement).toBeInTheDocument();
    expect(spinnerElement).toHaveClass('animate-spin');
    expect(spinnerElement).toHaveClass('h-8');
    expect(spinnerElement).toHaveClass('w-8');
  });

  test('renders with small size', () => {
    render(<LoadingSpinner size="sm" />);
    
    const spinnerElement = document.querySelector('svg');
    expect(spinnerElement).toHaveClass('h-4');
    expect(spinnerElement).toHaveClass('w-4');
  });

  test('renders with large size', () => {
    render(<LoadingSpinner size="lg" />);
    
    const spinnerElement = document.querySelector('svg');
    expect(spinnerElement).toHaveClass('h-12');
    expect(spinnerElement).toHaveClass('w-12');
  });

  test('renders with custom color', () => {
    render(<LoadingSpinner color="secondary-600" />);
    
    const spinnerElement = document.querySelector('svg');
    expect(spinnerElement).toHaveClass('text-secondary-600');
  });

  test('renders with loading text', () => {
    render(<LoadingSpinner text="Loading data..." />);
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<LoadingSpinner className="my-custom-class" />);
    
    const containerElement = document.querySelector('.flex.flex-col');
    expect(containerElement).toHaveClass('my-custom-class');
  });
});