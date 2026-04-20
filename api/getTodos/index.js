const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });
const database = client.database("tododb");
const container = database.container("todos");

module.exports = async function (context, req) {
  try {
    const { resources } = await container.items.query("SELECT * FROM c").fetchAll();
    context.res = {
      status: 200,
      body: resources,
      headers: { "Content-Type": "application/json" }
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: { error: error.message }
    };
  }
};
