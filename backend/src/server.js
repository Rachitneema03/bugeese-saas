/**
 * Express Server for Bugeese Backend
 * Implements Quote calculation with DB config & item costs,
 * Combos with admin contribution margins, and Acceptance Demo endpoints.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { runEngine, toCustomerView, toAdminComparison } = require('./engine');
const { query, mockDB, isMock } = require('./db');
const { testConfig, testMenuItems, testCombos } = require('./seedData');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize mock DB on startup if empty
if (mockDB.aggregator_config.length === 0) {
  mockDB.aggregator_config = [{ ...testConfig }];
  mockDB.menu_items = testMenuItems.map(m => ({ ...m }));
  mockDB.combos = testCombos.map(c => ({ ...c }));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: isMock() ? 'in-memory-mock' : 'live-postgresql',
    time: new Date().toISOString()
  });
});

/**
 * GET /api/config
 * Current active aggregator configuration
 */
app.get('/api/config', async (req, res) => {
  try {
    const result = await query('SELECT * FROM aggregator_config WHERE is_active = true LIMIT 1');
    const cfg = result.rows[0] || testConfig;
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/menu
 * List of pure-veg menu items (Safe customer view: price only, NO food costs)
 */
app.get('/api/menu', async (req, res) => {
  try {
    const result = await query('SELECT * FROM menu_items WHERE available = true');
    const items = result.rows.length > 0 ? result.rows : mockDB.menu_items;
    // Strip food cost for customer security
    const sanitized = items.map(({ food_cost_paise, ...rest }) => rest);
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/combos
 * Combos with admin margin if ?admin=true, or safe price-only for customers
 */
app.get('/api/combos', async (req, res) => {
  const isAdmin = req.query.admin === 'true';
  const combos = mockDB.combos.length > 0 ? mockDB.combos : testCombos;

  if (isAdmin) {
    // Admin sees food cost, contribution margin in paise and %
    const adminCombos = combos.map(c => {
      const packaging = c.packaging_paise || 1500;
      const contributionPaise = c.price_paise - c.food_cost_paise - packaging;
      const contributionPct = Number(((contributionPaise / c.price_paise) * 100).toFixed(2));
      return {
        ...c,
        packaging_paise: packaging,
        contribution_paise: contributionPaise,
        contribution_margin_pct: contributionPct
      };
    });
    return res.json(adminCombos);
  }

  // Customer safe view
  const safeCombos = combos.map(({ food_cost_paise, packaging_paise, ...rest }) => rest);
  res.json(safeCombos);
});

/**
 * POST /api/orders/quote
 * Calculates real-time safe direct discount using DB config and kitchen costs.
 * 
 * Body: {
 *   items: [{ menu_item_id, combo_id, qty }],
 *   acquisition_class: 'qr_attributed' | 'first_order' | 'organic',
 *   qr_token: string,
 *   tier: 'bronze' | 'silver' | 'gold'
 * }
 */
app.post('/api/orders/quote', async (req, res) => {
  try {
    const { items = [], acquisition_class = 'organic', qr_token, tier = 'bronze' } = req.body;

    if (!items.length) {
      return res.status(400).json({ error: 'Order basket cannot be empty' });
    }

    // 1. Fetch active config from DB
    const cfgResult = await query('SELECT * FROM aggregator_config WHERE is_active = true LIMIT 1');
    const cfgRecord = cfgResult.rows[0] || testConfig;

    // 2. Resolve items & compute subtotal and food cost from DB records
    let menuSubtotalPaise = 0;
    let foodCostPaise = 0;
    const resolvedItems = [];

    for (const line of items) {
      const qty = Number(line.qty || 1);
      if (line.combo_id) {
        const combo = mockDB.combos.find(c => c.id === line.combo_id);
        if (combo) {
          menuSubtotalPaise += combo.price_paise * qty;
          foodCostPaise += combo.food_cost_paise * qty;
          resolvedItems.push({ name: combo.name, qty, price_paise: combo.price_paise, is_combo: true });
        }
      } else if (line.menu_item_id) {
        const item = mockDB.menu_items.find(m => m.id === line.menu_item_id);
        if (item) {
          menuSubtotalPaise += item.price_paise * qty;
          foodCostPaise += item.food_cost_paise * qty;
          resolvedItems.push({ name: item.name, qty, price_paise: item.price_paise });
        }
      }
    }

    // 3. Determine tier share & QR boost
    const tierMap = {
      bronze: cfgRecord.customer_share_bps_bronze || 6000,
      silver: cfgRecord.customer_share_bps_silver || 6500,
      gold: cfgRecord.customer_share_bps_gold || 7000
    };
    const tierShareBps = tierMap[tier.toLowerCase()] || 6000;
    const qrBoostBps = qr_token ? (cfgRecord.qr_boost_bps || 1000) : 0;

    // 4. Run Financial Engine
    const engineConfig = {
      commissionBps: cfgRecord.commission_bps,
      gatewayFeePaise: cfgRecord.gateway_fee_flat_paise,
      minOrderPaise: cfgRecord.min_order_for_discount_paise,
      minMarginPaise: cfgRecord.min_margin_paise,
      minMarginBps: cfgRecord.min_margin_bps,
      capBps: cfgRecord.cap_bps,
      organicShareBps: cfgRecord.organic_share_bps
    };

    const calcResult = runEngine({
      menuSubtotalPaise,
      foodCostPaise,
      packagingPaise: 1500,
      courierEstimatePaise: 4000,
      tierShareBps,
      qrBoostBps,
      acquisitionClass: acquisition_class
    }, engineConfig);

    // 5. Build and save quote record
    const quoteId = `quote_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const expiresAt = new Date(Date.now() + (cfgRecord.quote_ttl_seconds || 300) * 1000);

    const quoteRecord = {
      id: quoteId,
      items: resolvedItems,
      config_version_id: cfgRecord.id,
      calcResult,
      expires_at: expiresAt,
      used: false
    };
    mockDB.order_quotes.push(quoteRecord);

    // 6. Return response
    res.json({
      quote_id: quoteId,
      expires_at: expiresAt,
      customer_view: toCustomerView(calcResult),
      // Admin comparison included for hackathon demo view
      admin_comparison: toAdminComparison(calcResult)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Bugeese Backend API running on http://localhost:${PORT}`);
    console.log(`Database Mode: ${isMock() ? 'In-Memory Mock DB' : 'Live PostgreSQL'}`);
  });
}

module.exports = app;
