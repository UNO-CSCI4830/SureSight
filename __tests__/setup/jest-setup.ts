// Import jest-dom for extended DOM element assertions
import '@testing-library/jest-dom';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Polyfill for setImmediate which is used by google-cloud libraries
// but not available in Jest's jsdom environment
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (callback, ...args) => setTimeout(callback, 0, ...args);
}

// Increase default timeout for all tests to accommodate API calls
jest.setTimeout(60000); // 60 seconds

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
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              role: 'user',
              profile_complete: true,
            },
            error: null,
          }),
          limit: jest.fn().mockResolvedValue({
            data: [{ id: 'mock-property-id' }],
            error: null,
          }),
        }),
      }),
      insert: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      update: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'mock-file-path' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ publicURL: 'https://example.com/mock-file.jpg' }),
      }),
    },
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