import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NavBar from '../../../components/layout/NavBar';
import { supabase } from '../../../utils/supabaseClient';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/'
  })
}));

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

// Mock supabase client
jest.mock('../../../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockImplementation(() => Promise.resolve({ error: null }))
    }
  }
}));

// Mock Icon component
jest.mock('../../../components/ui/icons/Icon', () => {
  return function MockIcon({ name }: { name: string }) {
    return <span data-testid={`icon-${name}`}>{name} icon</span>;
  };
});

describe('NavBar Component', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  it('renders the logo correctly', () => {
    render(<NavBar />);
    const logo = screen.getByAltText('SureSight Logo');
    expect(logo).toBeInTheDocument();
    expect(screen.getByText('SureSight')).toBeInTheDocument();
  });

  it('initially renders with collapsed menu', () => {
    render(<NavBar />);
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
  });

  it('shows login/signup links for logged out users when menu is opened', () => {
    render(<NavBar isLoggedIn={false} />);
    
    // Open the menu
    const menuButton = screen.getByLabelText('Menu');
    fireEvent.click(menuButton);
    
    // Check login/signup links are shown
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    
    // Check that logged-in user links are not shown
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('My Profile')).not.toBeInTheDocument();
    expect(screen.queryByText('Log Out')).not.toBeInTheDocument();
  });

  it('shows appropriate menu items for logged in users', () => {
    render(<NavBar isLoggedIn={true} />);
    
    // Open the menu
    const menuButton = screen.getByLabelText('Menu');
    fireEvent.click(menuButton);
    
    // Check that logged-in user links are shown
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(screen.getByText('Log Out')).toBeInTheDocument();
    
    // Check that logged-out links are not shown
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
  });

  it('shows role-specific menu items for homeowners', () => {
    render(<NavBar isLoggedIn={true} userRole="homeowner" />);
    
    // Open the menu
    const menuButton = screen.getByLabelText('Menu');
    fireEvent.click(menuButton);
    
    // Check for homeowner-specific links
    expect(screen.getByText('My Reports')).toBeInTheDocument();
    
    // Check that other role-specific links are not shown
    expect(screen.queryByText('Available Jobs')).not.toBeInTheDocument();
    expect(screen.queryByText('Claims')).not.toBeInTheDocument();
  });

  it('shows role-specific menu items for contractors', () => {
    render(<NavBar isLoggedIn={true} userRole="contractor" />);
    
    // Open the menu
    const menuButton = screen.getByLabelText('Menu');
    fireEvent.click(menuButton);
    
    // Check for contractor-specific links
    expect(screen.getByText('Available Jobs')).toBeInTheDocument();
    
    // Check that other role-specific links are not shown
    expect(screen.queryByText('My Reports')).not.toBeInTheDocument();
    expect(screen.queryByText('Claims')).not.toBeInTheDocument();
  });

  it('shows role-specific menu items for adjusters', () => {
    render(<NavBar isLoggedIn={true} userRole="adjuster" />);
    
    // Open the menu
    const menuButton = screen.getByLabelText('Menu');
    fireEvent.click(menuButton);
    
    // Check for adjuster-specific links
    expect(screen.getByText('Claims')).toBeInTheDocument();
    
    // Check that other role-specific links are not shown
    expect(screen.queryByText('My Reports')).not.toBeInTheDocument();
    expect(screen.queryByText('Available Jobs')).not.toBeInTheDocument();
  });

  it('calls logout function when logout button is clicked', async () => {
    render(<NavBar isLoggedIn={true} />);
    
    // Open the menu
    const menuButton = screen.getByLabelText('Menu');
    fireEvent.click(menuButton);
    
    // Click logout button
    const logoutButton = screen.getByText('Log Out');
    fireEvent.click(logoutButton);
    
    // Check that signOut was called
    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  it('toggles menu when the hamburger button is clicked', () => {
    render(<NavBar />);
    const menuButton = screen.getByLabelText('Menu');
    
    // Open menu
    fireEvent.click(menuButton);
    expect(screen.getByRole('list')).toBeInTheDocument();
    
    // Close menu
    fireEvent.click(menuButton);
    
    // Menu should be closed
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});