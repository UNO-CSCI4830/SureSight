# Form Validation Utilities Documentation

## Overview

The `formValidation` utility provides a set of reusable functions for common form validation tasks. These utilities help ensure data integrity and provide consistent user feedback across the SureSight application.

## Installation

The validation utilities are built into the SureSight application. You can import them as follows:

```typescript
import formValidation from '../utils/formValidation';

// Or import specific functions
import { validateEmail, validatePassword, validatePhone } from '../utils/formValidation';
```

## Available Functions

### validateEmail

Validates an email address against a standard format.

**Signature:**
```typescript
validateEmail(email: string): { isValid: boolean; message?: string }
```

**Parameters:**
- `email` (string): The email address to validate.

**Returns:**
- An object with `isValid` (boolean) indicating if validation passed and an optional `message` (string) if validation failed.

**Example:**
```typescript
const emailResult = formValidation.validateEmail('user@example.com');
if (!emailResult.isValid) {
  setEmailError(emailResult.message);
}
```

### validatePassword

Validates a password based on configurable requirements.

**Signature:**
```typescript
validatePassword(
  password: string,
  options?: {
    minLength?: number;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
  }
): { isValid: boolean; message?: string }
```

**Parameters:**
- `password` (string): The password to validate.
- `options` (object, optional): Configuration options for validation:
  - `minLength` (number, default: 8): Minimum required length.
  - `requireNumbers` (boolean, default: false): Whether to require at least one number.
  - `requireSpecialChars` (boolean, default: false): Whether to require at least one special character.
  - `requireUppercase` (boolean, default: false): Whether to require at least one uppercase letter.
  - `requireLowercase` (boolean, default: false): Whether to require at least one lowercase letter.

**Returns:**
- An object with `isValid` (boolean) indicating if validation passed and an optional `message` (string) if validation failed.

**Example:**
```typescript
const passwordResult = formValidation.validatePassword(password, {
  minLength: 10,
  requireNumbers: true,
  requireSpecialChars: true,
  requireUppercase: true,
});

if (!passwordResult.isValid) {
  setPasswordError(passwordResult.message);
}
```

### validatePasswordMatch

Confirms that two passwords match.

**Signature:**
```typescript
validatePasswordMatch(
  password: string,
  confirmPassword: string
): { isValid: boolean; message?: string }
```

**Parameters:**
- `password` (string): The original password.
- `confirmPassword` (string): The confirmation password to check against the original.

**Returns:**
- An object with `isValid` (boolean) indicating if passwords match and an optional `message` (string) if they don't.

**Example:**
```typescript
const matchResult = formValidation.validatePasswordMatch(password, confirmPassword);
if (!matchResult.isValid) {
  setConfirmPasswordError(matchResult.message);
}
```

### validateRequired

Validates that a required field has a value.

**Signature:**
```typescript
validateRequired(
  value: string,
  fieldName: string
): { isValid: boolean; message?: string }
```

**Parameters:**
- `value` (string): The value to check.
- `fieldName` (string): Name of the field (used in error messages).

**Returns:**
- An object with `isValid` (boolean) indicating if field has a value and an optional `message` (string) if it doesn't.

**Example:**
```typescript
const nameResult = formValidation.validateRequired(name, 'Name');
if (!nameResult.isValid) {
  setNameError(nameResult.message);
}
```

### validatePhone

Validates that a string is a valid phone number.

**Signature:**
```typescript
validatePhone(phone: string): { isValid: boolean; message?: string }
```

**Parameters:**
- `phone` (string): The phone number to validate.

**Returns:**
- An object with `isValid` (boolean) indicating if validation passed and an optional `message` (string) if validation failed.

**Example:**
```typescript
const phoneResult = formValidation.validatePhone(phoneNumber);
if (!phoneResult.isValid) {
  setPhoneError(phoneResult.message);
}
```

### formatPhoneNumber

Formats a phone number string into a standardized format.

