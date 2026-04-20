const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });
const database = client.database("tododb");
const container = database.container("todos");

module.exports = async function (context, req) {
  try {
    await container.item(req.params.id).delete();
    context.res = {
      status: 200,
      body: { success: true },
      headers: { "Content-Type": "application/json" }
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: { error: error.message }
    };
  }
};
