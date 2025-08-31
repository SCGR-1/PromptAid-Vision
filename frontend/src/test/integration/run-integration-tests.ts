#!/usr/bin/env node

/**
 * Integration Test Runner
 * 
 * This script runs all frontend integration tests using Vitest.
 * Integration tests verify that different components work together correctly.
 */

import { execSync } from 'child_process';
import { glob } from 'glob';
import path from 'path';

console.log('🧪 Frontend Integration Test Runner');
console.log('=====================================\n');

// Find all integration test files
const testFiles = glob.sync('src/test/integration/**/*.test.tsx');

if (testFiles.length === 0) {
  console.log('❌ No integration test files found');
  process.exit(1);
}

console.log(`📁 Found ${testFiles.length} integration test files:`);
testFiles.forEach(file => {
  console.log(`   - ${file}`);
});

console.log('\n🚀 Running integration tests...\n');

try {
  // Run integration tests with Vitest
  const command = `npx vitest run src/test/integration --reporter=verbose`;
  execSync(command, { stdio: 'inherit' });
  
  console.log('\n✅ All integration tests completed successfully!');
} catch (error) {
  console.error('\n❌ Integration tests failed!');
  console.error('Error:', error);
  process.exit(1);
}
