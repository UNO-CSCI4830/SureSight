/**
 * Form Validation Utilities
 * 
 * This file contains reusable form validation functions.
 */

/**
 * Validates an email address
 * @param email Email address to validate
 * @returns Boolean indicating if email is valid and optional error message
 */
export const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }

  return { isValid: true };
};

/**
 * Validates a password
 * @param password Password to validate
 * @param options Options for password validation
 * @returns Boolean indicating if password is valid and optional error message
 */
export const validatePassword = (
  password: string,
  options: {
    minLength?: number;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
  } = {}
): { isValid: boolean; message?: string } => {
  const {
    minLength = 8,
    requireNumbers = false,
    requireSpecialChars = false,
    requireUppercase = false,
    requireLowercase = false,
  } = options;

  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < minLength) {
    return {
      isValid: false,
      message: `Password must be at least ${minLength} characters long`,
    };
  }

  if (requireNumbers && !/\d/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number',
    };
  }

  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one special character',
    };
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter',
    };
  }

  return { isValid: true };
};

/**
 * Validates that two passwords match
 * @param password Primary password
 * @param confirmPassword Password confirmation
 * @returns Boolean indicating if passwords match and optional error message
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): { isValid: boolean; message?: string } => {
  if (password !== confirmPassword) {
    return {
      isValid: false,
      message: 'Passwords do not match',
    };
  }

  return { isValid: true };
};

/**
 * Validates that a field has a value
 * @param value Value to check
 * @param fieldName Name of field for error message
 * @returns Boolean indicating if field has a value and optional error message
 */
export const validateRequired = (
  value: string,
  fieldName: string
): { isValid: boolean; message?: string } => {
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      message: `${fieldName} is required`,
    };
  }

  return { isValid: true };
};

/**
 * Validates a phone number
 * @param phone Phone number to validate
 * @returns Boolean indicating if phone is valid and optional error message
 */
export const validatePhone = (
  phone: string
): { isValid: boolean; message?: string } => {
  if (!phone) {
    return { isValid: false, message: 'Phone number is required' };
  }

  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < 10) {
    return {
      isValid: false,
      message: 'Please enter a valid phone number',
    };
  }

  return { isValid: true };
};

/**
 * Formats a phone number to a consistent format
 * @param phone Phone number to format
 * @returns Formatted phone number (e.g., (555) 123-4567)
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Apply US phone number format
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.substring(0, 3)}) ${digitsOnly.substring(
      3,
      6
    )}-${digitsOnly.substring(6)}`;
  }
  
  // Return original if not 10 digits
  return phone;
};

export default {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateRequired,
  validatePhone,
  formatPhoneNumber,
};