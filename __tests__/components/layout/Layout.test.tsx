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
    
    // Check that the container has min-h-screen class
    const container = screen.getByTestId('layout-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('min-h-screen');
  });

  test('applies custom className when provided', () => {
    render(
      <Layout className="custom-layout-class">
        <div>Test Content</div>
      </Layout>
    );
    
    // Check that the custom class is applied to the layout container
    const container = screen.getByTestId('layout-container');
    expect(container).toHaveClass('custom-layout-class');
  });
});