import { Response } from 'express';
import pool from '../db.js';
import { createFinancialTransaction } from '../services/ledger.js';
import { AuthRequest } from '../middleware/auth.js';

export const getTransactions = async (req: AuthRequest, res: Response) => {
  const { start = '1970-01-01', end = '2100-01-01', limit = 50, offset = 0 } = req.query;
  try {
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
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const postTransaction = async (req: AuthRequest, res: Response) => {
  const { customer_id, debit_amount, currency, credit_amount, credit_currency } = req.body;
  if (!req.user) return res.status(401).json({ error: 'Auth error' });
  const userId = req.user.id;

  try {
    const getPersonalAcc = async (cur: string) => {
      const r = await pool.query(
        "SELECT id FROM accounts WHERE currency_code = $1 AND account_type = 'PERSONAL' AND user_id = $2 LIMIT 1",
        [cur, userId]
      );
      if (r.rows.length === 0) throw new Error(`Account for ${cur} not found`);
      return r.rows[0].id;
    };

    const getClearingAcc = async (cur: string) => {
      const r = await pool.query(
        "SELECT id FROM accounts WHERE currency_code = $1 AND account_type = 'CLEARING' LIMIT 1",
        [cur]
      );
      if (r.rows.length === 0) throw new Error(`Clearing account for ${cur} not initialized.`);
      return r.rows[0].id;
    };

    const debitAccId = await getPersonalAcc(currency);
    const creditAccId = await getPersonalAcc(credit_currency);
    const debitClearingAccId = await getClearingAcc(currency);
    const creditClearingAccId = await getClearingAcc(credit_currency);

    const entries = [
      { account_id: debitAccId, entry_type: 'DEBIT' as const, amount: debit_amount, currency_code: currency },
      { account_id: debitClearingAccId, entry_type: 'CREDIT' as const, amount: debit_amount, currency_code: currency },
      { account_id: creditAccId, entry_type: 'CREDIT' as const, amount: credit_amount, currency_code: credit_currency },
      { account_id: creditClearingAccId, entry_type: 'DEBIT' as const, amount: credit_amount, currency_code: credit_currency }
    ];

    const result = await createFinancialTransaction({
      user_id: userId,
      customer_id,
      type: 'EXCHANGE',
      auth_used: 'PASSWORD_OVERRIDE',
      entries
    });

    // --- AUDIT LOG ---
    await pool.query('INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)', 
      [userId, 'TRANSACTION_CREATED', JSON.stringify({ tx_id: result.transactionId, amount: debit_amount, currency }), req.ip]);

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
