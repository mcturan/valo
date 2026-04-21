import pool from '../db.js';

export interface LedgerEntry {
  account_id: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount: number; // Integer (kuruş/cent)
}

export interface TransactionData {
  user_id: string;
  type: 'EXCHANGE' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  auth_used: 'NFC_STANDARD' | 'PASSWORD_OVERRIDE' | 'ADMIN_OVERRIDE';
  customer_identity_hash?: string;
  applied_exchange_rate_id?: string;
  entries: LedgerEntry[];
}

export async function createFinancialTransaction(data: TransactionData) {
  const { user_id, type, auth_used, customer_identity_hash, applied_exchange_rate_id, entries } = data;

  // 1. Double-Entry Validation
  let totalBalance = 0;
  for (const entry of entries) {
    if (entry.entry_type === 'DEBIT') {
      totalBalance += entry.amount;
    } else {
      totalBalance -= entry.amount;
    }
  }

  if (totalBalance !== 0) {
    throw new Error('Double-entry violation: Total DEBIT must equal total CREDIT.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 2. Create Transaction Header
    const txResult = await client.query(
      `INSERT INTO transactions (user_id, type, status, auth_used, customer_identity_hash, applied_exchange_rate_id)
       VALUES ($1, $2, 'COMPLETED', $3, $4, $5)
       RETURNING id`,
      [user_id, type, auth_used, customer_identity_hash, applied_exchange_rate_id]
    );

    const transactionId = txResult.rows[0].id;

    // 3. Create Ledger Entries
    for (const entry of entries) {
      await client.query(
        `INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount)
         VALUES ($1, $2, $3, $4)`,
        [transactionId, entry.account_id, entry.entry_type, entry.amount]
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
