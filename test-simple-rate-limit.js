const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_ENDPOINT = '/health';

// Simple test function
const testRateLimit = async (environment) => {
  console.log(`\n=== Testing Rate Limit Behavior ===`);
  console.log(`Environment: ${environment}`);
  console.log(`Making 5 requests to ${BASE_URL}${TEST_ENDPOINT}...\n`);
  
  const results = [];
  
  for (let i = 1; i <= 5; i++) {
    try {
      const response = await axios.get(`${BASE_URL}${TEST_ENDPOINT}`);
      results.push({
        request: i,
        status: response.status,
        success: true
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
        console.log(`   Message: ${error.response?.data?.error || 'Rate limit exceeded'}`);
      } else {
        console.log(`❌ Request ${i}: ${error.message}`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Analyze results
  const successfulRequests = results.filter(r => r.success).length;
  const rateLimitedRequests = results.filter(r => r.status === 429).length;
  
  console.log(`\n📊 Results Summary:`);
  console.log(`   Successful requests: ${successfulRequests}/5`);
  console.log(`   Rate limited requests: ${rateLimitedRequests}/5`);
  
  return { successfulRequests, rateLimitedRequests, results };
};

// Main function
const runTest = async () => {
  console.log('🧪 Rate Limiter Test');
  console.log('📝 Make sure to start the server manually with the desired NODE_ENV');
  console.log('   For development: NODE_ENV=development npm start');
  console.log('   For production: NODE_ENV=production npm start');
  
  try {
    // Check if server is running
    await axios.get(`${BASE_URL}${TEST_ENDPOINT}`);
    console.log('✅ Server is running');
    
    // Determine environment by making a test request and checking behavior
    const testResult = await testRateLimit('unknown');
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 INTERPRETATION:');
    console.log('='.repeat(50));
    
    if (testResult.successfulRequests === 5) {
      console.log('✅ All requests succeeded - Server is likely running in DEVELOPMENT mode');
      console.log('   (Rate limiting is disabled in development)');
    } else if (testResult.rateLimitedRequests >= 3) {
      console.log('✅ Requests were rate limited - Server is likely running in PRODUCTION mode');
      console.log('   (Rate limiting is enabled in production)');
    } else {
      console.log('⚠️  Unexpected behavior - Check server configuration');
    }
    
  } catch (error) {
    console.error('❌ Cannot connect to server. Make sure the server is running on port 3000');
    console.error('   Start the server with: npm run dev (development) or npm start (production)');
  }
};

runTest();