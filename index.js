const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const filePath = path.join(__dirname, 'products.json');

app.use(express.json());

async function loadProducts() {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function saveProducts(products) {
  await fs.writeFile(filePath, JSON.stringify(products, null, 2));
}

app.get('/products', async (req, res) => {
  try {
    const products = await loadProducts();
    res.json(products);
  } catch {
    res.status(500).json({ error: 'Unable to load products' });
  }
});

app.get('/products/instock', async (req, res) => {
  try {
    const products = await loadProducts();
    res.json(products.filter(p => p.inStock));
  } catch {
    res.status(500).json({ error: 'Unable to load products' });
  }
});

app.post('/products', async (req, res) => {
  try {
    const { name, price, inStock } = req.body;
    if (typeof name !== 'string' || !name.trim() || typeof price !== 'number' || typeof inStock !== 'boolean') {
      return res.status(400).json({ error: 'Invalid product data' });
    }
    const products = await loadProducts();
    const newId = products.reduce((max, p) => (p.id > max ? p.id : max), 0) + 1;
    const newProduct = { id: newId, name, price, inStock };
    products.push(newProduct);
    await saveProducts(products);
    res.status(201).json(newProduct);
  } catch {
    res.status(500).json({ error: 'Unable to save product' });
  }
});

app.put('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const updates = req.body;
    if (!updates.name && updates.price === undefined && updates.inStock === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const products = await loadProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });
    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || !updates.name.trim()) return res.status(400).json({ error: 'Invalid name' });
      products[idx].name = updates.name;
    }
    if (updates.price !== undefined) {
      if (typeof updates.price !== 'number') return res.status(400).json({ error: 'Invalid price' });
      products[idx].price = updates.price;
    }
    if (updates.inStock !== undefined) {
      if (typeof updates.inStock !== 'boolean') return res.status(400).json({ error: 'Invalid inStock value' });
      products[idx].inStock = updates.inStock;
    }
    await saveProducts(products);
    res.json(products[idx]);
  } catch {
    res.status(500).json({ error: 'Unable to update product' });
  }
});

app.delete('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const products = await loadProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });
    products.splice(idx, 1);
    await saveProducts(products);
    res.json({ message: 'Product deleted' });
  } catch {
    res.status(500).json({ error: 'Unable to delete product' });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
