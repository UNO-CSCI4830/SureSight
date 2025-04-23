import formValidation, {
  validateEmail,
  validatePassword, 
  validatePasswordMatch, 
  validateRequired, 
  validatePhone, 
  formatPhoneNumber
} from '../../utils/formValidation';

describe('validateEmail', () => {
  it('should return isValid: false when email is empty', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Email is required');
  });

  it('should return isValid: false when email format is invalid', () => {
    const invalidEmails = [
      'test',
      'test@',
      'test@example',
      '@example.com',
      'test@.com',
      'test@example.',
    ];

    invalidEmails.forEach(email => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Please enter a valid email address');
    });
  });

  it('should return isValid: true when email format is valid', () => {
    const validEmails = [
      'test@example.com',
      'user.name@example.com',
      'user+tag@example.com',
      'user@subdomain.example.com',
    ];

    validEmails.forEach(email => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });
});

describe('validatePassword', () => {
  it('should return isValid: false when password is empty', () => {
    const result = validatePassword('');
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Password is required');
  });

  it('should validate minimum length requirement', () => {
    // Test with default minimum length (8)
    const shortPassword = 'pass';
    const result = validatePassword(shortPassword);
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Password must be at least 8 characters long');

    // Test with custom minimum length
    const customMinLength = 10;
    const borderlinePassword = '123456789';
    const customResult = validatePassword(borderlinePassword, { minLength: customMinLength });
    expect(customResult.isValid).toBe(false);
    expect(customResult.message).toBe(`Password must be at least ${customMinLength} characters long`);

    // Test with valid length
    const validPassword = 'password123';
    const validResult = validatePassword(validPassword);
    expect(validResult.isValid).toBe(true);
  });

  it('should validate number requirement when enabled', () => {
    const passwordWithoutNumbers = 'Password!';
    const result = validatePassword(passwordWithoutNumbers, { requireNumbers: true });
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Password must contain at least one number');

    const passwordWithNumbers = 'Password1!';
    const validResult = validatePassword(passwordWithNumbers, { requireNumbers: true });
    expect(validResult.isValid).toBe(true);
  });

  it('should validate special character requirement when enabled', () => {
    const passwordWithoutSpecialChars = 'Password123';
    const result = validatePassword(passwordWithoutSpecialChars, { requireSpecialChars: true });
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Password must contain at least one special character');

    const passwordWithSpecialChars = 'Password123!';
    const validResult = validatePassword(passwordWithSpecialChars, { requireSpecialChars: true });
    expect(validResult.isValid).toBe(true);
  });

  it('should validate uppercase requirement when enabled', () => {
    const passwordWithoutUppercase = 'password123!';
    const result = validatePassword(passwordWithoutUppercase, { requireUppercase: true });
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Password must contain at least one uppercase letter');

    const passwordWithUppercase = 'Password123!';
    const validResult = validatePassword(passwordWithUppercase, { requireUppercase: true });
    expect(validResult.isValid).toBe(true);
  });

  it('should validate lowercase requirement when enabled', () => {
    const passwordWithoutLowercase = 'PASSWORD123!';
    const result = validatePassword(passwordWithoutLowercase, { requireLowercase: true });
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Password must contain at least one lowercase letter');

    const passwordWithLowercase = 'PASSWORDa123!';
    const validResult = validatePassword(passwordWithLowercase, { requireLowercase: true });
    expect(validResult.isValid).toBe(true);
  });

  it('should validate multiple requirements together', () => {
    const options = {
      minLength: 10,
      requireNumbers: true,
      requireSpecialChars: true,
      requireUppercase: true,
      requireLowercase: true,
    };

    const validPassword = 'P@ssword123!';
    const validResult = validatePassword(validPassword, options);
    expect(validResult.isValid).toBe(true);

    // This should fail on the first requirement check (minLength)
    const shortPassword = 'Pw1!';
    const shortResult = validatePassword(shortPassword, options);
    expect(shortResult.isValid).toBe(false);
  });
});

describe('validatePasswordMatch', () => {
  it('should return isValid: true when passwords match', () => {
    const result = validatePasswordMatch('password123', 'password123');
    expect(result.isValid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('should return isValid: false when passwords do not match', () => {
    const result = validatePasswordMatch('password123', 'password124');
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Passwords do not match');
  });
});

describe('validateRequired', () => {
  it('should return isValid: false when value is empty', () => {
    const result = validateRequired('', 'Username');
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Username is required');
  });

  it('should return isValid: false when value is only whitespace', () => {
    const result = validateRequired('   ', 'Username');
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Username is required');
  });

  it('should return isValid: true when value is provided', () => {
    const result = validateRequired('JohnDoe', 'Username');
    expect(result.isValid).toBe(true);
    expect(result.message).toBeUndefined();
  });
});

describe('validatePhone', () => {
  it('should return isValid: false when phone is empty', () => {
    const result = validatePhone('');
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Phone number is required');
  });

  it('should return isValid: false when phone is too short', () => {
    const result = validatePhone('123456');
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Please enter a valid phone number');
  });

  it('should return isValid: true when phone has 10 or more digits', () => {
    const validPhones = [
      '1234567890',
      '(123) 456-7890',
      '123-456-7890',
      '123.456.7890',
      '+11234567890',
    ];

    validPhones.forEach(phone => {
      const result = validatePhone(phone);
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });
});

describe('formatPhoneNumber', () => {
  it('should format 10-digit phone numbers correctly', () => {
    expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
    expect(formatPhoneNumber('(123)456-7890')).toBe('(123) 456-7890');
    expect(formatPhoneNumber('123 456 7890')).toBe('(123) 456-7890');
    expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
  });

  it('should return original input when not 10 digits', () => {
    expect(formatPhoneNumber('123456789')).toBe('123456789');
    expect(formatPhoneNumber('12345678901')).toBe('12345678901');
    expect(formatPhoneNumber('abcdefghij')).toBe('abcdefghij');
  });
});

// Testing the default export (all functions together)
describe('formValidation default export', () => {
  it('should contain all validation functions', () => {
    expect(typeof formValidation.validateEmail).toBe('function');
    expect(typeof formValidation.validatePassword).toBe('function');
    expect(typeof formValidation.validatePasswordMatch).toBe('function');
    expect(typeof formValidation.validateRequired).toBe('function');
    expect(typeof formValidation.validatePhone).toBe('function');
    expect(typeof formValidation.formatPhoneNumber).toBe('function');
  });
});