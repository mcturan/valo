import { Request, Response, NextFunction } from 'express';

export const validateTransaction = (req: Request, res: Response, next: NextFunction) => {
  const { debit_amount, credit_amount, currency, credit_currency } = req.body;

  if (!debit_amount || typeof debit_amount !== 'number' || debit_amount <= 0) {
    return res.status(400).json({ error: 'Invalid debit_amount' });
  }

  if (!credit_amount || typeof credit_amount !== 'number' || credit_amount <= 0) {
    return res.status(400).json({ error: 'Invalid credit_amount' });
  }

  if (!currency || typeof currency !== 'string') {
    return res.status(400).json({ error: 'Invalid currency' });
  }

  if (!credit_currency || typeof credit_currency !== 'string') {
    return res.status(400).json({ error: 'Invalid credit_currency' });
  }

  next();
};

export const validateCustomer = (req: Request, res: Response, next: NextFunction) => {
  const { full_name, identity_number } = req.body;

  if (!full_name || full_name.length < 3) {
    return res.status(400).json({ error: 'Invalid full_name' });
  }

  if (identity_number && (identity_number.length !== 11 || !/^\d+$/.test(identity_number))) {
    return res.status(400).json({ error: 'Invalid identity_number (must be 11 digits)' });
  }

  next();
};
