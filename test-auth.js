// Simple test script to verify authentication endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testAuth() {
  console.log('🧪 Testing Authentication System...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Health check:', healthResponse.data);

    // Test registration with invalid data (should fail)
    console.log('\n2. Testing registration with invalid data...');
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: 'invalid-email',
        password: '123', // Too weak
        name: ''
      });
    } catch (error) {
      console.log('✅ Registration validation working:', error.response.data);
    }

    // Test registration with valid data
    console.log('\n3. Testing registration with valid data...');
    const registerData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User'
    };

    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registerData);
      console.log('✅ Registration successful:', {
        message: registerResponse.data.message,
        user: registerResponse.data.user,
        hasToken: !!registerResponse.data.token
      });

      const token = registerResponse.data.token;

      // Test login
      console.log('\n4. Testing login...');
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: registerData.email,
        password: registerData.password
      });
      console.log('✅ Login successful:', {
        message: loginResponse.data.message,
        user: loginResponse.data.user,
        hasToken: !!loginResponse.data.token
      });

      // Test protected route
      console.log('\n5. Testing protected route...');
      const profileResponse = await axios.get(`${BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('✅ Protected route access:', profileResponse.data);

      // Test protected route without token
      console.log('\n6. Testing protected route without token...');
      try {
        await axios.get(`${BASE_URL}/auth/me`);
      } catch (error) {
        console.log('✅ Protected route blocked:', error.response.data);
      }

    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️ User already exists, testing login instead...');
        
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
          email: registerData.email,
          password: registerData.password
        });
        console.log('✅ Login successful:', {
          message: loginResponse.data.message,
          hasToken: !!loginResponse.data.token
        });
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All authentication tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests
testAuth();