/**
 * Database client for Bugeese backend.
 * Provides unified query() and Supabase client access.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://vdewempvdxdixlgainro.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase = null;
let useMock = process.env.USE_MOCK_DB === 'true' || !serviceRoleKey;

if (serviceRoleKey) {
  try {
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
  } catch (err) {
    console.warn('Failed to init Supabase client, using mock store:', err.message);
    useMock = true;
  }
}

// In-Memory store fallback & test seed store
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

/**
 * Executes a query against Supabase or mock store
 */
async function query(text, params = []) {
  const clean = text.trim();

  // If using Supabase and table exists, try fetching via Supabase
  if (supabase && !useMock) {
    if (/select \* from aggregator_config where is_active = true/i.test(clean)) {
      const { data, error } = await supabase
        .from('aggregator_config')
        .select('*')
        .eq('is_active', true)
        .limit(1);
      if (!error && data && data.length > 0) {
        return { rows: data, rowCount: data.length };
      }
    }
    if (/select \* from menu_items/i.test(clean)) {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*');
      if (!error && data && data.length > 0) {
        return { rows: data, rowCount: data.length };
      }
    }
  }

  // Fallback to mockDB store
  if (/select \* from aggregator_config where is_active = true/i.test(clean)) {
    const active = mockDB.aggregator_config.filter(c => c.is_active);
    return { rows: active, rowCount: active.length };
  }
  if (/select \* from menu_items/i.test(clean)) {
    return { rows: mockDB.menu_items, rowCount: mockDB.menu_items.length };
  }
  if (/select \* from combos/i.test(clean)) {
    return { rows: mockDB.combos, rowCount: mockDB.combos.length };
  }

  return { rows: [], rowCount: 0 };
}

module.exports = {
  supabase,
  query,
  mockDB,
  isMock: () => useMock,
  setMock: (val) => { useMock = val; }
};
