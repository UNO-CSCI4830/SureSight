import React from 'react';
import { render, screen } from '@testing-library/react';
import FormField from '../../../../components/common/form/FormField';

describe('FormField Component', () => {
  test('renders children', () => {
    render(
      <FormField id="test-field">
        <input id="test-field" data-testid="test-input" />
      </FormField>
    );
    
    expect(screen.getByTestId('test-input')).toBeInTheDocument();
  });

  test('renders label when provided', () => {
    render(
      <FormField id="test-field" label="Test Label">
        <input id="test-field" />
      </FormField>
    );
    
    const labelElement = screen.getByText('Test Label');
    expect(labelElement).toBeInTheDocument();
    expect(labelElement.tagName).toBe('LABEL');
    expect(labelElement).toHaveAttribute('for', 'test-field');
  });

  test('shows required indicator when field is required', () => {
    render(
      <FormField id="test-field" label="Test Label" required>
        <input id="test-field" />
      </FormField>
    );
    
    // The required indicator is a span with * inside the label
    expect(screen.getByText('*')).toBeInTheDocument();
    const requiredIndicator = screen.getByText('*');
    expect(requiredIndicator).toHaveClass('text-red-500');
  });

  test('renders help text when provided', () => {
    render(
      <FormField id="test-field" helpText="This is help text">
        <input id="test-field" />
      </FormField>
    );
    
    expect(screen.getByText('This is help text')).toBeInTheDocument();
    const helpTextElement = screen.getByText('This is help text');
    expect(helpTextElement.tagName).toBe('P');
    expect(helpTextElement).toHaveClass('text-gray-500');
  });

  test('renders error message when provided', () => {
    render(
      <FormField id="test-field" error="This field is required">
        <input id="test-field" />
      </FormField>
    );
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    const errorElement = screen.getByText('This field is required');
    expect(errorElement.tagName).toBe('P');
    expect(errorElement).toHaveClass('text-red-600');
  });

  test('applies custom className', () => {
    render(
      <FormField id="test-field" className="custom-class">
        <input id="test-field" />
      </FormField>
    );
    
    const formFieldElement = screen.getByRole('textbox').parentElement;
    expect(formFieldElement).toHaveClass('custom-class');
  });

  test('renders with all props', () => {
    render(
      <FormField
        id="test-field"
        label="Test Label"
        required
        helpText="This is help text"
        error="This is an error"
        className="custom-class"
      >
        <input id="test-field" data-testid="test-input" />
      </FormField>
    );
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('This is help text')).toBeInTheDocument();
    expect(screen.getByText('This is an error')).toBeInTheDocument();
    expect(screen.getByTestId('test-input')).toBeInTheDocument();
    
    const formFieldElement = screen.getByTestId('test-input').parentElement;
    expect(formFieldElement).toHaveClass('custom-class');
  });
});