**Signature:**
```typescript
formatPhoneNumber(phone: string): string
```

**Parameters:**
- `phone` (string): The phone number to format.

**Returns:**
- Formatted phone number string (e.g., "(555) 123-4567").

**Example:**
```typescript
const formattedPhone = formValidation.formatPhoneNumber('5551234567');
// Returns: "(555) 123-4567"
```

## Integration with Forms

Here's how to integrate form validation utilities with form submission:

```typescript
import React, { useState } from 'react';
import formValidation from '../utils/formValidation';
import { FormInput, Button } from '../components/ui';
import { StatusMessage } from '../components/common';

const RegistrationForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset errors
    const newErrors = {};
    
    // Validate email
    const emailResult = formValidation.validateEmail(email);
    if (!emailResult.isValid) {
      newErrors.email = emailResult.message;
    }
    
    // Validate password
    const passwordResult = formValidation.validatePassword(password, {
      minLength: 8,
      requireNumbers: true,
      requireSpecialChars: true
    });
    if (!passwordResult.isValid) {
      newErrors.password = passwordResult.message;
    }
    
    // Validate password match
    const matchResult = formValidation.validatePasswordMatch(password, confirmPassword);
    if (!matchResult.isValid) {
      newErrors.confirmPassword = matchResult.message;
    }
    
    // Validate phone (if provided)
    if (phone) {
      const phoneResult = formValidation.validatePhone(phone);
      if (!phoneResult.isValid) {
        newErrors.phone = phoneResult.message;
      }
    }
    
    // Check if there are any errors
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Format phone for submission
    const formattedPhone = formValidation.formatPhoneNumber(phone);
    
    // Form submission logic...
    setIsSubmitting(true);
    
    try {
      // API call or other submission logic
      await submitForm({ email, password, phone: formattedPhone });
      setSubmitStatus({ type: 'success', text: 'Registration successful!' });
    } catch (error) {
      setSubmitStatus({ type: 'error', text: error.message || 'Registration failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {submitStatus && (
        <StatusMessage
          type={submitStatus.type}
          text={submitStatus.text}
          className="mb-6"
        />
      )}
      
      <form onSubmit={handleSubmit}>
        <FormInput
          id="email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          error={errors.email}
        />
        
        <FormInput
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          helpText="Must be at least 8 characters with numbers and special characters"
          error={errors.password}
        />
        
        <FormInput
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          error={errors.confirmPassword}
        />
        
        <FormInput
          id="phone"
          label="Phone Number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          helpText="Optional: Format will be standardized on submission"
          error={errors.phone}
        />
        
        <Button
          type="submit"
          isLoading={isSubmitting}
          className="mt-4"
        >
          Register
        </Button>
      </form>
    </div>
  );
};
```

## Best Practices

1. **Always handle validation results**: Check `isValid` and display appropriate error messages.
2. **Validate on submit**: Perform full validation when the form is submitted.
3. **Optional inline validation**: You may also validate fields on blur for improved UX.
4. **Show specific errors**: The message returned by validation functions is designed to be user-friendly.
5. **Combine validations**: Use multiple validation functions when appropriate (e.g., `validateRequired` followed by `validateEmail`).
6. **Format before submission**: Use formatting utilities like `formatPhoneNumber` to standardize data before sending to APIs.
7. **Don't over-validate**: Consider your users' needs and only enforce validation that serves a purpose.

## Extending the Utilities

If you need to add new validation functions, follow this pattern:

```typescript
export const validateCustomField = (
  value: string,
  options?: { /* any options */ }
): { isValid: boolean; message?: string } => {
  // Default parameter values
  const { /* defaults */ } = options || {};
  
  // Validation logic
  if (!value) {
    return { isValid: false, message: 'Field is required' };
  }
  
  // More validation logic...
  
  // Return success when all validation passes
  return { isValid: true };
};

// Add to default export
export default {
  // ...existing exports
  validateCustomField,
};
```

---

*This documentation was last updated on April 23, 2025.*