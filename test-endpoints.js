/**
 * Simple endpoint testing script
 * Run with: node test-endpoints.js
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';

// Test configuration
const testConfig = {
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  }
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to run a test
async function runTest(name, testFn) {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    await testFn();
    console.log(`✅ PASS: ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
  }
}

// Test functions
async function testHealthCheck() {
  const response = await axios.get(`${BASE_URL}/health`, testConfig);
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  if (!response.data.success) {
    throw new Error('Health check returned success: false');
  }
}

async function testDatabaseConnection() {
  const response = await axios.get(`${BASE_URL}/test-db`, testConfig);
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  if (!response.data.success) {
    throw new Error('Database test returned success: false');
  }
}

async function testInvalidRoute() {
  try {
    await axios.get(`${BASE_URL}/invalid-route`, testConfig);
    throw new Error('Expected 404 error for invalid route');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return; // This is expected
    }
    throw error;
  }
}

async function testOTPSend() {
  const testEmail = 'test@example.com';
  try {
    const response = await axios.post(`${BASE_URL}/otp/send`, {
      email: testEmail
    }, testConfig);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('OTP send returned success: false');
    }
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.log('   Note: Rate limited (this is expected behavior)');
      return;
    }
    throw error;
  }
}

async function testAuthRegisterWithoutData() {
  try {
    await axios.post(`${BASE_URL}/auth/register`, {}, testConfig);
    throw new Error('Expected 400 error for empty registration data');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      return; // This is expected
    }
    throw error;
  }
}

async function testKYCStatusWithoutAuth() {
  try {
    await axios.get(`${BASE_URL}/kyc/status`, testConfig);
    throw new Error('Expected 401 error for unauthenticated KYC status request');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      return; // This is expected
    }
    throw error;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Nani Wallet Backend API Tests');
  console.log(`📍 Testing against: ${BASE_URL}`);
  
  // Basic functionality tests
  await runTest('Health Check', testHealthCheck);
  await runTest('Database Connection', testDatabaseConnection);
  await runTest('Invalid Route (404)', testInvalidRoute);
  
  // API endpoint tests
  await runTest('OTP Send', testOTPSend);
  await runTest('Auth Register (validation)', testAuthRegisterWithoutData);
  await runTest('KYC Status (authentication)', testKYCStatusWithoutAuth);
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total: ${results.passed + results.failed}`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => t.status === 'FAIL').forEach(test => {
      console.log(`   - ${test.name}: ${test.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Add axios as dependency if not already present
const packageJson = require('./package.json');
if (!packageJson.dependencies.axios && !packageJson.devDependencies.axios) {
  console.log('⚠️  Warning: axios not found in dependencies. Install with: npm install axios');
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
