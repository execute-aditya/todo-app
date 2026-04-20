// Load .env only in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const { CosmosClient } = require("@azure/cosmos");

const app = express();
app.use(cors());
app.use(express.json());

// Get credentials from environment - in Azure, these come from deployment
const endpoint = process.env.COSMOS_ENDPOINT || '';
const key = process.env.COSMOS_KEY || '';

console.log('[DEBUG] Environment loaded - NODE_ENV:', process.env.NODE_ENV);
console.log('[DEBUG] COSMOS_ENDPOINT available:', !!endpoint);
console.log('[DEBUG] COSMOS_KEY available:', !!key);

// Lazy-load Cosmos DB client
let client = null;
let container = null;
let connectionError = null;

function getContainer() {
  if (!client) {
    if (!endpoint || !key) {
      const msg = 'COSMOS_ENDPOINT and COSMOS_KEY not configured';
      connectionError = msg;
      console.error('[ERROR]', msg);
      throw new Error(msg);
    }
    try {
      console.log('[INFO] Initializing Cosmos DB client...');
      client = new CosmosClient({ endpoint, key });
      const database = client.database("tododb");
      container = database.container("todos");
      connectionError = null;
      console.log('[INFO] Cosmos DB connection ready');
    } catch (error) {
      connectionError = error.message;
      console.error('[ERROR] Cosmos DB init failed:', error.message);
      throw error;
    }
  }
  return container;
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Todo API', version: '1.0.0' });
});

// Health check - always works
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    cosmosDbConfigured: !!endpoint && !!key,
    cosmosDbError: connectionError
  });
});

// GET all todos
app.get('/api/todos', async (req, res) => {
  try {
    const container = getContainer();
    const { resources } = await container.items.query("SELECT * FROM c").fetchAll();
    res.json(resources);
  } catch (error) {
    console.error('[ERROR] GET /api/todos:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST new todo
app.post('/api/todos', async (req, res) => {
  try {
    const container = getContainer();
    const todo = {
      id: Date.now().toString(),
      text: req.body.text,
      completed: req.body.completed || false,
      createdAt: new Date()
    };
    const { resource } = await container.items.create(todo);
    res.status(201).json(resource);
  } catch (error) {
    console.error('[ERROR] POST /api/todos:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE todo
app.put('/api/todos/:id', async (req, res) => {
  try {
    const container = getContainer();
    const todo = {
      id: req.params.id,
      text: req.body.text,
      completed: req.body.completed || false,
      createdAt: req.body.createdAt
    };
    const { resource } = await container.item(req.params.id, req.params.id).replace(todo);
    res.json(resource);
  } catch (error) {
    console.error('[ERROR] PUT /api/todos/:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE todo
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const container = getContainer();
    await container.item(req.params.id, req.params.id).delete();
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    console.error('[ERROR] DELETE /api/todos/:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 7071;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[START] Server listening on ${PORT}`);
  console.log(`[INFO] Health check: GET /health`);
  console.log(`[INFO] API ready to accept requests`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received');
  server.close(() => {
    console.log('[SHUTDOWN] Server closed');
    process.exit(0);
  });
});

module.exports = app;
