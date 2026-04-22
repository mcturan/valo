import { Request, Response } from 'express';
import pool from '../db.js';
import { AuthRequest, authorizeRole } from '../middleware/auth.js';

export const getSettings = async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM system_settings');
  const settings: any = {};
  result.rows.forEach(r => settings[r.key] = r.value);
  res.json(settings);
};

export const postSettings = async (req: AuthRequest, res: Response) => {
  const { key, value } = req.body;
  const allowedKeys = ['weather_config', 'printer_config', 'global_spread'];
  if (!allowedKeys.includes(key)) return res.status(400).json({ error: 'Invalid setting key' });
  await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, JSON.stringify(value)]);
  res.json({ success: true });
};

export const getRates = async (req: Request, res: Response) => {
  const result = await pool.query(`
    SELECT DISTINCT ON (base_currency, target_currency) base_currency, target_currency, rate_multiplier, created_at
    FROM exchange_rates ORDER BY base_currency, target_currency, created_at DESC
  `);
  res.json(result.rows);
};

export const getWeather = async (req: Request, res: Response) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch('https://wttr.in/Fatih?format=j1', { signal: controller.signal });
    const data: any = await response.json();
    res.json({
      location: 'FATIH',
      current: `${data.current_condition[0].temp_C}°C ${data.current_condition[0].lang_tr?.[0]?.value || data.current_condition[0].weatherDesc[0].value}`,
      today: `${data.weather[0].mintempC}/${data.weather[0].maxtempC}°C`,
      tomorrow: `${data.weather[1].mintempC}/${data.weather[1].maxtempC}°C`
    });
  } catch {
    res.json({
      location: 'FATIH',
      current: 'Hava durumu alınamadı',
      today: '--/--°C',
      tomorrow: '--/--°C'
    });
  } finally {
    clearTimeout(timeout);
  }
};

export const getBalances = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Auth error' });
  const result = await pool.query(`
    SELECT a.currency_code, SUM(CASE WHEN le.entry_type = 'DEBIT' THEN le.amount ELSE -le.amount END) as balance
    FROM accounts a LEFT JOIN ledger_entries le ON a.id = le.account_id
    WHERE a.user_id = $1 AND a.account_type = 'PERSONAL' GROUP BY a.currency_code
  `, [req.user.id]);
  res.json(result.rows);
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  const result = await pool.query(`
    SELECT id, full_name, username, role, nfc_enabled, is_active, created_at
    FROM users
    ORDER BY created_at ASC
  `);
  res.json(result.rows);
};

export const getAlarms = async (req: AuthRequest, res: Response) => {
  const result = await pool.query(`
    SELECT id, pair, condition_type, threshold_val, telegram_enabled, is_active, created_at
    FROM alert_rules
    ORDER BY created_at DESC
  `);
  res.json(result.rows);
};
