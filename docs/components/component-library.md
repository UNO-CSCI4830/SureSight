# SureSight Component Library Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Installation and Setup](#installation-and-setup)
3. [Common Components](#common-components)
   - [Display Components](#display-components)
     - [Card](#card)
     - [LoadingSpinner](#loadingspinner)
     - [PageHeader](#pageheader)
     - [StatusMessage](#statusmessage)
   - [Form Components](#form-components)
     - [FormField](#formfield)
4. [UI Components](#ui-components)
   - [Form Controls](#form-controls)
     - [Button](#button)
     - [FormInput](#forminput)
     - [Select](#select)
     - [TextArea](#textarea)
   - [Icons](#icons)
     - [Icon Component](#icon-component)
5. [Utilities](#utilities)
   - [Form Validation](#form-validation)
   - [Theme Constants](#theme-constants)
6. [Usage Examples](#usage-examples)
7. [Best Practices](#best-practices)
8. [Contributing](#contributing)

---

## Introduction

The SureSight Component Library is a collection of reusable UI components and utilities designed to provide a consistent look and feel across the SureSight application. This library promotes code reuse, maintains design consistency, and improves developer productivity.

### Key Benefits

- **Consistency**: Standardized UI components ensure a consistent user experience
- **Maintainability**: Centralized styling and behavior make updates easier
- **Developer Experience**: Ready-made components accelerate development
- **Accessibility**: Components are designed with accessibility in mind
- **Flexibility**: Components can be customized to fit specific needs

---

## Installation and Setup

The component library is built into the SureSight application and requires no additional installation. Components can be imported from their respective directories:

```tsx
// Importing common components
import { Card, LoadingSpinner, PageHeader, StatusMessage } from '../components/common';

// Importing form components
import { Button, FormInput, Select, TextArea } from '../components/ui';

// Importing icons
import Icon from '../components/ui/icons/Icon';

// Importing utilities
import formValidation from '../utils/formValidation';
import themeConstants from '../utils/themeConstants';
```

---

## Common Components

### Display Components

#### Card

The `Card` component provides a consistent container with standardized styling for content sections.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | React.ReactNode | (required) | Content to be rendered inside the card |
| `className` | string | `''` | Additional CSS classes |
| `hoverable` | boolean | `true` | Whether to show hover effects |
| `padded` | boolean | `true` | Whether to add padding inside the card |

**Example:**

```tsx
<Card>
  <h2>Card Title</h2>
  <p>This is a basic card with default styling.</p>
</Card>

<Card hoverable={false} padded={false} className="mt-4">
  <img src="/image.jpg" alt="Custom card with no padding and no hover effect" />
</Card>
```

#### LoadingSpinner

The `LoadingSpinner` component displays a consistent loading animation across the application.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | 'sm' \| 'md' \| 'lg' | `'md'` | Size of the spinner |
| `color` | string | `'primary-500'` | Color of the spinner |
| `text` | string | `undefined` | Optional text to display below the spinner |
| `className` | string | `''` | Additional CSS classes |

**Example:**

```tsx
<LoadingSpinner />

<LoadingSpinner size="lg" color="secondary-500" text="Loading data..." />
```

#### PageHeader

The `PageHeader` component provides a consistent page header with support for titles, subtitles, and action buttons.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | (required) | Page title |
| `subtitle` | string | `undefined` | Optional subtitle |
| `className` | string | `''` | Additional CSS classes |
| `actions` | React.ReactNode | `undefined` | Optional action buttons/elements to display in the header |

**Example:**

```tsx
<PageHeader 
  title="User Profile" 
  subtitle="View and manage your profile information" 
/>

<PageHeader 
  title="Reports" 
  subtitle="View and manage your damage reports" 
  actions={
    <Button 
      variant="primary" 
      onClick={handleCreateReport}
    >
      Create New Report
    </Button>
  } 
/>
```

#### StatusMessage

The `StatusMessage` component displays consistent status messages (success, error, info, warning) across the application.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | string | (required) | Message text |
| `type` | 'success' \| 'error' \| 'info' \| 'warning' | (required) | Type of message |
| `className` | string | `''` | Additional CSS classes |
| `withIcon` | boolean | `true` | Whether to show an icon |
| `onDismiss` | () => void | `undefined` | Optional function to call when the dismiss button is clicked |

**Example:**

```tsx
<StatusMessage 
  type="success" 
  text="Profile updated successfully!" 
/>

<StatusMessage 
  type="error" 
  text="Failed to update profile. Please try again." 
  onDismiss={() => setShowError(false)}
/>

<StatusMessage 
  type="info" 
  text="Please complete your profile to get the most out of SureSight." 
  withIcon={false}
/>

<StatusMessage 
  type="warning" 
  text="Your subscription will expire in 5 days." 
/>
```

### Form Components

#### FormField

The `FormField` component provides consistent wrapping for form inputs with support for labels, help text, and error messages.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | string | (required) | ID for the form field (used for label association) |
| `label` | string | `undefined` | Field label |
| `children` | React.ReactNode | (required) | Form control to be wrapped (input, select, etc.) |
| `required` | boolean | `false` | Whether the field is required (adds an asterisk) |
| `helpText` | string | `undefined` | Optional help text displayed below the input |
| `error` | string | `undefined` | Optional error message |
| `className` | string | `''` | Additional CSS classes |

**Example:**

```tsx
<FormField
  id="email"
  label="Email Address"
  required
  helpText="We'll never share your email with anyone else."
  error={errors.email}
>
  <input
    type="email"
    id="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="form-input"
  />
</FormField>
```

---

## UI Components

### Form Controls

#### Button

The `Button` component provides a consistent button with support for different variants, sizes, loading states, and icons.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | React.ReactNode | (required) | Button text/content |
| `type` | 'button' \| 'submit' \| 'reset' | `'button'` | Button type |
| `variant` | 'primary' \| 'secondary' \| 'outline' \| 'danger' \| 'success' | `'primary'` | Button style variant |
| `size` | 'sm' \| 'md' \| 'lg' | `'md'` | Button size |
| `onClick` | (e: React.MouseEvent<HTMLButtonElement>) => void | `undefined` | Click handler |
| `disabled` | boolean | `false` | Whether the button is disabled |
| `className` | string | `''` | Additional CSS classes |
| `isLoading` | boolean | `false` | Whether to show loading state |
| `loadingText` | string | `undefined` | Text to show during loading (defaults to children) |
| `fullWidth` | boolean | `false` | Whether the button takes full width |
| `icon` | React.ReactNode | `undefined` | Optional icon to show before button text |

**Example:**

```tsx
<Button onClick={handleSave}>
  Save Changes
</Button>

<Button 
  variant="danger" 
  size="sm" 
  onClick={handleDelete}
>
  Delete Item
</Button>

<Button 
  type="submit" 
  isLoading={isSubmitting} 
  loadingText="Saving..."
>
  Save Changes
</Button>

<Button 
  variant="outline" 
  icon={<Icon name="upload" />}
>
  Upload Document
</Button>
```

#### FormInput

The `FormInput` component provides a consistent input field with support for various input types.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | string | (required) | Input ID |
| `name` | string | `id value` | Input name attribute |
| `label` | string | `undefined` | Input label |
| `type` | string | `'text'` | Input type (text, email, password, etc.) |
| `value` | string | (required) | Input value |
| `onChange` | (e: React.ChangeEvent<HTMLInputElement>) => void | (required) | Change handler |
| `placeholder` | string | `''` | Input placeholder |
| `required` | boolean | `false` | Whether the input is required |
| `disabled` | boolean | `false` | Whether the input is disabled |
| `className` | string | `''` | Additional CSS classes |
| `error` | string | `undefined` | Error message |
| `helpText` | string | `undefined` | Help text |
| `autoComplete` | string | `undefined` | HTML autocomplete attribute |
| `min` | string | `undefined` | Minimum value (for number inputs) |
| `max` | string | `undefined` | Maximum value (for number inputs) |

**Example:**

```tsx
<FormInput
  id="email"
  label="Email Address"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="example@domain.com"
  required
  helpText="We'll never share your email with anyone else."
  error={errors.email}
/>

<FormInput
  id="password"
  label="Password"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="••••••••"
  autoComplete="current-password"
/>
```

#### Select

The `Select` component provides a consistent dropdown selection input.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | string | (required) | Select ID |
| `name` | string | `id value` | Select name attribute |
| `label` | string | `undefined` | Select label |
| `value` | string | (required) | Selected value |
| `onChange` | (e: React.ChangeEvent<HTMLSelectElement>) => void | (required) | Change handler |
| `options` | { value: string; label: string }[] | (required) | Options to display |
| `placeholder` | string | `'Select an option'` | Text for empty selection |
| `required` | boolean | `false` | Whether selection is required |
| `disabled` | boolean | `false` | Whether select is disabled |
| `className` | string | `''` | Additional CSS classes |
| `error` | string | `undefined` | Error message |
| `helpText` | string | `undefined` | Help text |

**Example:**

```tsx
<Select
  id="preferredContact"
  label="Preferred Contact Method"
  value={preferredContactMethod}
  onChange={(e) => setPreferredContactMethod(e.target.value)}
  options={[
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'text', label: 'Text Message' }
  ]}
  helpText="How should we contact you?"
/>
```

#### TextArea

The `TextArea` component provides a consistent multi-line text input.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | string | (required) | Textarea ID |
| `name` | string | `id value` | Textarea name attribute |
| `label` | string | `undefined` | Textarea label |
| `value` | string | (required) | Textarea value |
| `onChange` | (e: React.ChangeEvent<HTMLTextAreaElement>) => void | (required) | Change handler |
| `placeholder` | string | `''` | Textarea placeholder |
| `required` | boolean | `false` | Whether textarea is required |
| `disabled` | boolean | `false` | Whether textarea is disabled |
| `className` | string | `''` | Additional CSS classes |
| `rows` | number | `3` | Number of visible text rows |
| `error` | string | `undefined` | Error message |
| `helpText` | string | `undefined` | Help text |

**Example:**

```tsx
<TextArea
  id="additionalNotes"
  label="Additional Notes"
  value={additionalNotes}
  onChange={(e) => setAdditionalNotes(e.target.value)}
  rows={5}
  placeholder="Any additional information you'd like to share"
  helpText="Optional information that might help us better understand your needs"
/>
```

### Icons

#### Icon Component

The `Icon` component provides a standardized way to display SVG icons throughout the application.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | string | (required) | Icon name |
| `className` | string | `'h-5 w-5'` | Additional CSS classes |
| `width` | number \| string | `undefined` | Icon width |
| `height` | number \| string | `undefined` | Icon height |
| `fill` | string | `'currentColor'` | SVG fill color |
| `stroke` | string | `'none'` | SVG stroke color |
| `viewBox` | string | `'0 0 20 20'` | SVG viewBox attribute |

**Available Icons:**

- Interface Icons: `home`, `profile`, `login`, `logout`, `password`, `close`
- Feature Icons: `reports`, `jobs`, `claims`, `upload`
- Status Icons: `success`, `error`, `warning`, `info`
- Communication Icons: `email`, `phone`

**Example:**

```tsx
<Icon name="home" />

<Icon 
  name="success" 
  className="h-8 w-8 text-green-500" 
/>

<Icon 
  name="warning" 
  fill="#f59e0b" 
/>
```

---

## Utilities

### Form Validation

The `formValidation` utility provides common validation functions for form fields.

**Available Functions:**

| Function | Description | Parameters | Return Value |
|----------|-------------|------------|-------------|
| `validateEmail` | Validates email addresses | `email: string` | `{ isValid: boolean; message?: string }` |
| `validatePassword` | Validates passwords with customizable requirements | `password: string, options?: { minLength?: number; requireNumbers?: boolean; requireSpecialChars?: boolean; requireUppercase?: boolean; requireLowercase?: boolean }` | `{ isValid: boolean; message?: string }` |
| `validatePasswordMatch` | Validates that passwords match | `password: string, confirmPassword: string` | `{ isValid: boolean; message?: string }` |
| `validateRequired` | Validates that a field has a value | `value: string, fieldName: string` | `{ isValid: boolean; message?: string }` |
| `validatePhone` | Validates phone numbers | `phone: string` | `{ isValid: boolean; message?: string }` |
| `formatPhoneNumber` | Formats phone numbers to a consistent format | `phone: string` | `string` |

**Example:**

```tsx
import formValidation from '../utils/formValidation';

// Validate email
const emailResult = formValidation.validateEmail(email);
if (!emailResult.isValid) {
  setEmailError(emailResult.message);
  return;
}

// Validate password
const passwordResult = formValidation.validatePassword(password, {
  minLength: 8,
  requireNumbers: true,
  requireSpecialChars: true
});
if (!passwordResult.isValid) {
  setPasswordError(passwordResult.message);
  return;
}

// Validate password match
const passwordMatchResult = formValidation.validatePasswordMatch(
  password,
  confirmPassword
);
if (!passwordMatchResult.isValid) {
  setConfirmPasswordError(passwordMatchResult.message);
  return;
}

// Format phone number
const formattedPhone = formValidation.formatPhoneNumber(phone);
```

### Theme Constants

The `themeConstants` utility provides standardized theme values for the application.

**Available Constants:**

- `COLORS`: Common color values used throughout the application
- `SHADOWS`: Standard shadow values for elements
- `FONTS`: Font family definitions
- `SPACING`: Standardized spacing values
- `BREAKPOINTS`: Standard screen size breakpoints

**Example:**

```tsx
import themeConstants from '../utils/themeConstants';

const { COLORS, SPACING } = themeConstants;

const styles = {
  container: {
    backgroundColor: COLORS.primary.light,
    padding: SPACING.md,
    margin: SPACING.lg,
  }
};
```

---

## Usage Examples

### Basic Form

```tsx
import React, { useState } from 'react';
import { Card, StatusMessage } from '../components/common';
import { FormInput, Button, Select } from '../components/ui';
import formValidation from '../utils/formValidation';

const ContactForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({});
    
    // Validate form
    const nameValidation = formValidation.validateRequired(name, 'Name');
    if (!nameValidation.isValid) {
      setErrors(prev => ({ ...prev, name: nameValidation.message }));
    }
    
    const emailValidation = formValidation.validateEmail(email);
    if (!emailValidation.isValid) {
      setErrors(prev => ({ ...prev, email: emailValidation.message }));
    }
    
    const subjectValidation = formValidation.validateRequired(subject, 'Subject');
    if (!subjectValidation.isValid) {
      setErrors(prev => ({ ...prev, subject: subjectValidation.message }));
    }
    
    const messageValidation = formValidation.validateRequired(message, 'Message');
    if (!messageValidation.isValid) {
      setErrors(prev => ({ ...prev, message: messageValidation.message }));
    }
    
    // Check if there are any errors
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      // Submit form logic here...
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setSubmitStatus({ type: 'success', text: 'Your message has been sent!' });
      // Reset form
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (error) {
      setSubmitStatus({ type: 'error', text: 'Failed to send message. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      {submitStatus && (
        <StatusMessage
          type={submitStatus.type}
          text={submitStatus.text}
          className="mb-6"
          onDismiss={() => setSubmitStatus(null)}
        />
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormInput
          id="name"
          label="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          required
          error={errors.name}
        />
        
        <FormInput
          id="email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com"
          required
          error={errors.email}
        />
        
        <Select
          id="subject"
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          options={[
            { value: 'general', label: 'General Inquiry' },
            { value: 'support', label: 'Technical Support' },
            { value: 'feedback', label: 'Feedback' }
          ]}
          required
          error={errors.subject}
        />
        
        <TextArea
          id="message"
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
          error={errors.message}
        />
        
        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingText="Sending..."
        >
          Send Message
        </Button>
      </form>
    </Card>
  );
};
```

### Data Display with Loading State

```tsx
import React, { useState, useEffect } from 'react';
import { Card, LoadingSpinner, PageHeader, StatusMessage } from '../components/common';

const DataDisplay = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch data logic here...
        const response = await fetch('/api/data');
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch data');
        }
        
        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div>
      <PageHeader
        title="Data Overview"
        subtitle="View and analyze your data"
        actions={
          <Button variant="primary" onClick={() => alert('Action')}>
            Refresh Data
          </Button>
        }
      />
      
      <Card>
        {isLoading ? (
          <LoadingSpinner text="Loading data..." />
        ) : error ? (
          <StatusMessage type="error" text={error} />
        ) : data.length === 0 ? (
          <StatusMessage type="info" text="No data available" />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};
```

---

## Best Practices

### Component Use Guidelines

1. **Use common components** whenever possible instead of creating custom implementations
2. **Pass all required props** to components to ensure they function correctly
3. **Leverage built-in validation** from the formValidation utility
4. **Use appropriate variants** for buttons and status messages based on context
5. **Provide meaningful error messages** that help users understand what went wrong
6. **Use loading states** for buttons and content areas when fetching data
7. **Keep component hierarchy shallow** to improve performance and readability

### Styling Guidelines

1. **Use Tailwind utility classes** for component customization when possible
2. **Use the themeConstants** for consistent colors, spacing, and other theme values
3. **Customize components** using the `className` prop rather than inline styles
4. **Follow responsive design practices** by testing on different screen sizes
5. **Use appropriate sizing** for buttons, icons, and other elements
6. **Ensure contrast** between text and background for accessibility

---

## Contributing

To add new components or enhance existing ones:

1. **Follow the existing patterns** for component structure and props
2. **Document all props** with proper TypeScript types
3. **Ensure accessibility** by following WAI-ARIA guidelines
4. **Test thoroughly** across different browsers and screen sizes
5. **Update this documentation** with any new components or changes

---

*This documentation was last updated on April 23, 2025.*