const axios = require('axios');

async function testProductionRateLimit() {
  console.log('=== Testing Rate Limit in PRODUCTION environment ===');
  console.log('Make sure NODE_ENV is set to "production" in .env file');
  console.log('Server should be running on http://localhost:3000');
  console.log('Making 5 rapid requests to /health endpoint...\n');
  
  try {
    for (let i = 1; i <= 5; i++) {
      try {
        const response = await axios.get('http://localhost:3000/health');
        console.log(`✅ Request ${i}: Status ${response.status} - ${response.data.status}`);
      } catch (error) {
        if (error.response) {
          console.log(`❌ Request ${i}: Status ${error.response.status} - Rate limited!`);
          if (error.response.data && error.response.data.error) {
            console.log(`   Error: ${error.response.data.error}`);
          }
        } else {
          console.log(`❌ Request ${i}: Network error - ${error.message}`);
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n=== Expected Result ===');
    console.log('In PRODUCTION: First 2 requests should succeed, then rate limited');
    console.log('In DEVELOPMENT: All requests should succeed');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testProductionRateLimit();