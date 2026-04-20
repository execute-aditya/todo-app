// Azure Functions HTTP Trigger — native handler (no Express bridge needed)
// Routes: GET/POST /api/todos, PUT/DELETE /api/todos/:id

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
  if (!endpoint || !key) throw new Error('COSMOS_ENDPOINT and COSMOS_KEY must be set');
  const client = new CosmosClient({ endpoint, key });
  container = client.database('tododb').container('todos');
  return container;
}

function json(context, status, body) {
  context.res = {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

module.exports = async function (context, req) {
  // Azure SWA routes /api/* to this function.
  // req.params.route is the path AFTER /api/, e.g. "todos" or "todos/123"
  const route = (req.params.route || '').replace(/^\/+/, '');
  const method = req.method.toUpperCase();

  // Extract ID if present: "todos/abc-123" → id = "abc-123"
  const todosMatch = route.match(/^todos(?:\/([^/]+))?$/);
  if (!todosMatch) {
    return json(context, 404, { error: 'Not found' });
  }
  const id = todosMatch[1] || null;

  try {
    const c = getContainer();

    // GET /api/todos
    if (method === 'GET' && !id) {
      const { resources } = await c.items.query('SELECT * FROM c ORDER BY c._ts DESC').fetchAll();
      return json(context, 200, resources);
    }

    // POST /api/todos
    if (method === 'POST' && !id) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const todo = {
        id: Date.now().toString(),
        text: body.text,
        completed: body.completed || false,
        createdAt: new Date().toISOString(),
      };
      const { resource } = await c.items.create(todo);
      return json(context, 201, resource);
    }

    // PUT /api/todos/:id
    if (method === 'PUT' && id) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const todo = { id, text: body.text, completed: body.completed, createdAt: body.createdAt };
      const { resource } = await c.item(id, id).replace(todo);
      return json(context, 200, resource);
    }

    // DELETE /api/todos/:id
    if (method === 'DELETE' && id) {
      await c.item(id, id).delete();
      return json(context, 200, { success: true });
    }

    return json(context, 405, { error: 'Method not allowed' });

  } catch (error) {
    context.log.error('API error:', error.message);
    return json(context, 500, { error: error.message });
  }
};
