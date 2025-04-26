# SureSight Testing Documentation

This directory contains all test files for the SureSight application. This document provides an overview of the testing strategy, tools, and guidelines for working with tests in this project.

## Table of Contents

- [Testing Stack](#testing-stack)
- [Test Directory Structure](#test-directory-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Database Testing](#database-testing)
- [Mocking](#mocking)
- [Best Practices](#best-practices)

## Testing Stack

SureSight uses the following testing technologies:

- **Jest** - Main test runner and framework
- **React Testing Library** - For testing React components
- **jest-environment-jsdom** - DOM environment for component tests
- **user-event** - For simulating user interactions
- **node-mocks-http** - For testing API routes
- **Supabase client mocking** - For database integration testing

## Test Directory Structure

The test directory mirrors the structure of the source code:

```
__tests__/
  ├── components/       # Component tests
  │   ├── auth/         # Auth-related component tests
  │   ├── common/       # Common component tests
  │   ├── layout/       # Layout component tests
  │   └── ui/           # UI component tests
  ├── pages/            # Page component tests
  │   └── api/          # API route tests
  ├── setup/            # Test setup files
  │   └── jest-setup.ts # Jest configuration
  └── utils/            # Utility function tests
      ├── databaseLiveTest.ts                 # Live database testing
      ├── databaseService.integration.test.ts # DB service integration tests
      ├── databaseService.test.ts             # DB service unit tests
      ├── formValidation.test.ts              # Form validation tests
      ├── supabaseAuth.test.ts                # Auth utility tests
      ├── supabaseClient.test.ts              # Supabase client tests
      └── supabaseDatabaseConnection.test.ts  # DB connection tests
```

## Running Tests

### All Tests

To run all tests:

```bash
npm test
```

### Specific Tests

To run specific tests:

```bash
npm test -- path/to/test-file.test.ts
```

For example:

```bash
npm test -- __tests__/utils/formValidation.test.ts
```

### With Coverage

To run tests with coverage report:

```bash
npm run test:coverage
```

The coverage report will be generated in the `coverage/` directory.

### Database Tests

The project includes specialized tests for the Supabase database:

```bash
# Run database connectivity and functionality tests
npm run test:db

# Run database tests in safe mode (without making changes)
npm run test:db:safe
```

## Writing Tests

### Component Tests

When writing tests for React components:

1. Create a test file with the same name as the component, appended with `.test.tsx`
2. Import the component and required testing utilities
3. Use React Testing Library to render and interact with the component
4. Assert on the expected behavior

Example:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../../components/ui/Button';

describe('Button component', () => {
  test('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByText('Click me'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### API Tests

For API route tests:

1. Create a test file in the `__tests__/pages/api/` directory
2. Import the API handler and `node-mocks-http` for request/response mocking
3. Create mock request/response objects
4. Call the API handler with the mocks
5. Assert on the response

Example:

```typescript
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/notifications';

describe('/api/notifications', () => {
  test('returns notifications for a valid user', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { user_id: 'valid-user-id' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toBeInstanceOf(Array);
  });
});
```

### Utility Tests

For utility function tests:

1. Create a test file with the same name as the utility file, appended with `.test.ts`
2. Import the utility functions
3. Write test cases for different scenarios
4. Use Jest matchers to assert on the expected results

Example:

```typescript
import { validateEmail, validatePassword } from '../../utils/formValidation';

describe('Form validation utilities', () => {
  describe('validateEmail', () => {
    test('returns true for valid email', () => {
      expect(validateEmail('user@example.com')).toBe(true);
    });
    
    test('returns false for invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
    });
  });
});
```

## Database Testing

### Mock Tests

For testing database operations without connecting to the actual database:

1. Use the mock Supabase client in `__tests__/utils/supabaseClient.test.ts`
2. Define expected mock responses
3. Test your code against these mocks

Example:

```typescript
// Import the mocked supabase client
import { supabase } from '../../utils/supabaseClient';
import { getUserProfile } from '../../utils/userService';

// Mock implementation
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-1', name: 'Test User' },
            error: null
          })
        })
      })
    })
  }
}));

describe('User Service', () => {
  test('getUserProfile returns user data', async () => {
    const result = await getUserProfile('user-1');
    
    expect(result).toEqual({
      id: 'user-1',
      name: 'Test User'
    });
    
    expect(supabase.from).toHaveBeenCalledWith('users');
  });
});
```

### Integration Tests

For testing against the actual database structure:

1. Use the integration test files in `__tests__/utils/`
2. These tests use a mocked client but test the actual database operations logic
3. They validate that your queries are structured correctly

### Live Database Tests

For comprehensive testing against your actual Supabase instance:

1. Use `npm run test:db` to run the live database tests
2. These tests verify your database connections, schema, and functionality
3. They create test data, validate it, and clean up afterward

## Mocking

### Supabase Mocking

The project uses Jest's mocking system to mock Supabase client operations:

```typescript
// Example of Supabase client mocking
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      signIn: jest.fn(),
      signUp: jest.fn(),
      // other auth methods...
    },
    storage: {
      // storage methods...
    }
  }
}));
```

### React Component Mocking

For components that depend on other components or context:

```typescript
// Example of React component mocking
jest.mock('../../components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick }) => (
    <button onClick={onClick} data-testid="mocked-button">
      {children}
    </button>
  )
}));
```

## Best Practices

1. **Isolate tests** - Each test should be independent of others
2. **Test behavior, not implementation** - Focus on what the code does, not how it does it
3. **Use descriptive test names** - Test names should describe the expected behavior
4. **Keep tests simple** - Tests should be easy to understand and maintain
5. **Mock external dependencies** - Use Jest's mocking capabilities to isolate your code
6. **Clean up after tests** - Restore mocks and clean up any side effects
7. **Test edge cases** - Include tests for error conditions and edge cases
8. **Maintain test coverage** - Aim for high test coverage, especially for critical paths
9. **Keep tests fast** - Tests should run quickly to facilitate development
10. **Follow the AAA pattern** - Arrange (setup), Act (execute), Assert (verify)