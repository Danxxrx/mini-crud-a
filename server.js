import express from 'express';
import cors from 'cors';
import { run, all, one } from './src/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      price REAL NOT NULL CHECK(price >= 0),
      category TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const rows = await all(`SELECT COUNT(*) AS cnt FROM products;`);
  if ((rows?.[0]?.cnt ?? 0) === 0) {
    await run(
      `INSERT INTO products (name, sku, price, category) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?);`,
      [
        'Sample T-Shirt', 'TSHIRT-001', 19.99, 'apparel',
        'Fancy Mug',     'MUG-001',    9.49,  'kitchen',
        'Sticker Pack',  'STICK-001',  4.99,  'accessories',
      ]
    );
  }
}

app.get('/products', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM products ORDER BY id DESC;');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const row = await one('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/products', async (req, res) => {
  try {
    const { name, sku, price, category, created_at } = req.body;
    if (!name || !sku || price == null) {
      return res.status(400).json({ error: 'name, sku, price are required' });
    }

    await run(
      `INSERT INTO products(name, sku, price, category, created_at)
       VALUES (?, ?, ?, COALESCE(?, ''), COALESCE(?, date('now')));`,
      [name, sku, price, category, created_at]
    );

    const created = await one(
      `SELECT * FROM products WHERE id = last_insert_rowid();`
    );
    res.status(201).json(created);
  } catch (e) {
    if (String(e).includes('UNIQUE constraint failed: products.sku')) {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: e.message });
  }
});

app.put('/products/:id', async (req, res) => {
  try {
    const { name, sku, price, category, created_at } = req.body;
    const existing = await one('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    await run(
      `UPDATE products
         SET name = COALESCE(?, name),
             sku = COALESCE(?, sku),
             price = COALESCE(?, price),
             category = COALESCE(?, category),
             created_at = COALESCE(?, created_at)
       WHERE id = ?`,
      [name, sku, price, category, created_at, req.params.id]
    );

    const updated = await one('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (e) {
    if (String(e).includes('UNIQUE constraint failed: products.sku')) {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: e.message });
  }
});

app.delete('/products/:id', async (req, res) => {
  try {
    const existing = await one('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

await initDb();

app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
