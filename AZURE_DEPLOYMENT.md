# Azure Deployment Guide

## Quick Setup (15 minutes)

### 1. Create Azure Resources

```bash
# Login
az login

# Create resource group
az group create --name todo-app-rg --location eastus

# Create Cosmos DB (free tier, 5GB)
az cosmosdb create \
  --resource-group todo-app-rg \
  --name todo-cosmos-UNIQUE-NAME \
  --kind GlobalDocumentDB \
  --default-consistency-level Session \
  --free-tier

# Get connection string
az cosmosdb keys list \
  --resource-group todo-app-rg \
  --name todo-cosmos-UNIQUE-NAME \
  --type connection-strings
```

### 2. Create Cosmos DB Database & Container

In Azure Portal:
1. Go to your Cosmos DB account
2. Open **Data Explorer**
3. Create database: `tododb`
4. Create container: `todos` with partition key: `/id`

### 3. Update local.settings.json

Replace in `api/local.settings.json`:
```json
"COSMOS_ENDPOINT": "https://your-cosmos-UNIQUE.documents.azure.com:443/",
"COSMOS_KEY": "your-key-from-above"
```

### 4. Test Locally

```bash
cd todo-list
npm install
npm start
```

Open http://localhost:7071

### 5. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/todo-app.git
git push -u origin main
```

### 6. Deploy to Azure Static Web Apps

```bash
# Create Static Web App (linked to your GitHub repo)
az staticwebapp create \
  --name todo-app \
  --resource-group todo-app-rg \
  --source https://github.com/YOUR-USERNAME/todo-app \
  --location eastus \
  --branch main \
  --login-with-github
```

### 7. Add Cosmos DB Secrets to GitHub

1. Go to your GitHub repo **Settings > Secrets and variables > Actions**
2. Add these secrets:
   - `COSMOS_ENDPOINT`: Your Cosmos DB endpoint
   - `COSMOS_KEY`: Your Cosmos DB key

### 8. Update Function App Settings

In Azure Portal:
1. Go to Static Web App > Configuration
2. Add application settings:
   - `COSMOS_ENDPOINT`
   - `COSMOS_KEY`

Done! Your app will auto-deploy on `git push` ✅

## Costs
- **Cosmos DB**: Free tier (5GB, 400 RU/s)
- **Static Web Apps**: Free tier
- **Azure Functions**: ~$0.17/million requests

Total: Usually **$0-2/month** for small projects
