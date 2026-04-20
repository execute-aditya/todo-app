// Azure Functions HTTP Trigger
// function.json uses "name": "$return" → must RETURN the response object, not set context.res

'use strict';

if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config({ path: require('path').join(__dirname, '../.env') }); } catch (_) {}
}

const { CosmosClient } = require('@azure/cosmos');

let container = null;

function getContainer() {
  if (container) return container;
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  if (!endpoint || !key) throw new Error('COSMOS_ENDPOINT and COSMOS_KEY are not set');
  const client = new CosmosClient({ endpoint, key });
  container = client.database('tododb').container('todos');
  return container;
}

// Returns the response object — caller must `return` this from the handler
function respond(status, body) {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

module.exports = async function (context, req) {
  context.log(`[TodoAPI] ${req.method} ${req.url}`);

  try {
    // Parse path from req.url — works in both SWA and standalone Functions
    let pathname;
    try {
      pathname = new URL(req.url).pathname;
    } catch (_) {
      pathname = req.url.split('?')[0];
    }

    // Strip leading /api/ prefix to get resource: "todos" or "todos/abc123"
    const resource = pathname.replace(/^\/?api\//, '').replace(/^\/+|\/+$/g, '');
    const method = req.method.toUpperCase();

    context.log(`[TodoAPI] resource="${resource}" method="${method}"`);

    // Health check — no Cosmos DB needed
    if (resource === 'health') {
      return respond(200, { status: 'ok', timestamp: new Date().toISOString() });
    }

    // GET /api/todos
    if (resource === 'todos' && method === 'GET') {
      const { resources } = await getContainer().items
        .query('SELECT * FROM c ORDER BY c._ts DESC')
        .fetchAll();
      return respond(200, resources);
    }

    // POST /api/todos
    if (resource === 'todos' && method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (!body.text) return respond(400, { error: 'text field is required' });
      const todo = {
        id: `todo-${Date.now()}`,
        text: body.text,
        completed: body.completed || false,
        createdAt: new Date().toISOString(),
      };
      const { resource: created } = await getContainer().items.create(todo);
      return respond(201, created);
    }

    // PUT /api/todos/:id
    const idMatch = resource.match(/^todos\/([^/]+)$/);
    if (idMatch && method === 'PUT') {
      const id = idMatch[1];
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const todo = { id, text: body.text, completed: !!body.completed, createdAt: body.createdAt };
      const { resource: updated } = await getContainer().item(id, id).replace(todo);
      return respond(200, updated);
    }

    // DELETE /api/todos/:id
    if (idMatch && method === 'DELETE') {
      const id = idMatch[1];
      await getContainer().item(id, id).delete();
      return respond(200, { success: true, id });
    }

    return respond(404, { error: `Unknown route: /${resource}` });

  } catch (err) {
    context.log.error('[TodoAPI] Error:', err.message);
    return respond(500, { error: err.message });
  }
};
