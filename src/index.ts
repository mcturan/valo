import express from 'express';
import cors from 'cors';
import { createFinancialTransaction } from './services/ledger.js';
import pool from './db.js';
import { startHardwareDaemon } from './hardware-daemon.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const port = 3030;
app.listen(port, () => {
  console.log(`Backend VALO Core API running on http://localhost:${port}`);
});
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

// --- RATES ---
app.get('/rates', async (req, res) => {
  const result = await pool.query(`
    SELECT DISTINCT ON (base_currency, target_currency) 
           base_currency, target_currency, rate_multiplier, created_at
    FROM exchange_rates
    ORDER BY base_currency, target_currency, created_at DESC
  `);
  res.json(result.rows);
});

// --- SYSTEM BALANCES ---
app.get('/system/balances', async (req, res) => {
  const result = await pool.query(`
    SELECT a.currency_code, 
           SUM(CASE WHEN le.entry_type = 'DEBIT' THEN le.amount ELSE -le.amount END) as balance
    FROM accounts a
    JOIN ledger_entries le ON a.id = le.account_id
    GROUP BY a.currency_code
  `);
  res.json(result.rows);
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
           (SELECT a.currency_code FROM accounts a JOIN ledger_entries le ON a.id = le.account_id WHERE le.transaction_id = t.id AND le.entry_type = 'DEBIT' LIMIT 1) as currency,
           (SELECT amount FROM ledger_entries WHERE transaction_id = t.id AND entry_type = 'CREDIT' LIMIT 1) as credit_amount,
           (SELECT a.currency_code FROM accounts a JOIN ledger_entries le ON a.id = le.account_id WHERE le.transaction_id = t.id AND le.entry_type = 'CREDIT' LIMIT 1) as credit_currency
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN customers c ON (
      CASE 
        WHEN (t.banknote_serials->>'customer_id') IS NOT NULL THEN (t.banknote_serials->>'customer_id')::uuid
        WHEN t.customer_identity_hash ~ '^[0-9a-fA-F-]{36}$' THEN t.customer_identity_hash::uuid
        ELSE NULL
      END = c.id
    )
    WHERE t.created_at BETWEEN $1 AND $2
    ORDER BY t.created_at DESC
  `, [start || '1970-01-01', end || '2100-01-01']);
  res.json(result.rows);
});

app.post('/transactions', async (req, res) => {
  const { customer_id, type, debit_amount, currency, credit_amount, credit_currency, user_id } = req.body;
  
  try {
    // 1. Get Account IDs
    const getAcc = async (cur: string) => {
      const r = await pool.query('SELECT id FROM accounts WHERE currency_code = $1 LIMIT 1', [cur]);
      if (r.rows.length === 0) throw new Error(`Account for ${cur} not found`);
      return r.rows[0].id;
    };

    const debitAccId = await getAcc(currency);
    const creditAccId = await getAcc(credit_currency);

    // 2. Prepare Ledger Entries
    const entries = [
      { account_id: debitAccId, entry_type: 'DEBIT' as const, amount: debit_amount },
      { account_id: creditAccId, entry_type: 'CREDIT' as const, amount: credit_amount }
    ];

    // 3. Create Transaction using Service
    const result = await createFinancialTransaction({
      user_id: user_id || '69080bb6-39e5-4f7a-a5fc-ada61ae00351', // Default to godmin if not provided for now
      type: 'EXCHANGE',
      auth_used: 'PASSWORD_OVERRIDE',
      customer_identity_hash: customer_id, // We'll use ID as hash for now or real hash later
      entries
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Transaction Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query('SELECT id, full_name, username, role, nfc_enabled FROM users WHERE username = $1 AND password = $2 AND is_active = TRUE', [username, password]);
  if (result.rows.length === 0) return res.status(401).json({ error: 'Hatalı Giriş' });
  res.json(result.rows[0]);
});

// Telegram Notification Helper
async function sendTelegram(msg: string) {
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: `🛡️ VALO ALERT:\n${msg}`, parse_mode: 'HTML' })
    });
  } catch (e) { console.error("Telegram fail", e); }
}

app.post('/system/ocr', async (req, res) => {
  // Simulate heavy processing
  setTimeout(() => {
    res.json({
      full_name: "HÜSEYİN AL-FAYED",
      id_no: "99" + Math.floor(Math.random() * 1000000000),
      country: "SAUDI ARABIA",
      birth_date: "12.05.1985"
    });
  }, 1500);
});

app.post('/notifications/alert', async (req, res) => {
  const { message } = req.body;
  await sendTelegram(message);
  res.sendStatus(200);
});
