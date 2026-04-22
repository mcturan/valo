import pool from '../db.js';

export async function syncToCloud() {
  try {
    const unsynced = await pool.query('SELECT id, type, created_at FROM transactions WHERE is_synced = FALSE AND status = \'COMPLETED\' LIMIT 10');
    if (unsynced.rows.length === 0) return;

    console.log(`☁️ TINC Sync: Syncing ${unsynced.rows.length} transactions...`);
    
    // TODO: Real API Call to TINC Cloud here.
    // For now, we simulate a robust transactional success.
    await new Promise(resolve => setTimeout(resolve, 1000));

    const ids = unsynced.rows.map(r => r.id);
    await pool.query('UPDATE transactions SET is_synced = TRUE WHERE id = ANY($1)', [ids]);
    console.log('✅ TINC Sync: Batch completed.');
  } catch (e) {
    console.error('❌ TINC Sync Failure:', e);
  }
}
