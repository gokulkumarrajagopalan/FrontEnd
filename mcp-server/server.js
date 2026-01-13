const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mock data for testing
const mockData = {
  companies: [
    { id: 1, name: 'Test Company A', code: 'TCA' },
    { id: 2, name: 'Test Company B', code: 'TCB' }
  ],
  groups: [
    { id: 1, name: 'Assets', parent: null, companyId: 1 },
    { id: 2, name: 'Liabilities', parent: null, companyId: 1 },
    { id: 3, name: 'Current Assets', parent: 1, companyId: 1 }
  ],
  ledgers: [
    { id: 1, name: 'Cash', group: 'Current Assets', balance: 50000, companyId: 1 },
    { id: 2, name: 'Bank Account', group: 'Current Assets', balance: 125000, companyId: 1 },
    { id: 3, name: 'Accounts Payable', group: 'Liabilities', balance: -25000, companyId: 1 }
  ],
  items: [
    { id: 1, name: 'Product A', category: 'Electronics', stock: 100, price: 299.99, companyId: 1 },
    { id: 2, name: 'Product B', category: 'Accessories', stock: 50, price: 49.99, companyId: 1 },
    { id: 3, name: 'Product C', category: 'Electronics', stock: 25, price: 599.99, companyId: 1 }
  ]
};

// API Routes
app.get('/api/companies', (req, res) => {
  res.json({ success: true, data: mockData.companies });
});

app.get('/api/groups', (req, res) => {
  const companyId = req.query.companyId;
  const data = companyId ? mockData.groups.filter(g => g.companyId == companyId) : mockData.groups;
  res.json({ success: true, data });
});

app.get('/api/ledgers', (req, res) => {
  const companyId = req.query.companyId;
  const data = companyId ? mockData.ledgers.filter(l => l.companyId == companyId) : mockData.ledgers;
  res.json({ success: true, data });
});

app.get('/api/items', (req, res) => {
  const companyId = req.query.companyId;
  const data = companyId ? mockData.items.filter(i => i.companyId == companyId) : mockData.items;
  res.json({ success: true, data });
});

// Sync endpoints
app.post('/api/sync/:entity', (req, res) => {
  const { entity } = req.params;
  setTimeout(() => {
    res.json({ success: true, message: `${entity} synced successfully`, count: mockData[entity]?.length || 0 });
  }, 1000);
});

// CRUD operations
app.post('/api/:entity', (req, res) => {
  const { entity } = req.params;
  const newItem = { id: Date.now(), ...req.body };
  if (mockData[entity]) {
    mockData[entity].push(newItem);
  }
  res.json({ success: true, data: newItem });
});

app.put('/api/:entity/:id', (req, res) => {
  const { entity, id } = req.params;
  if (mockData[entity]) {
    const index = mockData[entity].findIndex(item => item.id == id);
    if (index !== -1) {
      mockData[entity][index] = { ...mockData[entity][index], ...req.body };
      res.json({ success: true, data: mockData[entity][index] });
    } else {
      res.status(404).json({ success: false, message: 'Item not found' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Entity not found' });
  }
});

app.delete('/api/:entity/:id', (req, res) => {
  const { entity, id } = req.params;
  if (mockData[entity]) {
    const index = mockData[entity].findIndex(item => item.id == id);
    if (index !== -1) {
      mockData[entity].splice(index, 1);
      res.json({ success: true, message: 'Item deleted' });
    } else {
      res.status(404).json({ success: false, message: 'Item not found' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Entity not found' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MCP Test Server running on http://localhost:${PORT}`);
});