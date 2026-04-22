import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { config } from '../config/env.js';

const JWT_SECRET = config.jwtSecret; // NO FALLBACK! (Force fail if secret is missing)

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND is_active = TRUE', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Hatalı Kullanıcı veya Şifre' });
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Hatalı Kullanıcı veya Şifre' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ 
      token,
      user: { id: user.id, full_name: user.full_name, username: user.username, role: user.role }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};
