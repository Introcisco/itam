import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { initDb } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Assets Endpoints
app.get('/api/assets', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM assets ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/assets/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM assets WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'Asset not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/assets', async (req, res) => {
  try {
    if (Array.isArray(req.body)) {
      // Bulk Insert
      const values = req.body.map(item => [
        item.assetCode, item.name, item.category, item.brand, item.model,
        item.serialNumber, item.status, item.location, item.assignee,
        item.purchaseDate, item.purchasePrice || 0, item.warrantyExpiry,
        item.supplier, item.company, item.specs, item.notes,
        item.createdAt || new Date().toISOString().slice(0, 19).replace('T', ' ')
      ]);
      const query = `
        INSERT INTO assets (
          assetCode, name, category, brand, model, serialNumber, status,
          location, assignee, purchaseDate, purchasePrice, warrantyExpiry,
          supplier, company, specs, notes, createdAt
        ) VALUES ?
      `;
      const [result] = await pool.query(query, [values]);
      res.status(201).json({ message: 'Assets added', affectedRows: result.affectedRows });
    } else {
      // Single Insert
      const item = req.body;
      const query = `
        INSERT INTO assets SET ?
      `;
      // ensure formatting of dates / fallback
      if(item.createdAt === undefined) {
          item.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      } else {
          item.createdAt = new Date(item.createdAt).toISOString().slice(0, 19).replace('T', ' ');
      }
      if(item.purchaseDate === '') item.purchaseDate = null;
      if(item.warrantyExpiry === '') item.warrantyExpiry = null;

      const [result] = await pool.query(query, item);
      res.status(201).json({ id: result.insertId, ...item });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/assets/:id', async (req, res) => {
  try {
    const item = req.body;
    // ensure formatting of dates / fallback
    if(item.createdAt !== undefined) {
        item.createdAt = new Date(item.createdAt).toISOString().slice(0, 19).replace('T', ' ');
    }
    if(item.purchaseDate === '') item.purchaseDate = null;
    if(item.warrantyExpiry === '') item.warrantyExpiry = null;

    const [result] = await pool.query('UPDATE assets SET ? WHERE id = ?', [item, req.params.id]);
    res.json({ message: 'Asset updated', affectedRows: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/assets/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM assets WHERE id = ?', [req.params.id]);
    res.json({ message: 'Asset deleted', affectedRows: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/assets', async (req, res) => {
  try {
    // Bulk delete expects an array of ids in req.body
    if (Array.isArray(req.body) && req.body.length > 0) {
      const [result] = await pool.query('DELETE FROM assets WHERE id IN (?)', [req.body]);
      res.json({ message: 'Assets deleted', affectedRows: result.affectedRows });
    } else {
      res.status(400).json({ error: 'Array of ids required' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Audit Logs Endpoints
app.get('/api/auditLogs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM auditLogs ORDER BY timestamp DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auditLogs/asset/:assetId', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM auditLogs WHERE assetId = ? ORDER BY timestamp DESC', [req.params.assetId]);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});

app.post('/api/auditLogs', async (req, res) => {
  try {
    if (Array.isArray(req.body)) {
      const values = req.body.map(item => [
          item.assetId, item.action, item.details, item.operator, 
          item.timestamp || new Date().toISOString().slice(0, 19).replace('T', ' ')
      ]);
      const [result] = await pool.query('INSERT INTO auditLogs (assetId, action, details, operator, timestamp) VALUES ?', [values]);
      res.status(201).json({ message: 'Logs added', affectedRows: result.affectedRows });
    } else {
      const item = req.body;
      if(!item.timestamp) item.timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      else item.timestamp = new Date(item.timestamp).toISOString().slice(0, 19).replace('T', ' ');

      const [result] = await pool.query('INSERT INTO auditLogs SET ?', item);
      res.status(201).json({ id: result.insertId, ...item });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Maintenance Endpoints
app.get('/api/maintenance', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM maintenance ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/maintenance', async (req, res) => {
  try {
    const item = req.body;
    if(item.startDate === '') item.startDate = null;

    const [result] = await pool.query('INSERT INTO maintenance SET ?', item);
    res.status(201).json({ id: result.insertId, ...item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/maintenance/:id', async (req, res) => {
  try {
    const item = req.body;
    if(item.startDate === '') item.startDate = null;
    if(item.endDate === '') item.endDate = null;

    const [result] = await pool.query('UPDATE maintenance SET ? WHERE id = ?', [item, req.params.id]);
    res.json({ message: 'Maintenance updated', affectedRows: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transfers Endpoints
app.get('/api/transfers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM transfers ORDER BY date DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transfers', async (req, res) => {
  try {
    const item = req.body;
    if(!item.date) item.date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    else item.date = new Date(item.date).toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await pool.query('INSERT INTO transfers SET ?', item);
    res.status(201).json({ id: result.insertId, ...item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Initialization and Server Start
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
