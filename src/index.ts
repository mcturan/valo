import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createFinancialTransaction } from './services/ledger.js';
import pool from './db.js';
import { startHardwareDaemon } from './hardware-daemon.js';
import { authenticateToken, authorizeRole, AuthRequest } from './middleware/auth.js';

const app = express();

// --- CORS CONFIG ---
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const port = process.env.PORT || 3030;
app.listen(port, () => {
  console.log(`Backend VALO Core API running on http://localhost:${port}`);
});
startHardwareDaemon(8080);

// --- AUTH ---
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND is_active = TRUE', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Hatalı Kullanıcı veya Şifre' });
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Hatalı Kullanıcı veya Şifre' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '8h' }
    );

    res.json({ 
      token,
      user: { id: user.id, full_name: user.full_name, username: user.username, role: user.role }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- SETTINGS (Protected) ---
app.get('/settings', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT * FROM system_settings');
  const settings: any = {};
  result.rows.forEach(r => settings[r.key] = r.value);
  res.json(settings);
});

app.post('/settings', authenticateToken, authorizeRole(['MASTER_ADMIN']), async (req, res) => {
  const { key, value } = req.body;
  const allowedKeys = ['weather_config', 'printer_config', 'global_spread'];
  if (!allowedKeys.includes(key)) return res.status(400).json({ error: 'Invalid setting key' });
  
  await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, JSON.stringify(value)]);
  res.json({ success: true });
});

// --- RATES ---
app.get('/rates', authenticateToken, async (req, res) => {
  const result = await pool.query(`
    SELECT DISTINCT ON (base_currency, target_currency) 
           base_currency, target_currency, rate_multiplier, created_at
    FROM exchange_rates
    ORDER BY base_currency, target_currency, created_at DESC
  `);
  res.json(result.rows);
});

// --- SYSTEM BALANCES ---
app.get('/system/balances', authenticateToken, async (req, res) => {
  const result = await pool.query(`
    SELECT a.currency_code, 
           SUM(CASE WHEN le.entry_type = 'DEBIT' THEN le.amount ELSE -le.amount END) as balance
    FROM accounts a
    LEFT JOIN ledger_entries le ON a.id = le.account_id
    GROUP BY a.currency_code
  `);
  res.json(result.rows);
});

// --- USERS CRUD ---
app.get('/users', authenticateToken, authorizeRole(['MASTER_ADMIN', 'ADMIN']), async (req, res) => {
  const r = await pool.query('SELECT id, full_name, username, role, nfc_enabled, is_active FROM users WHERE is_active = TRUE ORDER BY full_name');
  res.json(r.rows);
});

