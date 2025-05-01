import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../../pages/Dashboard';

// Mock supabase client
const mockSelectFn = jest.fn();
const mockEqFn = jest.fn();
const mockOrderFn = jest.fn();

// Create a mock for router
const mockPush = jest.fn();

jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelectFn.mockReturnThis(),
      eq: mockEqFn.mockReturnThis(),
      order: mockOrderFn
    })),
    auth: {
      getUser: jest.fn()
    }
  },
  useSupabaseAuth: jest.fn().mockReturnValue({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false
  })
}));

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    query: {}
  }))
}));

// Mock the components that might cause issues
jest.mock('../../components/auth/AuthGuard', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="auth-guard">{children}</div>
}));

jest.mock('../../components/layout/Layout', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>
}));

jest.mock('../../components/ui/Select', () => ({
  __esModule: true,
  default: ({ label, name, value, onChange, options }) => (
    <select 
      aria-label={label}
      data-testid={`select-${name}`}
      name={name}
      value={value}
      onChange={onChange}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}));

jest.mock('../../components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, variant, className }) => (
    <button
      data-testid={`button-${variant || 'default'}-${children?.toString().replace(/\s+/g, '-').toLowerCase() || 'no-text'}`}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  )
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation for data fetching
    mockOrderFn.mockResolvedValue({
      data: [
        {
          id: 'report-1',
          title: 'Roof Damage Report',
          created_at: '2025-04-01T10:00:00Z',
          status: 'submitted',
          property: { address_line1: '123 Main St' }
        },
        {
          id: 'report-2',
          title: 'Water Damage Assessment',
          created_at: '2025-04-10T14:30:00Z',
          status: 'in_review',
          property: { address_line1: '456 Oak Ave' }
        }
      ],
      error: null
    });
  });

  test('renders loading state initially', async () => {
    // Override the mock to simulate loading
    mockOrderFn.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: [], error: null }), 100))
    );

    render(<Dashboard />);
    
    // Check for loading text
    expect(screen.getByText(/loading reports/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading reports/i)).not.toBeInTheDocument();
    });
  });

  test('renders reports when data is loaded', async () => {
    render(<Dashboard />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Roof Damage Report')).toBeInTheDocument();
      expect(screen.getByText('Water Damage Assessment')).toBeInTheDocument();
    });
    
    // Check that report details are rendered
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('456 Oak Ave')).toBeInTheDocument();
  });

  test('displays appropriate status badges', async () => {
    render(<Dashboard />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Submitted')).toBeInTheDocument();
      expect(screen.getByText('In Review')).toBeInTheDocument();
    });
  });

  test('handles error state', async () => {
    // Override mock to simulate an error
    mockOrderFn.mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to fetch reports' }
    });

    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to fetch reports/i)).toBeInTheDocument();
    });
  });

  test('displays empty state when no reports exist', async () => {
    // Override mock to return empty array
    mockOrderFn.mockResolvedValueOnce({
      data: [],
      error: null
    });

    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/no reports found/i)).toBeInTheDocument();
    });
  });

  test('allows filtering reports by status', async () => {
    // Reset mocks to track calls correctly
    jest.clearAllMocks();

    // Create a new implementation that ensures eq is called properly
    mockEqFn.mockImplementation((field, value) => {
      return { mockReturnThis: () => ({}) };
    });

    render(<Dashboard />);
    
    // Wait for reports to load
    await waitFor(() => {
      expect(screen.getByText('Roof Damage Report')).toBeInTheDocument();
    });
    
    // Clear earlier calls from initial render
    mockEqFn.mockClear();
    
    // Find and interact with the filter dropdown
    const filterDropdown = screen.getByTestId('select-statusFilter');
    
    // Select the "In Review" option, which should trigger filtering with status='in_review'
    userEvent.selectOptions(filterDropdown, 'in_review');
    
    // Wait for the filter to be applied
    await waitFor(() => {
      // After selecting, we need to verify if our eq function was called
      const calls = mockEqFn.mock.calls;
      const statusCall = calls.find(call => call[0] === 'status' && call[1] === 'in_review');
      expect(statusCall).toBeTruthy();
    });
  });

  test('clicking create new report button navigates to report creation page', async () => {
    // Clear any previous calls to mockPush
    mockPush.mockClear();
    
    render(<Dashboard />);
    
    // Find the Create New Report button
    await waitFor(() => {
      const createButton = screen.getByTestId('button-primary-create-new-report');
      expect(createButton).toBeInTheDocument();
      
      // Simulate a click event
      userEvent.click(createButton);
    });
    
    // Verify navigation occurs - needs to be outside the waitFor to give time for the onClick handler
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/reports/create');
    });
  });
});