// Test environment detection
const { configManager } = require('./dist/config/index.js');

console.log('=== Environment Detection Test ===');
console.log('NODE_ENV from process.env:', process.env.NODE_ENV);
console.log('NODE_ENV from config:', configManager.get('nodeEnv'));
console.log('isDevelopment():', configManager.isDevelopment());
console.log('isProduction():', configManager.isProduction());