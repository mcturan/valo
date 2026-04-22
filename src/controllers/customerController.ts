import { Response } from 'express';
import pool from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const getCustomers = async (req: AuthRequest, res: Response) => {
  const { limit = 50, offset = 0 } = req.query;
  try {
    const r = await pool.query('SELECT * FROM customers WHERE is_active = TRUE ORDER BY full_name ASC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const postCustomer = async (req: AuthRequest, res: Response) => {
  const { full_name, identity_number, phone, country = 'Türkiye' } = req.body;
  try {
    const r = await pool.query('INSERT INTO customers (full_name, identity_number, phone, country) VALUES ($1, $2, $3, $4) RETURNING id', [full_name, identity_number, phone, country]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};
