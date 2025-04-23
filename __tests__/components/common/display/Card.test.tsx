import React from 'react';
import { render } from '@testing-library/react';
import Card from '../../../../components/common/display/Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <Card>
        <div>Test Content</div>
      </Card>
    );
    
    expect(getByText('Test Content')).toBeInTheDocument();
  });

  it('has default styling applied', () => {
    const { container } = render(
      <Card>Content</Card>
    );
    
    const cardDiv = container.firstChild as HTMLElement;
    expect(cardDiv).toHaveClass('bg-white');
    expect(cardDiv).toHaveClass('rounded-xl');
    expect(cardDiv).toHaveClass('shadow-card');
    expect(cardDiv).toHaveClass('p-6'); // padded by default
    expect(cardDiv).toHaveClass('transition-shadow'); // hoverable by default
  });

  it('does not have hover styles when hoverable=false', () => {
    const { container } = render(
      <Card hoverable={false}>Content</Card>
    );
    
    const cardDiv = container.firstChild as HTMLElement;
    expect(cardDiv).not.toHaveClass('hover:shadow-hover');
    expect(cardDiv).not.toHaveClass('transition-shadow');
  });

  it('does not have padding when padded=false', () => {
    const { container } = render(
      <Card padded={false}>Content</Card>
    );
    
    const cardDiv = container.firstChild as HTMLElement;
    expect(cardDiv).not.toHaveClass('p-6');
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-card-class';
    const { container } = render(
      <Card className={customClass}>Content</Card>
    );
    
    const cardDiv = container.firstChild as HTMLElement;
    expect(cardDiv).toHaveClass(customClass);
  });
});