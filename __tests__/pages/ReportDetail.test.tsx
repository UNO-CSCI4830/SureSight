import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ReportDetailPage from '../../pages/reports/[id]';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';

// Mock the next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock the supabaseClient
jest.mock('../../utils/supabaseClient', () => {
  const mockReport = {
    id: 'test-report-id',
    title: 'Test Report',
    description: 'Test description',
    status: 'draft',
    created_at: '2024-12-30T12:00:00Z',
    submitted_at: null,
    reviewed_at: null,
    property: {
      address_line1: '123 Test St',
      address_line2: 'Apt 4',
      city: 'Testville',
      state: 'TS',
      postal_code: '12345',
      country: 'USA',
      property_type: 'Residential',
      square_footage: 2000,
      year_built: 2000
    },
    assessment_areas: [
      {
        id: 'area-1',
        report_id: 'test-report-id',
        location: 'Roof',
        damage_type: 'hail',
        severity: 'moderate',
        dimensions: '10x15',
        notes: 'Several damaged shingles',
        created_at: '2024-12-30T12:00:00Z',
      }
    ],
    images: [
      {
        id: 'image-1',
        report_id: 'test-report-id',
        assessment_area_id: 'area-1',
        storage_path: 'https://example.com/image1.jpg',
        filename: 'image1.jpg',
        created_at: '2024-12-30T12:00:00Z',
        ai_damage_type: 'hail',
        ai_damage_severity: null,
        ai_confidence: 0.85
      }
    ]
  };

  const updateMock = jest.fn().mockReturnValue({ 
    eq: jest.fn().mockReturnValue({ error: null }),
    error: null 
  });
  
  const deleteMock = jest.fn().mockReturnValue({ 
    eq: jest.fn().mockReturnValue({ error: null }),
    error: null 
  });
  
  const insertMock = jest.fn().mockReturnValue({ 
    data: { id: 'new-area-id' }, 
    error: null,
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockReturnValue({ data: { id: 'new-area-id' }, error: null })
    })
  });
  
  const mockSelectChain = jest.fn().mockImplementation((selection) => {
    return {
      eq: jest.fn().mockImplementation((field, value) => {
        return {
          eq: jest.fn().mockImplementation((field2, value2) => {
            return {
              single: jest.fn().mockReturnValue({
                data: field === 'id' && value === 'test-report-id' ? mockReport : { id: 'mock-user-id' },
                error: null,
              }),
            };
          }),
          single: jest.fn().mockReturnValue({
            data: field === 'auth_user_id' ? { id: 'mock-user-id' } : mockReport,
            error: null,
          }),
        };
      })
    };
  });
  
  const mockSupabase = {
    from: jest.fn().mockImplementation((table) => {
      return {
        select: mockSelectChain,
        update: updateMock,
        delete: deleteMock,
        insert: insertMock,
      };
    }),
    auth: {
      getSession: jest.fn().mockReturnValue({
        data: { 
          session: { 
            user: { 
              id: 'mock-auth-user-id' 
            } 
          } 
        },
        error: null,
      }),
    },
  };

  return {
    supabase: mockSupabase,
    handleSupabaseError: jest.fn().mockReturnValue({ message: 'Error message' }),
  };
});

// Mock FileUpload component
jest.mock('../../components/ui/FileUpload', () => ({
  __esModule: true,
  default: ({ onUploadComplete, bucket }: { onUploadComplete: (urls: string[]) => void, bucket: string, storagePath: string }) => (
    <div className="file-upload" data-testid="file-upload" data-bucket={bucket}>
      <button onClick={() => onUploadComplete(['https://example.com/image1.jpg'])}>
        Upload Files
      </button>
    </div>
  ),
}));

// Mock the components needed
jest.mock('../../components/common', () => ({
  PageHeader: ({ title }: { title: string }) => <div data-testid="page-header" className="mb-8 ">{title && <div className="flex flex-col md:flex-row md:items-center md:justify-between"><div><h1 className="text-2xl font-semibold text-gray-800 mb-2">{title}</h1></div></div>}</div>,
  Card: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div data-testid="card-component" className={className}>{children}</div>,
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
  StatusMessage: ({ text, type, onDismiss }: { text: string; type: 'error' | 'success'; onDismiss: () => void }) => (
    <div className={`p-4 rounded-md border flex items-start ${type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'} mb-6`}>
      <span className="flex-shrink-0 mr-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" stroke="none" className="h-5 w-5" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd" d={type === 'error' ? 
            "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" : 
            "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"} />
        </svg>
      </span>
      <div className="flex-grow">{text}</div>
      <button type="button" onClick={onDismiss} className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-500" aria-label="Dismiss message">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" stroke="none" className="h-5 w-5" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
        </svg>
      </button>
    </div>
  ),
}));

