// Load .env only in development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (err) {
    // dotenv not available or .env file missing in production - that's OK
  }
}

const express = require('express');
const cors = require('cors');
const { CosmosClient } = require("@azure/cosmos");

const app = express();
app.use(cors());
app.use(express.json());

// Cosmos DB credentials - load from environment
const endpoint = process.env.COSMOS_ENDPOINT || '';
const key = process.env.COSMOS_KEY || '';

// Lazy-load Cosmos DB client - don't initialize on startup
let client = null;
let container = null;

function getContainer() {
  if (!client) {
    if (!endpoint || !key) {
      throw new Error('COSMOS_ENDPOINT and COSMOS_KEY not configured');
    }
    client = new CosmosClient({ endpoint, key });
    const database = client.database("tododb");
    container = database.container("todos");
  }
  return container;
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Todo API', version: '1.0.0' });
});

// Health endpoint - doesn't require Cosmos DB
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', message: 'API is running' });
});

// GET all todos
app.get('/api/todos', async (req, res) => {
  try {
    const container = getContainer();
    const { resources } = await container.items.query("SELECT * FROM c").fetchAll();
    res.json(resources);
  } catch (error) {
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
    res.status(500).json({ error: error.message });
  }
});

// DELETE todo
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const container = getContainer();
    await container.item(req.params.id, req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server only in development mode (when run directly)
if (require.main === module && process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 7071;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
