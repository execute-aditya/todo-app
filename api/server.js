require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { CosmosClient } = require("@azure/cosmos");

const app = express();
app.use(cors());
app.use(express.json());

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

console.log('[API] Starting server...');
console.log('[API] COSMOS_ENDPOINT:', endpoint ? 'configured' : 'NOT SET');
console.log('[API] COSMOS_KEY:', key ? 'configured' : 'NOT SET');

// Lazy-load Cosmos DB client to avoid blocking startup
let client = null;
let container = null;
let connectionError = null;

function getContainer() {
  if (!client) {
    if (!endpoint || !key) {
      const msg = 'COSMOS_ENDPOINT and COSMOS_KEY environment variables are required';
      connectionError = msg;
      throw new Error(msg);
    }
    try {
      client = new CosmosClient({ endpoint, key });
      const database = client.database("tododb");
      container = database.container("todos");
      connectionError = null;
      console.log('[API] Cosmos DB connection initialized');
    } catch (error) {
      connectionError = error.message;
      console.error('[API] Failed to initialize Cosmos DB:', error.message);
      throw error;
    }
  }
  return container;
}

// Health check endpoint - always works
app.get('/health', (req, res) => {
  console.log('[API] Health check requested');
  res.status(200).json({ 
    status: 'ok',
    cosmosDbConnected: connectionError === null,
    cosmosDbError: connectionError
  });
});

// GET all todos
app.get('/api/todos', async (req, res) => {
  try {
    console.log('[API] GET /api/todos');
    const container = getContainer();
    const { resources } = await container.items.query("SELECT * FROM c").fetchAll();
    res.json(resources);
  } catch (error) {
    console.error('[API] Error fetching todos:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST new todo
app.post('/api/todos', async (req, res) => {
  try {
    console.log('[API] POST /api/todos');
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
    console.error('[API] Error creating todo:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE todo
app.delete('/api/todos/:id', async (req, res) => {
  try {
    console.log('[API] DELETE /api/todos/:id');
    const container = getContainer();
    await container.item(req.params.id, req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Delete error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 7071;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[API] Server listening on port ${PORT}`);
  console.log(`[API] Health check available at http://localhost:${PORT}/health`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('[API] SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('[API] Server closed');
    process.exit(0);
  });
});
