// Azure Static Web Apps API endpoint
// Handle HTTP requests through Express app
const app = require('../server');

module.exports = async function (context, req) {
  return new Promise((resolve) => {
    // Set up response handling
    const chunks = [];
    const mockRes = {
      statusCode: 200,
      headers: {},
      write: (chunk) => {
        if (chunk) chunks.push(chunk);
      },
      end: (chunk) => {
        if (chunk) chunks.push(chunk);
        context.res = {
          status: mockRes.statusCode,
          headers: mockRes.headers,
          body: Buffer.concat(chunks).toString()
        };
        resolve();
      },
      setHeader: (name, value) => {
        mockRes.headers[name] = value;
      }
    };
    
    // Invoke the Express app
    app(req, mockRes);
  });
};




