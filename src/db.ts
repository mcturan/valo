import pkg from 'pg';
const { Pool } = pkg;
import { config } from './config/env.js';

const pool = new Pool({
  connectionString: config.dbUrl,
});

export default pool;
