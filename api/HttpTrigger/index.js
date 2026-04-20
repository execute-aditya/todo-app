// Azure Static Web Apps API endpoint
// Direct Express app export for Azure Functions runtime

const app = require('../server');

// Azure Functions will automatically invoke this as the handler
module.exports = app;




