// server.js
import express from 'express';
import cors from 'cors';              
import { init, all, get, run } from './src/db.js';

const app = express();
app.use(cors());                      
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

// REST API
app.get('/entities', async (req, res) => {
  const rows = await all('SELECT * FROM products ORDER BY id DESC');
  res.json(rows);
});

app.get('/entities/:id', async (req, res) => {
  const row = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

app.post('/entities', async (req, res) => {
  const { name, sku, price, category = '', created_at } = req.body;
  if (!name || !sku || typeof price !== 'number' || !created_at) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const r = await run(
    'INSERT INTO products(name, sku, price, category, created_at) VALUES (?, ?, ?, ?, ?)',
    [name, sku, price, category, created_at]
  );
  const item = await get('SELECT * FROM products WHERE id = ?', [r.lastID]);
  res.status(201).json(item);
});

app.put('/entities/:id', async (req, res) => {
  const { name, sku, price, category = '', created_at } = req.body;
  const id = req.params.id;
  const exists = await get('SELECT id FROM products WHERE id = ?', [id]);
  if (!exists) return res.status(404).json({ error: 'Not found' });

  await run(
    'UPDATE products SET name=?, sku=?, price=?, category=?, created_at=? WHERE id=?',
    [name, sku, price, category, created_at, id]
  );
  const item = await get('SELECT * FROM products WHERE id = ?', [id]);
  res.json(item);
});

app.delete('/entities/:id', async (req, res) => {
  await run('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

const PORT = 3000;

init().then(() => {
  app.listen(PORT, () => console.log(`http://localhost:${PORT}/health`));
});
