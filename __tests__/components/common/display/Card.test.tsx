import React from 'react';
import { render, screen } from '@testing-library/react';
import Card from '../../../../components/common/display/Card';

describe('Card Component', () => {
  test('renders with default props', () => {
    render(<Card>Test Content</Card>);
    
    const cardElement = screen.getByText('Test Content');
    expect(cardElement).toBeInTheDocument();
    // The container should have default padding
    expect(cardElement.parentElement).toHaveClass('p-4');
  });

  test('renders with custom className', () => {
    render(<Card className="custom-class">Test Content</Card>);
    
    const cardElement = screen.getByText('Test Content');
    expect(cardElement.parentElement).toHaveClass('custom-class');
  });

  test('renders with custom padding', () => {
    render(<Card padding="p-8">Test Content</Card>);
    
    const cardElement = screen.getByText('Test Content');
    expect(cardElement.parentElement).toHaveClass('p-8');
    expect(cardElement.parentElement).not.toHaveClass('p-4');
  });

  test('renders with custom background color', () => {
    render(<Card bgColor="bg-red-100">Test Content</Card>);
    
    const cardElement = screen.getByText('Test Content');
    expect(cardElement.parentElement).toHaveClass('bg-red-100');
  });

  test('renders with rounded corners', () => {
    render(<Card rounded>Test Content</Card>);
    
    const cardElement = screen.getByText('Test Content');
    expect(cardElement.parentElement).toHaveClass('rounded-lg');
  });

  test('renders with shadow', () => {
    render(<Card shadow>Test Content</Card>);
    
    const cardElement = screen.getByText('Test Content');
    expect(cardElement.parentElement).toHaveClass('shadow-md');
  });

  test('renders with custom width', () => {
    render(<Card width="w-1/2">Test Content</Card>);
    
    const cardElement = screen.getByText('Test Content');
    expect(cardElement.parentElement).toHaveClass('w-1/2');
  });

  test('combines multiple custom props correctly', () => {
    render(
      <Card 
        className="test-card" 
        padding="p-6" 
        bgColor="bg-blue-50"
        rounded
        shadow
        width="w-full"
      >
        Complex Card
      </Card>
    );
    
    const cardElement = screen.getByText('Complex Card');
    const cardContainer = cardElement.parentElement;
    
    expect(cardContainer).toHaveClass('test-card');
    expect(cardContainer).toHaveClass('p-6');
    expect(cardContainer).toHaveClass('bg-blue-50');
    expect(cardContainer).toHaveClass('rounded-lg');
    expect(cardContainer).toHaveClass('shadow-md');
    expect(cardContainer).toHaveClass('w-full');
  });
});