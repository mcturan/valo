import { Router } from 'express';
import { getCustomers, postCustomer } from '../controllers/customerController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateCustomer } from '../middleware/validate.js';

const router = Router();
router.get('/', authenticateToken, getCustomers);
router.post('/', authenticateToken, validateCustomer, postCustomer);
export default router;
