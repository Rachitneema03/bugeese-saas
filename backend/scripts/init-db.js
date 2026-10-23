/**
 * Script to execute schema.sql on PostgreSQL
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getPool, isMock } = require('../src/db');

async function initDB() {
  if (isMock()) {
    console.log('USE_MOCK_DB is true. Skipping SQL schema migration.');
    return;
  }
  const pool = getPool();
  if (!pool) {
    console.log('No pool available. Check DATABASE_URL in .env.');
    return;
  }

  const sqlPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    console.log('Connecting to PostgreSQL to run schema migrations...');
    await pool.query(sql);
    console.log('schema.sql executed successfully! Tables & views created.');
  } catch (err) {
    console.error('Error running schema migration:', err.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initDB().then(() => process.exit(0));
}

module.exports = { initDB };
