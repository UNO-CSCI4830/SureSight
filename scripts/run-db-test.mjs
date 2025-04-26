#!/usr/bin/env node

/**
 * Simple script to run the database live test
 * 
 * Usage:
 * node scripts/run-db-test.mjs
 * 
 * To skip actual database interactions (dry run):
 * SKIP_LIVE_TESTS=true node scripts/run-db-test.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run the test script
const runTest = async () => {
  try {
    console.log('=======================================');
    console.log('   SUPABASE DATABASE LIVE TESTING');
    console.log('=======================================');
    console.log('');
    
    // First compile the TypeScript file
    console.log('Compiling TypeScript test file...');
    const compileResult = spawnSync('npx', ['tsc', '--esModuleInterop', 
      resolve(__dirname, '../__tests__/utils/databaseLiveTest.ts'),
      '--outDir', resolve(__dirname, '../temp')], 
      { stdio: 'inherit' });
    
    if (compileResult.status !== 0) {
      throw new Error('Failed to compile TypeScript test file');
    }
    
    // Import the compiled JavaScript module
    console.log('Running database tests...');
    const { runDatabaseLiveTest } = await import('../temp/databaseLiveTest.js');
    
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