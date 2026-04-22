import pool from '../db.js';

export interface LedgerEntry {
  account_id: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount: number; // Integer (kuruş/cent)
  currency_code: string;
}

export interface TransactionData {
  user_id: string;
  customer_id?: string;
  type: 'EXCHANGE' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  auth_used: 'NFC_STANDARD' | 'PASSWORD_OVERRIDE' | 'ADMIN_OVERRIDE';
  applied_exchange_rate_id?: string;
  banknote_serials?: any;
  entries: LedgerEntry[];
}

export async function createFinancialTransaction(data: TransactionData) {
  const { user_id, customer_id, type, auth_used, applied_exchange_rate_id, banknote_serials, entries } = data;

  // 1. Multi-Currency Double-Entry Validation
  // Every currency involved in the transaction MUST balance to zero.
  const currencyBalances: { [key: string]: number } = {};
  
  for (const entry of entries) {
    const balance = currencyBalances[entry.currency_code] || 0;
    if (entry.entry_type === 'DEBIT') {
      currencyBalances[entry.currency_code] = balance + entry.amount;
    } else {
      currencyBalances[entry.currency_code] = balance - entry.amount;
    }
  }

  for (const [currency, balance] of Object.entries(currencyBalances)) {
    if (balance !== 0) {
      throw new Error(`Double-entry violation in ${currency}: Balance must be 0, but is ${balance}.`);
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Balance Check for PERSONAL accounts
    for (const entry of entries) {
      if (entry.entry_type === 'DEBIT') {
        const accRes = await client.query('SELECT account_type FROM accounts WHERE id = $1', [entry.account_id]);
        if (accRes.rows[0]?.account_type === 'PERSONAL') {
          const balRes = await client.query(`
            SELECT SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE -amount END) as balance 
            FROM ledger_entries WHERE account_id = $1
          `, [entry.account_id]);
          const currentBalance = parseInt(balRes.rows[0].balance || '0');
          if (currentBalance < entry.amount) {
            throw new Error(`Yetersiz Bakiye: Kasada ${entry.currency_code} biriminde yeterli tutar yok. (Mevcut: ${currentBalance/100}, İstenen: ${entry.amount/100})`);
          }
        }
      }
    }

    // 2. Create Transaction Header
    const txResult = await client.query(
      `INSERT INTO transactions (user_id, customer_id, type, status, auth_used, applied_exchange_rate_id, banknote_serials)
       VALUES ($1, $2, $3, 'COMPLETED', $4, $5, $6)
       RETURNING id`,
      [user_id, customer_id, type, auth_used, applied_exchange_rate_id, banknote_serials]
    );

    const transactionId = txResult.rows[0].id;

    // 3. Create Ledger Entries
    for (const entry of entries) {
      await client.query(
        `INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, currency_code)
         VALUES ($1, $2, $3, $4, $5)`,
        [transactionId, entry.account_id, entry.entry_type, entry.amount, entry.currency_code]
      );
    }

    await client.query('COMMIT');
    return { transactionId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
