import { Router } from 'express';
import { getTransactions, postTransaction } from '../controllers/transactionController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateTransaction } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticateToken, getTransactions);
router.post('/', authenticateToken, validateTransaction, postTransaction);

export default router;
