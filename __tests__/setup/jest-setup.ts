// Import jest-dom for extended DOM element assertions
import '@testing-library/jest-dom';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env files
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env.test'),
  path.resolve(process.cwd(), '.env.test.local')
];

// Load the first .env file found
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Jest: Loading environment variables from ${envPath}`);
    dotenv.config({ path: envPath });
    break;
  }
}

// Define mock data for Supabase responses to avoid test failures
const mockUserData = {
  id: 'mock-user-db-id',
  auth_user_id: 'mock-user-id',
  email: 'mock@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'user',
  profile_complete: true
};

const mockSession = {
  user: { 
    id: 'mock-user-id',
    email: 'mock@example.com',
    user_metadata: {}
  }
};

// Mock the Supabase client with a more sophisticated implementation
jest.mock('../../utils/supabaseClient', () => {
  // Create a function that returns a mock response with the proper structure
  const createMockResponse = (data = null, error = null) => {
    return Promise.resolve({
      data,
      error,
      count: Array.isArray(data) ? data.length : (data ? 1 : 0)
    });
  };

  // Create a proper chainable API that matches Supabase's structure
  const createChain = (tableData = null) => {
    // Store the current query state
    let currentData = tableData;
    let columns = '*';
    let filters = [];

    // Create the chainable object with all methods returning itself
    const chain = {
      select: (cols) => {
        columns = cols;
        return chain;
      },
      eq: (field, value) => {
        filters.push({ field, value, op: 'eq' });
        return chain;
      },
      neq: (field, value) => {
        filters.push({ field, value, op: 'neq' });
        return chain;
      },
      gt: (field, value) => {
        filters.push({ field, value, op: 'gt' });
        return chain;
      },
      lt: (field, value) => {
        filters.push({ field, value, op: 'lt' });
        return chain;
      },
      gte: (field, value) => {
        filters.push({ field, value, op: 'gte' });
        return chain;
      },
      lte: (field, value) => {
        filters.push({ field, value, op: 'lte' });
        return chain;
      },
      like: (field, value) => {
        filters.push({ field, value, op: 'like' });
        return chain;
      },
      ilike: (field, value) => {
        filters.push({ field, value, op: 'ilike' });
        return chain;
      },
      in: (field, values) => {
        filters.push({ field, value: values, op: 'in' });
        return chain;
      },
      is: (field, value) => {
        filters.push({ field, value, op: 'is' });
        return chain;
      },
      contains: (field, value) => {
        filters.push({ field, value, op: 'contains' });
        return chain;
      },
      containedBy: (field, value) => {
        filters.push({ field, value, op: 'containedBy' });
        return chain;
      },
      filter: (field, operator, value) => {
        filters.push({ field, value, op: operator });
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      offset: () => chain,
      range: () => chain,
      insert: (data) => {
        if (Array.isArray(data)) {
          return createMockResponse(data.map(item => ({ ...item, id: 'mock-id' })));
        }
        return createMockResponse({ ...data, id: 'mock-id' });
      },
      update: (data) => {
        // Apply the update to the current data and return
        return createMockResponse({ ...data, id: 'mock-id' });
      },
      upsert: (data) => {
        return createMockResponse({ ...data, id: 'mock-id' });
      },
      delete: () => {
        return createMockResponse(null);
      },
      // This method is the terminal operation that returns data
      then: (callback) => {
        // Process the filters to determine the final data
        let result = currentData;

        // Apply each filter
        if (Array.isArray(currentData)) {
          filters.forEach(filter => {
            if (filter.op === 'eq') {
              result = currentData.filter(item => item[filter.field] === filter.value);
            }
          });
        }

        // Create and return the response
        const response = {
          data: result,
          error: null,
          count: Array.isArray(result) ? result.length : (result ? 1 : 0)
        };

        return callback ? callback(response) : Promise.resolve(response);
      },
      // Critical methods used in Layout.tsx
      single: () => {
        // If we have array data, return the first item
        if (Array.isArray(currentData) && currentData.length > 0) {
          return createMockResponse(currentData[0]);
        }
        
        // If we have single-item data already
        if (currentData && !Array.isArray(currentData)) {
          return createMockResponse(currentData);
        }
        
        // If we have table-specific data based on filters
        if (filters.length > 0) {
          // Handle special case for user lookup by auth_user_id
          const authUserIdFilter = filters.find(f => 
            f.field === 'auth_user_id' && f.value === 'mock-user-id');
          
          if (authUserIdFilter) {
            return createMockResponse(mockUserData);
          }
          
          // Handle user lookup by email
          const emailFilter = filters.find(f => 
            f.field === 'email' && f.value === 'mock@example.com');
          
          if (emailFilter) {
            return createMockResponse(mockUserData);
          }
          
          // Handle user lookup by ID
          const idFilter = filters.find(f => 
            f.field === 'id' && f.value === 'mock-user-db-id');
          
          if (idFilter) {
            return createMockResponse(mockUserData);
          }
        }
        
        // Default mock data for users table
        return createMockResponse(mockUserData);
      },
      maybeSingle: () => {
        // Same implementation as single() for consistency
        return chain.single();
      }
    };

    return chain;
  };

  // Create RPC function for procedures
  const mockRpc = (procedure, params = {}) => {
    // Handle specific stored procedures
    if (procedure === 'create_property') {
      return createMockResponse('mock-property-id');
    }
    if (procedure === 'create_report') {
      return createMockResponse('mock-report-id');
    }
    if (procedure === 'add_assessment_area') {
      return createMockResponse('mock-area-id');
    }
    
    // Default
    return createMockResponse(null);
  };

  // The main Supabase client mock
  return {
    supabase: {
      auth: {
        getSession: jest.fn().mockReturnValue(Promise.resolve({
          data: { 
            session: mockSession
          },
          error: null
        })),
        session: jest.fn().mockReturnValue({ 
          user: mockSession.user 
        }),
        onAuthStateChange: jest.fn().mockReturnValue({
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        }),
        onAuthChange: jest.fn().mockReturnValue({
          unsubscribe: jest.fn()
        }),
        signIn: jest.fn().mockResolvedValue({
          data: { user: mockSession.user },
          error: null
        }),
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { user: mockSession.user },
          error: null
        }),
        signUp: jest.fn().mockResolvedValue({
          data: { user: mockSession.user },
          error: null
        }),
        signOut: jest.fn().mockResolvedValue({
          error: null
        })
      },
      from: jest.fn().mockImplementation((tableName) => {
        // Return table-specific mock data
        let tableData;
        
        switch (tableName) {
          case 'users':
            tableData = mockUserData;
            break;
          case 'properties':
            tableData = [{ id: 'mock-property-id', homeowner_id: 'mock-user-db-id' }];
            break;
          case 'reports':
            tableData = [{ id: 'mock-report-id', property_id: 'mock-property-id' }];
            break;
          case 'assessment_areas':
            tableData = [{ id: 'mock-area-id', report_id: 'mock-report-id' }];
            break;
          case 'images':
            tableData = [{ id: 'mock-image-id', report_id: 'mock-report-id' }];
            break;
          case 'messages':
            tableData = [{ id: 'mock-message-id', receiver_id: 'mock-user-db-id' }];
            break;
          default:
            tableData = null;
        }
        
        return createChain(tableData);
      }),
      storage: {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({ 
            data: { path: 'mock-path/mock-file.jpg' }, 
            error: null 
          }),
          getPublicUrl: jest.fn().mockReturnValue({ 
            publicURL: 'https://example.com/mock-file.jpg' 
          }),
          remove: jest.fn().mockResolvedValue({
            data: true,
            error: null
          })
        })
      },
      rpc: mockRpc
    }
  };
});

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn().mockReturnValue({
    route: '/',
    pathname: '',
    query: {},
    asPath: '',
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock localStorage for tests
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});