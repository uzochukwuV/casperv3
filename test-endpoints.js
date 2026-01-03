// Simple test to verify server endpoints
const axios = require('axios');

async function testEndpoints() {
  const baseUrl = 'http://localhost:3001';
  
  console.log('Testing server endpoints...\n');
  
  // Test health endpoint
  try {
    const response = await axios.get(`${baseUrl}/health`);
    console.log('✓ Health endpoint:', response.data);
  } catch (error) {
    console.log('✗ Health endpoint failed:', error.message);
  }
  
  // Test deployment info endpoint
  try {
    const response = await axios.get(`${baseUrl}/api/dex/deployment-info`);
    console.log('✓ Deployment info endpoint:', response.data);
  } catch (error) {
    console.log('✗ Deployment info endpoint failed:', error.message);
  }
  
  // Test pools endpoint
  try {
    const response = await axios.get(`${baseUrl}/api/dex/pools`);
    console.log('✓ Pools endpoint:', response.data);
  } catch (error) {
    console.log('✗ Pools endpoint failed:', error.message);
  }
  
  // Test CSPR.cloud connectivity
  try {
    const response = await axios.get(`${baseUrl}/api/dex/test-cspr-cloud`);
    console.log('✓ CSPR.cloud test:', response.data);
  } catch (error) {
    console.log('✗ CSPR.cloud test failed:', error.message);
  }
}

testEndpoints().catch(console.error);