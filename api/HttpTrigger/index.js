// Azure Static Web Apps API endpoint
// Express app handler for Azure Functions runtime

const app = require('../server');

module.exports = async function (context, req) {
  // Azure Functions passes context and req
  // We need to invoke the Express app and capture its response
  
  return new Promise((resolve, reject) => {
    // Create a response object that captures the response
    let statusCode = 200;
    let responseBody = '';
    let responseHeaders = {};
    
    const res = {
      statusCode: statusCode,
      headers: responseHeaders,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      setHeader: function(name, value) {
        this.headers[name] = value;
      },
      write: function(data) {
        if (typeof data === 'string') {
          responseBody += data;
        } else if (Buffer.isBuffer(data)) {
          responseBody += data.toString();
        }
        return this;
      },
      end: function(data) {
        if (data) {
          if (typeof data === 'string') {
            responseBody += data;
          } else if (Buffer.isBuffer(data)) {
            responseBody += data.toString();
          }
        }
        
        // Set the context response to Azure's format
        context.res = {
          status: this.statusCode,
          headers: this.headers,
          body: responseBody
        };
        resolve();
      },
      json: function(obj) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(obj));
        return this;
      }
    };
    
    // Invoke the Express app
    try {
      app(req, res);
    } catch (err) {
      reject(err);
    }
  });
};




