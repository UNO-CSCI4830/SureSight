import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '../../../components/layout/Footer';

// Mock Next/Link component
jest.mock('next/link', () => {
  return ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
});

describe('Footer Component', () => {
  it('renders the logo correctly', () => {
    render(<Footer />);
    const logo = screen.getByAltText('SureSight Logo');
    expect(logo).toBeInTheDocument();
    expect(screen.getByText('SureSight')).toBeInTheDocument();
  });

  it('displays the current year in the copyright text', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(`© ${currentYear} SureSight. All rights reserved.`)).toBeInTheDocument();
  });

  it('displays the tagline', () => {
    render(<Footer />);
    expect(screen.getByText('Looking after your roofs since 2025')).toBeInTheDocument();
  });

  it('renders the navigation link sections', () => {
    render(<Footer />);
    
    // Check for section headings
    expect(screen.getByText('Links')).toBeInTheDocument();
    expect(screen.getByText('Legal')).toBeInTheDocument();
    expect(screen.getByText('Connect')).toBeInTheDocument();
  });

  it('includes the main navigation links', () => {
    render(<Footer />);
    
    // Check for main navigation links
    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
    
    const loginLink = screen.getByRole('link', { name: 'Login' });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
    
    const signupLink = screen.getByRole('link', { name: 'Sign Up' });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  it('includes legal links', () => {
    render(<Footer />);
    
    // Check for legal links
    const privacyLink = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(privacyLink).toBeInTheDocument();
    
    const termsLink = screen.getByRole('link', { name: 'Terms of Service' });
    expect(termsLink).toBeInTheDocument();
  });

  it('includes social media links', () => {
    render(<Footer />);
    
    // Check for social media links
    const twitterLink = screen.getByLabelText('Twitter');
    expect(twitterLink).toBeInTheDocument();
    
    const facebookLink = screen.getByLabelText('Facebook');
    expect(facebookLink).toBeInTheDocument();
    
    const youtubeLink = screen.getByLabelText('YouTube');
    expect(youtubeLink).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-footer-class';
    const { container } = render(<Footer className={customClass} />);
    
    const footer = container.querySelector('footer');
    expect(footer).toHaveClass(customClass);
    expect(footer).toHaveClass('bg-white'); // Default class should still be there
  });
});