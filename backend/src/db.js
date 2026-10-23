/**
 * Database client for Bugeese backend.
 * Supports both Live PostgreSQL (via pg Pool) and an In-Memory mock DB
 * so you can develop, test, and demo without requiring a local Postgres setup.
 */
require('dotenv').config();
const { Pool } = require('pg');

let pool = null;
let useMock = process.env.USE_MOCK_DB === 'true' || !process.env.DATABASE_URL;

// In-Memory store for mock / offline testing
const mockDB = {
  users: [],
  shops: [],
  aggregator_config: [],
  menu_items: [],
  combos: [],
  combo_items: [],
  reward_items: [],
  qr_tokens: [],
  order_quotes: [],
  orders: [],
  loyalty_ledger: [],
  dispatches: [],
  payments: []
};

function getPool() {
  if (!pool && !useMock) {
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
      });
      pool.on('error', (err) => {
        console.error('Unexpected pg error, falling back to mock mode:', err.message);
        useMock = true;
      });
    } catch (e) {
      console.warn('Failed to connect to Postgres, using in-memory store:', e.message);
      useMock = true;
    }
  }
  return pool;
}

/**
 * Execute a query against Postgres or Mock store
 */
async function query(text, params = []) {
  if (!useMock) {
    try {
      const p = getPool();
      return await p.query(text, params);
    } catch (err) {
      console.warn(`Postgres query failed (${err.message}), handling in mock store...`);
    }
  }

  // Basic mock SQL dispatcher for hackathon testing & demos
  const clean = text.trim();

  // SELECT from aggregator_config
  if (/select \* from aggregator_config where is_active = true/i.test(clean)) {
    const active = mockDB.aggregator_config.filter(c => c.is_active);
    return { rows: active, rowCount: active.length };
  }

  // SELECT from menu_items
  if (/select \* from menu_items/i.test(clean)) {
    return { rows: mockDB.menu_items, rowCount: mockDB.menu_items.length };
  }

  // SELECT from combos
  if (/select \* from combos/i.test(clean)) {
    return { rows: mockDB.combos, rowCount: mockDB.combos.length };
  }

  // Generic fallback
  return { rows: [], rowCount: 0 };
}

module.exports = {
  query,
  getPool,
  mockDB,
  isMock: () => useMock,
  setMock: (val) => { useMock = val; }
};
