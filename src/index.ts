import express from 'express';
import cors from 'cors';
import { createFinancialTransaction } from './services/ledger.js';
import pool from './db.js';
import { startHardwareDaemon } from './hardware-daemon.js';

const app = express();
app.use(cors());
app.use(express.json());

const port = 3030;
startHardwareDaemon(8080);

// --- HELPER: GET SETTINGS ---
const getSetting = async (key: string) => {
  const r = await pool.query('SELECT value FROM system_settings WHERE key = $1', [key]);
  return r.rows[0]?.value;
};

// --- SETTINGS ---
app.get('/settings', async (req, res) => {
  const result = await pool.query('SELECT * FROM system_settings');
  const settings: any = {};
  result.rows.forEach(r => settings[r.key] = r.value);
  res.json(settings);
});

app.post('/settings', async (req, res) => {
  const { key, value } = req.body;
  await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, value]);
  res.json({ success: true });
});

// --- WEATHER (Real 3-Day Data) ---
app.get('/system/weather', async (req, res) => {
  const locCfg = await getSetting('weather_config');
  const loc = locCfg?.location || 'Fatih';
  try {
    const response = await fetch(`https://wttr.in/${loc}?format=j1`);
    const data: any = await response.json();
    res.json({
      location: loc.toUpperCase(),
      current: `${data.current_condition[0].temp_C}°C ${data.current_condition[0].lang_tr?.[0]?.value || data.current_condition[0].weatherDesc[0].value}`,
      today: `${data.weather[0].mintempC}/${data.weather[0].maxtempC}°C`,
      tomorrow: `${data.weather[1].mintempC}/${data.weather[1].maxtempC}°C`
    });
  } catch { res.status(500).json({ error: 'Weather error' }); }
});

// --- USERS CRUD ---
app.get('/users', async (req, res) => {
  const r = await pool.query('SELECT id, full_name, username, role, nfc_enabled, is_active FROM users WHERE is_active = TRUE ORDER BY full_name');
  res.json(r.rows);
});

app.post('/users', async (req, res) => {
  const { full_name, username, role, password } = req.body;
  const r = await pool.query('INSERT INTO users (full_name, username, role, password) VALUES ($1, $2, $3, $4) RETURNING id', [full_name, username, role, password]);
  res.json(r.rows[0]);
});

// --- CUSTOMERS CRUD ---
app.get('/customers', async (req, res) => {
  const r = await pool.query(`
    SELECT c.*, 
    (SELECT json_agg(ap) FROM authorized_persons ap WHERE ap.customer_id = c.id) as authorized_persons
    FROM customers c ORDER BY full_name ASC
  `);
  res.json(r.rows);
});

app.post('/customers', async (req, res) => {
  const { full_name, customer_type, identity_number, tax_id, tax_office, phone, address } = req.body;
  const r = await pool.query(
    'INSERT INTO customers (full_name, customer_type, identity_number, tax_id, tax_office, phone, address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
    [full_name, customer_type, identity_number, tax_id, tax_office, phone, address]
  );
  res.json(r.rows[0]);
});

// --- ALARMS CRUD ---
app.get('/alarms', async (req, res) => {
  const r = await pool.query('SELECT * FROM alert_rules ORDER BY created_at DESC');
  res.json(r.rows);
});

app.post('/alarms', async (req, res) => {
  const { pair, condition_type, threshold_val, telegram_enabled } = req.body;
  await pool.query('INSERT INTO alert_rules (pair, condition_type, threshold_val, telegram_enabled) VALUES ($1, $2, $3, $4)', [pair, condition_type, threshold_val, telegram_enabled]);
  res.json({ success: true });
});

// --- REPORTS SUMMARY ---
app.get('/reports/summary', async (req, res) => {
  const { start, end } = req.query;
  const summary = await pool.query(`
    SELECT COUNT(*) as total_tx, SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as total_volume
    FROM ledger_entries le JOIN transactions t ON le.transaction_id = t.id
    WHERE t.created_at BETWEEN $1 AND $2
  `, [start || '1970-01-01', end || '2100-01-01']);
  res.json({ overall: summary.rows[0] });
});

// --- TRANSACTIONS ---
app.get('/transactions', async (req, res) => {
  const { start, end } = req.query;
  const result = await pool.query(`
    SELECT t.id, t.created_at, t.type, t.status,
           u.full_name as user_name, c.full_name as customer_name,
           (SELECT amount FROM ledger_entries WHERE transaction_id = t.id AND entry_type = 'DEBIT' LIMIT 1) as debit_amount,
           (SELECT a.currency_code FROM accounts a JOIN ledger_entries le ON a.id = le.account_id WHERE le.transaction_id = t.id AND le.entry_type = 'DEBIT' LIMIT 1) as currency
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN customers c ON (t.banknote_serials->>'customer_id')::uuid = c.id
    WHERE t.created_at BETWEEN $1 AND $2
    ORDER BY t.created_at DESC
  `, [start || '1970-01-01', end || '2100-01-01']);
  res.json(result.rows);
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query('SELECT id, full_name, username, role, nfc_enabled FROM users WHERE username = $1 AND password = $2 AND is_active = TRUE', [username, password]);
  if (result.rows.length === 0) return res.status(401).json({ error: 'Hatalı Giriş' });
  res.json(result.rows[0]);
});

app.listen(port, () => console.log(`VALO API :${port}`));
