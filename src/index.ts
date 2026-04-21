import express from 'express';
import cors from 'cors';
import { createFinancialTransaction } from './services/ledger.js';
import pool from './db.js';
import { startHardwareDaemon } from './hardware-daemon.js';

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3030;

startHardwareDaemon(8080);

// USERS
app.get('/users', async (req, res) => {
  const result = await pool.query('SELECT id, full_name, username, role, nfc_card_id, is_active, nfc_enabled FROM users ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/users', async (req, res) => {
  const { full_name, username, role, nfc_card_id, password, nfc_enabled } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (full_name, username, role, nfc_card_id, password, nfc_enabled) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [full_name, username, role, nfc_card_id, password, nfc_enabled || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/users/:id/nfc', async (req, res) => {
  const { id } = req.params;
  const { nfc_enabled } = req.body;
  try {
    await pool.query('UPDATE users SET nfc_enabled = $1 WHERE id = $2', [nfc_enabled, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// LOGIN
app.post('/login', async (req, res) => {
  const { username, password, nfc_scanned } = req.body;
  try {
    const result = await pool.query('SELECT id, full_name, username, role, nfc_enabled, nfc_card_id FROM users WHERE username = $1 AND password = $2 AND is_active = TRUE', [username, password]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }

    const user = result.rows[0];

    if (user.nfc_enabled && !nfc_scanned) {
      return res.status(403).json({ error: 'NFC_REQUIRED', message: 'Bu hesap için NFC kart zorunludur. Lütfen kartınızı okutunuz.' });
    }
    // Simple mock check for NFC ID match (in reality, hardware daemon handles this)
    if (user.nfc_enabled && nfc_scanned && nfc_scanned !== user.nfc_card_id) {
       return res.status(403).json({ error: 'NFC_INVALID', message: 'Okutulan kart bu kullanıcıya ait değil.' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// CUSTOMERS
app.get('/customers', async (req, res) => {
  const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/customers', async (req, res) => {
  const { full_name, identity_number, phone, company_name, country, address, email } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO customers (full_name, identity_number, phone, company_name, country, address, email) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [full_name, identity_number, phone, company_name, country, address, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ALERTS
app.get('/alerts/rules', async (req, res) => {
  const result = await pool.query('SELECT * FROM alert_rules');
  res.json(result.rows);
});

app.post('/alerts/rules', async (req, res) => {
  const { pair, condition_type, threshold_val } = req.body;
  const result = await pool.query(
    'INSERT INTO alert_rules (pair, condition_type, threshold_val) VALUES ($1, $2, $3) RETURNING id',
    [pair, condition_type, threshold_val]
  );
  res.status(201).json(result.rows[0]);
});

// TRANSACTIONS & ACCOUNTS (Existing)
app.get('/accounts', async (req, res) => {
  const result = await pool.query('SELECT * FROM accounts');
  res.json(result.rows);
});

app.post('/transactions', async (req, res) => {
  try {
    const result = await createFinancialTransaction(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`VALO Core API listening at http://localhost:${port}`);
});