// --- CUSTOMERS CRUD ---
app.get('/customers', authenticateToken, async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const r = await pool.query(`
    SELECT id, full_name, customer_type, identity_number, phone, country, risk_level 
    FROM customers 
    WHERE is_active = TRUE 
    ORDER BY full_name ASC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
  res.json(r.rows);
});

app.post('/customers', authenticateToken, async (req, res) => {
  const { full_name, identity_number, phone, country = 'Türkiye' } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO customers (full_name, identity_number, phone, country) VALUES ($1, $2, $3, $4) RETURNING id',
      [full_name, identity_number, phone, country]
    );
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// --- TRANSACTIONS ---
app.get('/transactions', authenticateToken, async (req, res) => {
  const { start = '1970-01-01', end = '2100-01-01', limit = 50, offset = 0 } = req.query;
  const result = await pool.query(`
    SELECT t.id, t.created_at, t.type, t.status,
           u.full_name as user_name, c.full_name as customer_name,
           (SELECT amount FROM ledger_entries WHERE transaction_id = t.id AND entry_type = 'DEBIT' AND currency_code != 'TRY' LIMIT 1) as debit_amount,
           (SELECT currency_code FROM ledger_entries WHERE transaction_id = t.id AND entry_type = 'DEBIT' AND currency_code != 'TRY' LIMIT 1) as currency,
           (SELECT amount FROM ledger_entries WHERE transaction_id = t.id AND entry_type = 'CREDIT' AND currency_code = 'TRY' LIMIT 1) as credit_amount,
           'TRY' as credit_currency
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN customers c ON t.customer_id = c.id
    WHERE t.created_at BETWEEN $1 AND $2
    ORDER BY t.created_at DESC
    LIMIT $3 OFFSET $4
  `, [start, end, limit, offset]);
  res.json(result.rows);
});

app.post('/transactions', authenticateToken, async (req: AuthRequest, res) => {
  const { customer_id, debit_amount, currency, credit_amount, credit_currency } = req.body;
  
  if (!req.user) return res.status(401).json({ error: 'Auth error' });

  try {
    const getAcc = async (cur: string) => {
      const r = await pool.query('SELECT id FROM accounts WHERE currency_code = $1 LIMIT 1', [cur]);
      if (r.rows.length === 0) throw new Error(`Account for ${cur} not found`);
      return r.rows[0].id;
    };

    const debitAccId = await getAcc(currency);
    const creditAccId = await getAcc(credit_currency);

    // To comply with multi-currency double entry, we simulate the "Customer" side of the transaction.
    // In a real system, you'd have a 'Customer Liability' or 'Exchange Clearing' account.
    // Here we use a virtual 'CLEARING' account or just ensure both sides are recorded.
    // We'll use a hidden clearing account to balance each currency.
    const clearingAccResult = await pool.query("SELECT id FROM accounts WHERE account_name = 'EXCHANGE_CLEARING'");
    let clearingAccId;
    if (clearingAccResult.rows.length === 0) {
       const createClearing = await pool.query("INSERT INTO accounts (account_name, currency_code) VALUES ('EXCHANGE_CLEARING', 'VIRTUAL') RETURNING id");
       clearingAccId = createClearing.rows[0].id;
    } else {
       clearingAccId = clearingAccResult.rows[0].id;
    }

    const entries = [
      // Currency 1 side
      { account_id: debitAccId, entry_type: 'DEBIT' as const, amount: debit_amount, currency_code: currency },
      { account_id: clearingAccId, entry_type: 'CREDIT' as const, amount: debit_amount, currency_code: currency },
      // Currency 2 side
      { account_id: creditAccId, entry_type: 'CREDIT' as const, amount: credit_amount, currency_code: credit_currency },
      { account_id: clearingAccId, entry_type: 'DEBIT' as const, amount: credit_amount, currency_code: credit_currency }
    ];

    const result = await createFinancialTransaction({
      user_id: req.user.id,
      customer_id,
      type: 'EXCHANGE',
      auth_used: 'PASSWORD_OVERRIDE',
      entries
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Transaction Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- WEATHER (Real 3-Day Data) ---
app.get('/system/weather', async (req, res) => {
  try {
    const response = await fetch(`https://wttr.in/Fatih?format=j1`);
    const data: any = await response.json();
    res.json({
      location: 'FATIH',
      current: `${data.current_condition[0].temp_C}°C ${data.current_condition[0].lang_tr?.[0]?.value || data.current_condition[0].weatherDesc[0].value}`,
      today: `${data.weather[0].mintempC}/${data.weather[0].maxtempC}°C`,
      tomorrow: `${data.weather[1].mintempC}/${data.weather[1].maxtempC}°C`
    });
  } catch { res.status(500).json({ error: 'Weather error' }); }
});

app.post('/notifications/alert', authenticateToken, async (req, res) => {
  const { message } = req.body;
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return res.sendStatus(200);
  
  try {
    // Sanitize or just send as plain text to avoid HTML injection
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: `🛡️ VALO ALERT:\n${message}` })
    });
  } catch (e) { console.error("Telegram fail", e); }
  res.sendStatus(200);
});