// Mock the UI components
jest.mock('../../components/ui', () => ({
  FormInput: ({ id, label, value, onChange, ...props }: { id: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; [key: string]: any }) => (
    <div className="">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={id}
        name={id}
        className="form-input  "
        value={value}
        onChange={onChange}
        {...props}
      />
    </div>
  ),
  Select: ({ id, value, onChange, options, name }: { id: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: { value: string; label: string }[]; name?: string }) => (
    <div className="">
      <select
        id={id}
        name={name || id}
        className="form-input  "
        value={value}
        onChange={onChange}
        aria-label={name || id}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  ),
  TextArea: ({ id, value, onChange, ...props }: { id: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; [key: string]: any }) => (
    <div className="">
      <textarea
        id={id}
        className="form-input "
        value={value}
        onChange={onChange}
        {...props}
      />
    </div>
  ),
  Button: ({ variant, onClick, children, ...props }: { variant: string; onClick: () => void; children: React.ReactNode; [key: string]: any }) => (
    <button
      data-testid="ui-button"
      data-variant={variant}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock the Layout and AuthGuard components
jest.mock('../../components/layout/Layout', () => ({
  __esModule: true,
  default: ({ children, title }: { children: React.ReactNode; title: string }) => <div data-testid="layout-mock" data-title={title}>{children}</div>,
}));

jest.mock('../../components/auth/AuthGuard', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-guard-mock">{children}</div>,
}));

describe('ReportDetailPage', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      query: { id: 'test-report-id' },
      push: mockPush,
    });
    
    jest.clearAllMocks();
  });

  test('renders loading spinner initially', () => {
    render(<ReportDetailPage />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('renders report details after loading', async () => {
    render(<ReportDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('page-header')).toHaveTextContent('Test Report');
    });
    
    // Use looser text matching with regular expressions
    expect(screen.getByText(/123 Test St/)).toBeInTheDocument();
    expect(screen.getByText(/Residential/)).toBeInTheDocument();
    expect(screen.getByText(/Several damaged shingles/)).toBeInTheDocument();
  });

  test('handles edit mode for report details', async () => {
    render(<ReportDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('page-header')).toHaveTextContent('Test Report');
    });
    
    fireEvent.click(screen.getByText('Edit Details'));
    
    await waitFor(() => {
      // Look for the Save Changes button in the form
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    });
  });

  test('handles adding a new assessment area', async () => {
    render(<ReportDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('page-header')).toHaveTextContent('Test Report');
    });
    
    fireEvent.click(screen.getByText('Add Area'));
    
    await waitFor(() => {
      // Look for the form fields that appear when adding an area
      expect(screen.getByLabelText(/Location/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Damage Type/)).toBeInTheDocument();
    });
  });

  test('handles image uploads', async () => {
    render(<ReportDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('page-header')).toHaveTextContent('Test Report');
    });
    
    // The FileUpload component should be rendered in the page
    const fileUploadBtns = screen.getAllByText('Upload Files');
    expect(fileUploadBtns.length).toBeGreaterThan(0);
  });

  test('handles report submission', async () => {
    render(<ReportDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('page-header')).toHaveTextContent('Test Report');
    });
    
    const submitButton = screen.getByText('Submit Report');
    fireEvent.click(submitButton);
    
    // Instead of looking for a confirmation dialog that doesn't exist,
    // we should check that the supabase update was called with the right table
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('reports');
      expect(supabase.from('reports').update).toHaveBeenCalled();
    });
  });

  test('handles deleting assessment area', async () => {
    // Mock the window.confirm to always return true
    const originalConfirm = window.confirm;
    window.confirm = jest.fn().mockReturnValue(true);
    
    render(<ReportDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('page-header')).toHaveTextContent('Test Report');
    });
    
    // Find and click the delete button for an assessment area
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    // Check that the confirm was called and database delete was attempted
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('images');
      expect(supabase.from).toHaveBeenCalledWith('assessment_areas');
    });
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });
});