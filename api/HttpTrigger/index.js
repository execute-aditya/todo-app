// Azure Functions HTTP Trigger — native handler for Azure Static Web Apps
// Handles: GET /api/todos, POST /api/todos, PUT /api/todos/:id, DELETE /api/todos/:id

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
  if (!endpoint || !key) throw new Error('COSMOS_ENDPOINT and COSMOS_KEY environment variables are not set');
  const client = new CosmosClient({ endpoint, key });
  container = client.database('tododb').container('todos');
  return container;
}

function respond(context, status, body) {
  context.res = {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

module.exports = async function (context, req) {
  context.log(`[TodoAPI] ${req.method} ${req.url}`);

  try {
    // Parse path robustly from req.url — more reliable than req.params in SWA context
    // req.url may be a full URL (https://...) or a relative path (/api/todos)
    let pathname;
    try {
      pathname = new URL(req.url).pathname;
    } catch (_) {
      pathname = req.url.split('?')[0]; // fallback for relative URLs
    }

    // Strip /api/ prefix to get the resource path: "todos" or "todos/abc123"
    // Handles both "/api/todos" and "api/todos"
    const resource = pathname.replace(/^\/?api\//, '').replace(/^\/+|\/+$/g, '');
    const method = req.method.toUpperCase();

    context.log(`[TodoAPI] resource="${resource}" method="${method}"`);

    // Route: /api/todos
    if (resource === 'todos') {
      const c = getContainer();

      if (method === 'GET') {
        const { resources } = await c.items
          .query('SELECT * FROM c ORDER BY c._ts DESC')
          .fetchAll();
        return respond(context, 200, resources);
      }

      if (method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        if (!body.text) return respond(context, 400, { error: 'text is required' });
        const todo = {
          id: `todo-${Date.now()}`,
          text: body.text,
          completed: body.completed || false,
          createdAt: new Date().toISOString(),
        };
        const { resource: created } = await c.items.create(todo);
        return respond(context, 201, created);
      }

      return respond(context, 405, { error: `Method ${method} not allowed on /api/todos` });
    }

    // Route: /api/todos/:id
    const idMatch = resource.match(/^todos\/([^/]+)$/);
    if (idMatch) {
      const id = idMatch[1];
      const c = getContainer();

      if (method === 'PUT') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const todo = { id, text: body.text, completed: !!body.completed, createdAt: body.createdAt };
        const { resource: updated } = await c.item(id, id).replace(todo);
        return respond(context, 200, updated);
      }

      if (method === 'DELETE') {
        await c.item(id, id).delete();
        return respond(context, 200, { success: true, id });
      }

      return respond(context, 405, { error: `Method ${method} not allowed on /api/todos/:id` });
    }

    // Health check: GET /api/health
    if (resource === 'health') {
      return respond(context, 200, { status: 'ok', timestamp: new Date().toISOString() });
    }

    return respond(context, 404, { error: `Unknown route: ${resource}` });

  } catch (err) {
    context.log.error('[TodoAPI] Error:', err.message, err.stack);
    return respond(context, 500, { error: err.message });
  }
};
