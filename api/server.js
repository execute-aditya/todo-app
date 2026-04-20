require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { CosmosClient } = require("@azure/cosmos");

const app = express();
app.use(cors());
app.use(express.json());

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

// Lazy-load Cosmos DB client to avoid blocking startup
let client = null;
let container = null;

function getContainer() {
  if (!client) {
    if (!endpoint || !key) {
      throw new Error('COSMOS_ENDPOINT and COSMOS_KEY environment variables are required');
    }
    client = new CosmosClient({ endpoint, key });
    const database = client.database("tododb");
    container = database.container("todos");
  }
  return container;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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

// DELETE todo
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const container = getContainer();
    await container.item(req.params.id, req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 7071;
app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
