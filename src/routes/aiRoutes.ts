import { Router } from 'express';
import { ocrIdentity, riskAnalyze } from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/auth.js';
const router = Router();
router.post('/ocr', authenticateToken, ocrIdentity);
router.post('/risk-analyze', authenticateToken, riskAnalyze);
export default router;
