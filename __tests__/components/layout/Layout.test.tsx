import React from 'react';
import { render, screen } from '@testing-library/react';
import Layout from '../../../components/layout/Layout';

// Mock the NavBar and Footer components to simplify testing
jest.mock('../../../components/layout/NavBar', () => {
  return function MockNavBar() {
    return <div data-testid="mock-navbar">NavBar Component</div>;
  };
});

jest.mock('../../../components/layout/Footer', () => {
  return function MockFooter() {
    return <div data-testid="mock-footer">Footer Component</div>;
  };
});

// Mock next/head to avoid errors in tests
jest.mock('next/head', () => {
  return function MockHead({ children }) {
    return <div data-testid="mock-head">{children}</div>;
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Layout Component', () => {
  test('renders children content', () => {
    render(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('renders NavBar component', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );
    
    expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
  });

  test('renders Footer component', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );
    
    expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
  });

  test('applies default container styles', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );
    
    // Check that the main element has min-h-screen class
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass('min-h-screen');
  });

  test('sets document title based on title prop', () => {
    render(
      <Layout title="Test Title">
        <div>Test Content</div>
      </Layout>
    );
    
    // Check that the title is set in the Head component
    expect(document.title).toBe('Test Title');
  });
});