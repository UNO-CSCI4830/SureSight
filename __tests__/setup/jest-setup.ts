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

// Add fetch polyfill for test environment
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, count: 0 }),
    text: () => Promise.resolve('mock response'),
  })
);

// Mock the Supabase client
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'mock-user-id' } } },
        error: null,
      }),
      session: jest.fn().mockReturnValue({ user: { id: 'mock-user-id' } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      }),
      onAuthChange: jest.fn().mockReturnValue({
        unsubscribe: jest.fn(),
      }),
      signOut: jest.fn().mockResolvedValue({}),
      signIn: jest.fn().mockImplementation((params) => {
        if (params?.email === 'fail@example.com') {
          return Promise.resolve({ error: { message: 'Invalid credentials' }, data: null });
        }
        return Promise.resolve({ data: { user: { id: 'mock-user-id' } }, error: null });
      }),
    },
    from: jest.fn().mockImplementation((table) => {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                role: 'user',
                profile_complete: true,
                id: 'mock-db-id',
              },
              error: null,
            }),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { role: 'user', id: 'mock-db-id' },
              error: null,
            }),
            limit: jest.fn().mockReturnValue({
              data: [{ id: 'mock-property-id' }],
              error: null,
            }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({
          data: { id: 'mock-insert-id' },
          error: null,
        }),
        update: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
        delete: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
    }),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockImplementation((path, file) => {
          // Simulate upload error for specific test cases
          if (path.includes('error')) {
            return Promise.resolve({ data: null, error: { message: 'Upload failed' } });
          }
          return Promise.resolve({ data: { path: path }, error: null });
        }),
        getPublicUrl: jest.fn().mockImplementation((path) => {
          return { data: { publicUrl: `https://example.com/${path.split('/').pop()}` } };
        }),
      }),
    },
    rpc: jest.fn().mockImplementation((func, params) => {
      return Promise.resolve({
        data: 'mock-image-id',
        error: null
      });
    }),
  },
}));

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
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window.URL.createObjectURL
window.URL.createObjectURL = jest.fn(() => 'mock-url');
window.URL.revokeObjectURL = jest.fn(() => {});

// Silence console warnings from tests
jest.spyOn(console, 'warn').mockImplementation(() => {});