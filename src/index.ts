import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { startHardwareDaemon } from './hardware-daemon.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import vaultRoutes from './routes/vaultRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { authenticateToken, authorizeRole } from './middleware/auth.js';
import { getUsers, getAlarms } from './controllers/systemController.js';

const app = express();

// --- CORS ---
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' })); // Support for OCR images

// Request Log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// --- Register Routes ---
app.use('/', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/customers', customerRoutes);
app.use('/vault', vaultRoutes);
app.use('/system', systemRoutes);
app.use('/api', aiRoutes); // OCR & Risk Analysis
app.get('/users', authenticateToken, authorizeRole(['MASTER_ADMIN', 'ADMIN']), getUsers);
app.get('/alarms', authenticateToken, authorizeRole(['MASTER_ADMIN', 'ADMIN']), getAlarms);

// Hardware Daemon
startHardwareDaemon(Number(config.hardwarePort));

const port = config.port;
app.listen(port, () => {
  console.log(`🛡️ VALO CORE MASTER API: http://localhost:${port}`);
});
