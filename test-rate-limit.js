const axios = require('axios');

async function testRateLimit(env) {
  console.log(`\n=== Testing Rate Limit in ${env.toUpperCase()} environment ===`);
  
  // Set environment variable
  process.env.NODE_ENV = env;
  
  // Start server in background
  const { spawn } = require('child_process');
  const server = spawn('npm', ['run', 'dev'], {
    env: { ...process.env, NODE_ENV: env },
    stdio: 'pipe'
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Test multiple requests to trigger rate limit
    console.log('Making 5 rapid requests to /health endpoint...');
    
    for (let i = 1; i <= 5; i++) {
      try {
        const response = await axios.get('http://localhost:3000/health');
        console.log(`Request ${i}: Status ${response.status} - ${response.data.status}`);
      } catch (error) {
        if (error.response) {
          console.log(`Request ${i}: Status ${error.response.status} - Rate limited!`);
          console.log(`Error message: ${error.response.data.error || error.response.data}`);
        } else {
          console.log(`Request ${i}: Network error - ${error.message}`);
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    // Kill server
    server.kill();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function runTests() {
  try {
    // Test in development (rate limit should be disabled)
    await testRateLimit('development');
    
    // Test in production (rate limit should be enabled)
    await testRateLimit('production');
    
    console.log('\n=== Test Summary ===');
    console.log('✅ Development: Rate limit should be DISABLED (all requests should succeed)');
    console.log('✅ Production: Rate limit should be ENABLED (requests should be limited after 2 requests)');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();