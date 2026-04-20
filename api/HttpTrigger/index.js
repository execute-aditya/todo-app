// Azure Functions HTTP Trigger - bridges Azure Functions runtime to Express app

const app = require('../server');

/**
 * Azure Functions v3 handler.
 * Converts the Azure Functions context/req into a standard Node.js
 * IncomingMessage / ServerResponse pair so Express can handle it.
 */
module.exports = async function (context, req) {
  // Return a promise so Azure waits for Express to finish
  await new Promise((resolve, reject) => {
    // Attach the Azure context so server.js can reference it if needed
    req.context = context;

    // Fake a minimal ServerResponse-compatible object
    const res = context.res || {};

    // Intercept Express's res.json / res.send via a custom response shim
    const { Writable } = require('stream');

    let statusCode = 200;
    const headers = {};
    let body = '';

    // Create a writable stream that collects the response body
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        body += chunk.toString();
        callback();
      },
    });

    // Monkey-patch enough of the Node http.ServerResponse API for Express
    writable.statusCode = statusCode;
    writable.statusMessage = 'OK';
    writable.setHeader = (name, value) => { headers[name] = value; };
    writable.getHeader = (name) => headers[name];
    writable.removeHeader = (name) => { delete headers[name]; };
    writable.writeHead = (code, _msg, hdrs) => {
      writable.statusCode = code;
      if (hdrs) Object.assign(headers, hdrs);
    };
    writable.end = (chunk, encoding, cb) => {
      if (chunk) body += chunk.toString();
      context.res = {
        status: writable.statusCode,
        headers,
        body,
      };
      resolve();
      if (typeof cb === 'function') cb();
    };

    // Let Express handle the request
    app(req, writable, (err) => {
      if (err) {
        context.res = { status: 500, body: JSON.stringify({ error: err.message }) };
        reject(err);
      }
    });
  });
};
