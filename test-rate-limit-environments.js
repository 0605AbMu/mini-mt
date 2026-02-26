const axios = require('axios');
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:3000';
const TEST_ENDPOINT = '/health';

// Helper function to wait for server to start
const waitForServer = (timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkServer = async () => {
      try {
        await axios.get(`${BASE_URL}${TEST_ENDPOINT}`);
        resolve();
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Server failed to start within timeout'));
        } else {
          setTimeout(checkServer, 500);
        }
      }
    };
    checkServer();
  });
};

// Helper function to make multiple requests and check rate limiting
const testRateLimit = async (environment, expectedBehavior) => {
  console.log(`\n=== Testing ${environment.toUpperCase()} Environment ===`);
  
  const results = [];
  
  for (let i = 1; i <= 5; i++) {
    try {
      const response = await axios.get(`${BASE_URL}${TEST_ENDPOINT}`);
      results.push({
        request: i,
        status: response.status,
        success: true,
        message: 'Request successful'
      });
      console.log(`✅ Request ${i}: Status ${response.status} - Success`);
    } catch (error) {
      results.push({
        request: i,
        status: error.response?.status || 'ERROR',
        success: false,
        message: error.response?.data?.error || error.message
      });
      
      if (error.response?.status === 429) {
        console.log(`❌ Request ${i}: Status 429 - Rate limited!`);
      } else {
        console.log(`❌ Request ${i}: ${error.message}`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Analyze results
  const successfulRequests = results.filter(r => r.success).length;
  const rateLimitedRequests = results.filter(r => r.status === 429).length;
  
  console.log(`\nResults: ${successfulRequests} successful, ${rateLimitedRequests} rate limited`);
  
  if (environment === 'development') {
    if (successfulRequests === 5) {
      console.log('✅ PASS: All requests succeeded in development (rate limiting disabled)');
      return true;
    } else {
      console.log('❌ FAIL: Some requests were rate limited in development');
      return false;
    }
  } else if (environment === 'production') {
    if (successfulRequests <= 2 && rateLimitedRequests >= 3) {
      console.log('✅ PASS: Rate limiting working in production (max 2 requests allowed)');
      return true;
    } else {
      console.log('❌ FAIL: Rate limiting not working properly in production');
      return false;
    }
  }
};

// Helper function to start server in specific environment
const startServer = (environment) => {
  return new Promise((resolve, reject) => {
    console.log(`Starting server in ${environment} mode...`);
    
    const env = { ...process.env, NODE_ENV: environment };
    const server = spawn('node', ['dist/index.js'], { 
      env,
      stdio: 'pipe'
    });
    
    let serverReady = false;
    
    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server is running') && !serverReady) {
        serverReady = true;
        resolve(server);
      }
    });
    
    server.stderr.on('data', (data) => {
      console.error(`Server error: ${data}`);
    });
    
    server.on('close', (code) => {
      if (!serverReady) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!serverReady) {
        server.kill();
        reject(new Error('Server failed to start within 10 seconds'));
      }
    }, 10000);
  });
};

// Main test function
const runTests = async () => {
  console.log('🧪 Testing Rate Limiters in Different Environments\n');
  
  const testResults = [];
  
  // Test Development Environment
  try {
    console.log('📝 Building project...');
    const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
    await new Promise((resolve, reject) => {
      buildProcess.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Build failed with code ${code}`));
      });
    });
    
    console.log('🚀 Testing Development Environment');
    const devServer = await startServer('development');
    
    await waitForServer();
    const devResult = await testRateLimit('development', 'no-rate-limiting');
    testResults.push({ environment: 'development', passed: devResult });
    
    devServer.kill();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for server to stop
    
  } catch (error) {
    console.error('❌ Development test failed:', error.message);
    testResults.push({ environment: 'development', passed: false, error: error.message });
  }
  
  // Test Production Environment
  try {
    console.log('\n🚀 Testing Production Environment');
    const prodServer = await startServer('production');
    
    await waitForServer();
    const prodResult = await testRateLimit('production', 'rate-limiting-enabled');
    testResults.push({ environment: 'production', passed: prodResult });
    
    prodServer.kill();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for server to stop
    
  } catch (error) {
    console.error('❌ Production test failed:', error.message);
    testResults.push({ environment: 'production', passed: false, error: error.message });
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  testResults.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.environment.toUpperCase()}: ${result.error || 'Rate limiting behavior correct'}`);
  });
  
  const allPassed = testResults.every(r => r.passed);
  console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n✨ Rate limiters are correctly configured to work only in production!');
  } else {
    console.log('\n⚠️  Rate limiter configuration needs attention.');
  }
};

// Run the tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});