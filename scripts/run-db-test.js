#!/usr/bin/env node

/**
 * Simple script to run the database live test
 * 
 * Usage:
 * node scripts/run-db-test.js
 * 
 * To skip actual database interactions (dry run):
 * SKIP_LIVE_TESTS=true node scripts/run-db-test.js
 */

// For ESM compatibility with TypeScript files
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { register } from 'ts-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register ts-node for TypeScript files
register({ transpileOnly: true });

// Import the test using dynamic import
const runTest = async () => {
  try {
    console.log('=======================================');
    console.log('   SUPABASE DATABASE LIVE TESTING');
    console.log('=======================================');
    console.log('');

    // Dynamically import the test module (using .ts extension)
    const testModule = await import('../__tests__/utils/databaseLiveTest.ts');
    const { runDatabaseLiveTest } = testModule;

    // Run the test
    await runDatabaseLiveTest();
    
    console.log('');
    console.log('=======================================');
    console.log('   DATABASE TEST COMPLETED SUCCESSFULLY');
    console.log('=======================================');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('=======================================');
    console.error('   DATABASE TEST FAILED');
    console.error(`   Error: ${error.message}`);
    console.error('=======================================');
    process.exit(1);
  }
};

// Run the test function
runTest();