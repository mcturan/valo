import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Tesseract from 'tesseract.js';
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

// --- CLOUD SYNC SERVICE (TINC SIMULATION) ---
const syncToCloud = async () => {
  try {
    const unsynced = await pool.query('SELECT id FROM transactions WHERE is_synced = FALSE AND status = \'COMPLETED\' LIMIT 10');
    if (unsynced.rows.length === 0) return;

    console.log(`☁️ TINC Sync: Encrypting and uploading ${unsynced.rows.length} transactions...`);
    
    // Simulate encryption and upload delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const ids = unsynced.rows.map(r => r.id);
    await pool.query('UPDATE transactions SET is_synced = TRUE WHERE id = ANY($1)', [ids]);
    console.log('✅ TINC Sync: Batch completed successfully.');
  } catch (e) {
    console.error('❌ TINC Sync Error:', e);
  }
};

setInterval(syncToCloud, 60000); // Sync every minute

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

// --- ALARMS ---
app.get('/alarms', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT * FROM alert_rules ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/alarms', authenticateToken, authorizeRole(['MASTER_ADMIN', 'ADMIN']), async (req, res) => {
  const { pair, condition_type, threshold_val, telegram_enabled } = req.body;
  await pool.query('INSERT INTO alert_rules (pair, condition_type, threshold_val, telegram_enabled) VALUES ($1, $2, $3, $4)', [pair, condition_type, threshold_val, telegram_enabled]);
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

// --- SYSTEM BALANCES (USER SPECIFIC) ---
app.get('/system/balances', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth error' });
  const result = await pool.query(`
    SELECT a.currency_code, 
           SUM(CASE WHEN le.entry_type = 'DEBIT' THEN le.amount ELSE -le.amount END) as balance
    FROM accounts a
    LEFT JOIN ledger_entries le ON a.id = le.account_id
    WHERE a.user_id = $1 AND a.account_type = 'PERSONAL'
    GROUP BY a.currency_code
  `, [req.user.id]);
  res.json(result.rows);
});

// --- VAULT MANAGEMENT ---
app.get('/vault/status', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth error' });
  const result = await pool.query('SELECT * FROM vault_sessions WHERE user_id = $1 AND status = \'OPEN\' ORDER BY opening_time DESC LIMIT 1', [req.user.id]);
  res.json({ isOpen: result.rows.length > 0, session: result.rows[0] });
});

app.post('/vault/open', authenticateToken, async (req: AuthRequest, res) => {
  const { opening_balances } = req.body; // e.g. { "USD": 1000, "TRY": 50000 }
  if (!req.user) return res.status(401).json({ error: 'Auth error' });

  try {
    // 1. Create session
    await pool.query('INSERT INTO vault_sessions (user_id, status, opening_balances) VALUES ($1, \'OPEN\', $2)', [req.user.id, JSON.stringify(opening_balances)]);

    // 2. Ensure accounts exist for this user
    const currencies = ['TRY', 'USD', 'EUR', 'GBP'];
    for (const cur of currencies) {
       await pool.query(`
         INSERT INTO accounts (account_name, currency_code, account_type, user_id)
         VALUES ($1, $2, 'PERSONAL', $3)
         ON CONFLICT DO NOTHING
       `, [`${req.user.username}_${cur}`, cur, req.user.id]);
    }

    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/vault/transfer', authenticateToken, async (req: AuthRequest, res) => {
  const { amount, currency, direction } = req.body; // direction: 'FROM_MASTER' or 'TO_MASTER'
  if (!req.user) return res.status(401).json({ error: 'Auth error' });

  try {
    // 1. Get IDs
    const masterAccRes = await pool.query('SELECT id FROM accounts WHERE currency_code = $1 AND account_type = \'MASTER\'', [currency]);
    const personalAccRes = await pool.query('SELECT id FROM accounts WHERE currency_code = $1 AND account_type = \'PERSONAL\' AND user_id = $2', [currency, req.user.id]);

    if (masterAccRes.rows.length === 0 || personalAccRes.rows.length === 0) throw new Error('Account mapping error');

    const masterId = masterAccRes.rows[0].id;
    const personalId = personalAccRes.rows[0].id;

    const entries = direction === 'FROM_MASTER' 
      ? [{ account_id: masterId, entry_type: 'CREDIT' as const, amount, currency_code: currency }, { account_id: personalId, entry_type: 'DEBIT' as const, amount, currency_code: currency }]
      : [{ account_id: personalId, entry_type: 'CREDIT' as const, amount, currency_code: currency }, { account_id: masterId, entry_type: 'DEBIT' as const, amount, currency_code: currency }];

    await createFinancialTransaction({
      user_id: req.user.id,
      type: 'VAULT_TRANSFER',
      auth_used: 'ADMIN_OVERRIDE',
      entries
    });

    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
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

// --- OCR (ID SCAN) ---
app.post('/api/ocr', authenticateToken, async (req, res) => {
  const { image } = req.body; // base64
  if (!image) return res.status(400).json({ error: 'Image missing' });

  try {
    const { data: { text } } = await Tesseract.recognize(image, 'eng+tur');
    
    // Simple heuristic parser for name and ID
    const idMatch = text.match(/\d{11}/);
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
    const fullName = lines[0] || 'Unknown';

    res.json({ 
      full_name: fullName.toUpperCase(),
      identity_number: idMatch ? idMatch[0] : ''
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- AI SMURFING DETECTION ---
app.post('/api/risk-analyze', authenticateToken, async (req, res) => {
  const { customer_id, amount_usd } = req.body;
  if (!customer_id) return res.json({ risk_level: 'LOW', reason: 'Anonymous' });

  try {
    // Check last 30 days volume
    const result = await pool.query(`
      SELECT SUM(le.amount) as total_volume
      FROM ledger_entries le
      JOIN transactions t ON le.transaction_id = t.id
      WHERE t.customer_id = $1 
      AND t.created_at > NOW() - INTERVAL '30 days'
      AND le.currency_code != 'TRY'
    `, [customer_id]);

    const volume = parseInt(result.rows[0].total_volume || '0') / 100;
    
    // Threshold for risk (Mock Ollama analysis logic)
    let risk_level = 'LOW';
    let reason = 'Normal activity';

    if (volume > 10000) {
      risk_level = 'CRITICAL';
      reason = 'High volume smurfing detected (>10k USD / 30d)';
    } else if (volume > 5000) {
      risk_level = 'MEDIUM';
      reason = 'Frequent transactions detected';
    }

    res.json({ risk_level, reason, volume_30d: volume });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
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
