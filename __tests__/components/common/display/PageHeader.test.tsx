import React from 'react';
import { render, screen } from '@testing-library/react';
import PageHeader from '../../../../components/common/display/PageHeader';

describe('PageHeader Component', () => {
  it('renders the title correctly', () => {
    render(<PageHeader title="Test Page Title" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Page Title');
  });

  it('renders the subtitle when provided', () => {
    render(<PageHeader title="Main Title" subtitle="Page subtitle" />);
    expect(screen.getByText('Page subtitle')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<PageHeader title="Main Title" />);
    const subtitle = container.querySelector('.text-gray-600');
    expect(subtitle).not.toBeInTheDocument();
  });

  it('renders action elements when provided', () => {
    const actionContent = "Action Button";
    render(
      <PageHeader 
        title="Main Title"
        actions={<button>{actionContent}</button>}
      />
    );
    expect(screen.getByText(actionContent)).toBeInTheDocument();
  });

  it('does not render actions container when not provided', () => {
    const { container } = render(<PageHeader title="Main Title" />);
    // The rendered structure has more divs than expected - checking for specific action div instead
    const actionsDiv = container.querySelector('.mt-4.md\\:mt-0.md\\:ml-6');
    expect(actionsDiv).not.toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-header-class';
    const { container } = render(<PageHeader title="Title" className={customClass} />);
    
    const headerDiv = container.firstChild as HTMLElement;
    expect(headerDiv).toHaveClass(customClass);
    expect(headerDiv).toHaveClass('mb-8'); // Default class should still be there
  });
});