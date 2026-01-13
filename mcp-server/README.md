# Tallify MCP Test Server

Minimal MCP server for testing Tallify Desktop Application UI components.

## Setup

```bash
cd mcp-server
npm install
npm start
```

## Endpoints

- `GET /api/companies` - Get all companies
- `GET /api/groups?companyId=1` - Get groups for company
- `GET /api/ledgers?companyId=1` - Get ledgers for company  
- `GET /api/items?companyId=1` - Get items for company
- `POST /api/sync/:entity` - Sync entity from Tally
- `POST /api/:entity` - Create new entity
- `PUT /api/:entity/:id` - Update entity
- `DELETE /api/:entity/:id` - Delete entity

Server runs on http://localhost:3001