import { Response } from 'express';
import pool from '../db.js';
import { createFinancialTransaction } from '../services/ledger.js';
import { AuthRequest } from '../middleware/auth.js';

export const getVaultStatus = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Auth error' });
  const result = await pool.query('SELECT * FROM vault_sessions WHERE user_id = $1 AND status = \'OPEN\' ORDER BY opening_time DESC LIMIT 1', [req.user.id]);
  res.json({ isOpen: result.rows.length > 0, session: result.rows[0] });
};

export const openVault = async (req: AuthRequest, res: Response) => {
  const { opening_balances } = req.body;
  if (!req.user) return res.status(401).json({ error: 'Auth error' });
  try {
    await pool.query('INSERT INTO vault_sessions (user_id, status, opening_balances) VALUES ($1, \'OPEN\', $2)', [req.user.id, JSON.stringify(opening_balances)]);
    const currencies = ['TRY', 'USD', 'EUR', 'GBP'];
    for (const cur of currencies) {
       await pool.query('INSERT INTO accounts (account_name, currency_code, account_type, user_id) VALUES ($1, $2, \'PERSONAL\', $3) ON CONFLICT DO NOTHING', [`${req.user.username}_${cur}`, cur, req.user.id]);
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const transferVault = async (req: AuthRequest, res: Response) => {
  const { amount, currency, direction } = req.body;
  if (!req.user) return res.status(401).json({ error: 'Auth error' });
  try {
    const masterAccRes = await pool.query('SELECT id FROM accounts WHERE currency_code = $1 AND account_type = \'MASTER\'', [currency]);
    const personalAccRes = await pool.query('SELECT id FROM accounts WHERE currency_code = $1 AND account_type = \'PERSONAL\' AND user_id = $2', [currency, req.user.id]);
    if (masterAccRes.rows.length === 0 || personalAccRes.rows.length === 0) throw new Error('Account mapping error');
    const masterId = masterAccRes.rows[0].id;
    const personalId = personalAccRes.rows[0].id;
    const entries = direction === 'FROM_MASTER' 
      ? [{ account_id: masterId, entry_type: 'CREDIT' as const, amount, currency_code: currency }, { account_id: personalId, entry_type: 'DEBIT' as const, amount, currency_code: currency }]
      : [{ account_id: personalId, entry_type: 'CREDIT' as const, amount, currency_code: currency }, { account_id: masterId, entry_type: 'DEBIT' as const, amount, currency_code: currency }];
    await createFinancialTransaction({ user_id: req.user.id, type: 'VAULT_TRANSFER', auth_used: 'ADMIN_OVERRIDE', entries });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};
