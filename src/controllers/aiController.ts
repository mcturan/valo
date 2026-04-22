import { Request, Response } from 'express';
import Tesseract from 'tesseract.js';
import pool from '../db.js';
import { analyzeRiskWithAI } from '../services/ai_service.js';

export const ocrIdentity = async (req: Request, res: Response) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'Image missing' });
  try {
    const { data: { text } } = await Tesseract.recognize(image, 'eng+tur');
    const idMatch = text.match(/\\d{11}/);
    const fullNameLine = text.split('\\n').map(l => l.trim()).filter(l => l.length > 5)[0] || 'Unknown';
    res.json({ full_name: fullNameLine.toUpperCase(), identity_number: idMatch ? idMatch[0] : '' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const riskAnalyze = async (req: Request, res: Response) => {
  const { customer_id } = req.body;
  if (!customer_id) return res.json({ risk_level: 'LOW', reason: 'Anonymous' });
  try {
    const result = await pool.query(`
      SELECT c.full_name, SUM(le.amount) as total_volume 
      FROM customers c
      LEFT JOIN transactions t ON c.id = t.customer_id
      LEFT JOIN ledger_entries le ON t.id = le.transaction_id
      WHERE c.id = $1 AND t.created_at > NOW() - INTERVAL '30 days' AND le.currency_code != 'TRY'
      GROUP BY c.full_name
    `, [customer_id]);
    
    const row = result.rows[0];
    const volume = parseInt(row?.total_volume || '0') / 100;
    const name = row?.full_name || 'Unknown';

    const aiResult = await analyzeRiskWithAI(volume, name);
    res.json(aiResult);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};
