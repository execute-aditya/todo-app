// Azure Functions entry point
// Ensure environment variables are loaded before starting the app
console.log('[AZURE] Loading API...');
console.log('[AZURE] NODE_ENV:', process.env.NODE_ENV);

// Start the Express app
const app = require('./server');
module.exports = app;

