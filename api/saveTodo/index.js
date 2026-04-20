const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });
const database = client.database("tododb");
const container = database.container("todos");

module.exports = async function (context, req) {
  try {
    const todo = {
      id: Date.now().toString(),
      text: req.body.text,
      completed: req.body.completed || false,
      createdAt: new Date()
    };
    
    const { resource } = await container.items.create(todo);
    context.res = {
      status: 201,
      body: resource,
      headers: { "Content-Type": "application/json" }
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: { error: error.message }
    };
  }
};
