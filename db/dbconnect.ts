import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Access Pool from the default export
const { Pool } = pg;

const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: Number(process.env.PG_PORT),
  ssl: {
    rejectUnauthorized: false,       // Disables strict SSL certificate checks
  }
});

export const query = async (text: string, params?: any[]) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};


