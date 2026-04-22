import { Router } from 'express';
import { getVaultStatus, openVault, transferVault } from '../controllers/vaultController.js';
import { authenticateToken } from '../middleware/auth.js';
const router = Router();
router.get('/status', authenticateToken, getVaultStatus);
router.post('/open', authenticateToken, openVault);
router.post('/transfer', authenticateToken, transferVault);
export default router;
