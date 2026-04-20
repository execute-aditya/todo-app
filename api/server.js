const express = require('express');
const cors = require('cors');
const { CosmosClient } = require("@azure/cosmos");

const app = express();
app.use(cors());
app.use(express.json());

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });
const database = client.database("tododb");
const container = database.container("todos");

// GET all todos
app.get('/api/todos', async (req, res) => {
  try {
    const { resources } = await container.items.query("SELECT * FROM c").fetchAll();
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new todo
app.post('/api/todos', async (req, res) => {
  try {
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
