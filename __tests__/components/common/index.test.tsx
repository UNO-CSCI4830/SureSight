/**
 * Common Components Test Suite
 * 
 * This file imports all common component tests so they can be run together.
 * To run only these tests: npm test -- components/common
 */

// Import all common component tests
import './display/LoadingSpinner.test';
import './display/PageHeader.test';
import './display/StatusMessage.test';
import './display/Card.test';  // Already existed
import './form/FormField.test';

// Group the common component tests
describe('Common Components', () => {
  it('should run all common component tests', () => {
    // This test is just a placeholder to ensure the describe block runs
    expect(true).toBe(true);
  });
});