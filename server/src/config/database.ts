import { Pool } from 'pg';

// Resolve connection string with safe default and clear logging
const resolveDatabaseUrl = (): string => {
  const envUrl = process.env.DATABASE_URL;
  const defaultUrl = 'postgresql://postgres:postgres@localhost:5432/anonymous_survey';

  if (!envUrl || envUrl.trim() === '') {
    console.warn('⚠️ DATABASE_URL not set. Falling back to local default.');
    return defaultUrl;
  }

  // Basic sanity checks to reduce common mistakes
  if (!envUrl.startsWith('postgres://') && !envUrl.startsWith('postgresql://')) {
    console.warn('⚠️ DATABASE_URL does not start with postgres:// or postgresql://. Using it as-is.');
  }

  return envUrl;
};

const connectionString = resolveDatabaseUrl();

const pool = new Pool({
  connectionString,
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};

export default db;