import { Pool } from 'pg';
import *as dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'budgetflow',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});