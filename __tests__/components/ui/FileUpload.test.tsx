import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUpload from '../../../components/ui/FileUpload';
import { supabase } from '../../../utils/supabaseClient';

// Mock the supabase client
jest.mock('../../../utils/supabaseClient', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockReturnValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/test-file.jpg' }
        })
      })
    }
  }
}));

// Mock the Icon component
jest.mock('../../../components/ui/icons/Icon', () => {
  return function MockIcon({ name, className }: { name: string, className?: string }) {
    return <span data-testid={`icon-${name}`} className={className}>{name}</span>;
  };
});

// Mock Button component
jest.mock('../../../components/ui/Button', () => {
  return function MockButton(props: any) {
    return (
      <button 
        disabled={props.disabled} 
        className={props.className}
        onClick={props.onClick}
        type={props.type}
        data-testid="upload-button"
      >
        {props.isLoading ? 'Loading...' : props.children}
      </button>
    );
  };
});

// Helper function to create mock files
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(["test"], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Mock URL.createObjectURL and URL.revokeObjectURL
URL.createObjectURL = jest.fn(() => "mock-url");
URL.revokeObjectURL = jest.fn();

describe('FileUpload Component', () => {
  const defaultProps = {
    bucket: 'test-bucket',
    onUploadComplete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the upload area correctly', () => {
    const { container } = render(<FileUpload {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /file upload area/i })).toBeInTheDocument();
    
    // Check for text content that might be split across elements
    const dragText = container.querySelector('.text-sm.font-medium');
    expect(dragText?.textContent).toContain('Drag & drop multiple files here');
    expect(screen.getByText(/image\/all/i)).toBeInTheDocument();
    expect(container.textContent).toContain('(Max: 5MB)');
  });

  it('shows singular text when multiple is false', () => {
    const { container } = render(<FileUpload {...defaultProps} multiple={false} />);
    
    const dragText = container.querySelector('.text-sm.font-medium');
    expect(dragText?.textContent).toContain('Drag & drop a file here');
  });

  it('allows file selection through input', async () => {
    render(<FileUpload {...defaultProps} />);
    
    const fileInput = screen.getByTitle('Upload your files here');
    const file = createMockFile('test-image.jpg', 1024 * 1024, 'image/jpeg');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Wait for the file preview to appear
    await waitFor(() => {
      expect(screen.getByText('Selected Files (1)')).toBeInTheDocument();
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error message when file is too large', async () => {
    render(<FileUpload {...defaultProps} maxFileSize={1} />);
    
    const fileInput = screen.getByTitle('Upload your files here');
    // Create a 2MB file (exceeds the 1MB limit)
    const file = createMockFile('large-image.jpg', 2 * 1024 * 1024, 'image/jpeg');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/some files were too large/i)).toBeInTheDocument();
    });
  });

  it('handles file removal', async () => {
    render(<FileUpload {...defaultProps} />);
    
    const fileInput = screen.getByTitle('Upload your files here');
    const file = createMockFile('test-image.jpg', 1024 * 1024, 'image/jpeg');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    });
    
    // Find and click the remove button
    const removeButton = screen.getByLabelText('Remove test-image.jpg');
    fireEvent.click(removeButton);
    
    // Check that the file is removed from the list
    expect(screen.queryByText('test-image.jpg')).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('disables upload button when no files are selected', () => {
    render(<FileUpload {...defaultProps} />);
    
    // Use testid instead of role to avoid conflicts with other buttons
    const uploadButton = screen.getByTestId('upload-button');
    expect(uploadButton).toBeDisabled();
    expect(uploadButton).toHaveClass('opacity-50');
  });

  it('performs file upload successfully', async () => {
    const { container } = render(<FileUpload {...defaultProps} />);
    
    // Add a file
    const fileInput = screen.getByTitle('Upload your files here');
    const file = createMockFile('test-image.jpg', 1024 * 1024, 'image/jpeg');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    });
    
    // Trigger upload
    const uploadButton = screen.getByTestId('upload-button');
    expect(uploadButton).not.toBeDisabled();
    
    // Find the form and submit it directly
    const form = container.querySelector('form');
    fireEvent.submit(form!);
    
    await waitFor(() => {
      // Check that the upload button is disabled during upload
      expect(uploadButton).toBeDisabled();
      
      // Verify the Supabase storage methods were called
      expect(supabase.storage.from).toHaveBeenCalledWith('test-bucket');
      expect(supabase.storage.from().upload).toHaveBeenCalled();
      expect(supabase.storage.from().getPublicUrl).toHaveBeenCalled();
      
      // Verify success message is shown
      expect(screen.getByText(/1 file\(s\) uploaded successfully!/i)).toBeInTheDocument();
      
      // Verify callback was called with the uploaded URL
      expect(defaultProps.onUploadComplete).toHaveBeenCalledWith(['https://example.com/test-file.jpg']);
    });
  });

  it('shows info message when trying to upload with no files', () => {
    const { container } = render(<FileUpload {...defaultProps} />);
    
    // Find the form and submit it directly
    const form = container.querySelector('form');
    fireEvent.submit(form!);
    
    expect(screen.getByText(/please select at least one file to upload/i)).toBeInTheDocument();
  });

  it('handles upload errors', async () => {
    // Mock an upload error for this test
    const mockFrom = jest.fn().mockReturnValue({
      upload: jest.fn().mockReturnValue({ error: new Error('Upload failed') }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: '' }
      })
    });
    
    (supabase.storage.from as jest.Mock).mockImplementation(mockFrom);
    
    const { container } = render(<FileUpload {...defaultProps} />);
    
    // Add a file
    const fileInput = screen.getByTitle('Upload your files here');
    const file = createMockFile('test-image.jpg', 1024 * 1024, 'image/jpeg');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    });
    
    // Find the form and submit it directly
    const form = container.querySelector('form');
    fireEvent.submit(form!);
    
    await waitFor(() => {
      expect(screen.getByText(/0 file\(s\) uploaded. failed:/i)).toBeInTheDocument();
    });
  });

  it('respects custom acceptedFileTypes', () => {
    render(<FileUpload {...defaultProps} acceptedFileTypes="application/pdf" />);
    
    const fileInput = screen.getByTitle('Upload your files here');
    expect(fileInput).toHaveAttribute('accept', 'application/pdf');
    
    // Check for text content that might be split across elements
    const fileTypeText = screen.getByText(/application\/pdf/i);
    expect(fileTypeText).toBeInTheDocument();
  });
});