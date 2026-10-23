/**
 * Express Server for Bugeese Backend
 * Implements Quote calculation with Feature 1 Financial Engine,
 * Feature 2 Tiered Direct Incentive Logic & Commission-Avoided Loyalty,
 * Combos with admin contribution margins, and Acceptance Demo endpoints.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { runEngine, toCustomerView, toAdminComparison } = require('./engine');
const {
  getTierConfigs,
  calculateCommissionAvoided,
  computeTieredIncentive,
  createOrderSnapshot,
  toCustomerTierView,
  creditLoyaltyForOrder,
  reverseLoyaltyForOrder,
  getUserLoyaltyBalance
} = require('./tieredIncentive');
const { query, mockDB, isMock } = require('./db');
const { testConfig, testMenuItems, testCombos, testUsers } = require('./seedData');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize mock DB on startup if empty
if (mockDB.aggregator_config.length === 0) {
  mockDB.aggregator_config = [{ ...testConfig }];
  mockDB.menu_items = testMenuItems.map(m => ({ ...m }));
  mockDB.combos = testCombos.map(c => ({ ...c }));
  mockDB.users = testUsers.map(u => ({ ...u }));
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
 * GET /api/loyalty/balance/:userId
 * Retrieves cumulative posted commission avoided from ledger
 */
app.get('/api/loyalty/balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const balancePaise = getUserLoyaltyBalance(mockDB, userId);
    const cfgResult = await query('SELECT * FROM aggregator_config WHERE is_active = true LIMIT 1');
    const cfgRecord = cfgResult.rows[0] || testConfig;
    const tiers = getTierConfigs(cfgRecord);

    const { getTierForBalance, getNextTierProgress } = require('./tieredIncentive');
    const currentTierObj = getTierForBalance(balancePaise, tiers);
    const progress = getNextTierProgress(balancePaise, tiers);

    res.json({
      user_id: userId,
      balance_paise: balancePaise,
      tier: currentTierObj.tier,
      tier_name: currentTierObj.name,
      share_bps: currentTierObj.shareBps,
      next_tier: progress ? progress.nextTier : null,
      needed_paise: progress ? progress.neededPaise : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/orders/quote
 * Calculates real-time safe direct discount using Feature 2 Tiered Incentives
 * integrated with Feature 1 Financial Engine.
 *
 * Body: {
 *   items: [{ menu_item_id, combo_id, qty }],
 *   user_id: string (optional),
 *   acquisition_class: 'qr_attributed' | 'first_order' | 'organic',
 *   qr_token: string (optional),
 *   qr_input: { token, type, isValid } (optional typed interface),
 *   tier: 'bronze' | 'silver' | 'gold' (optional override if guest)
 * }
 */
app.post('/api/orders/quote', async (req, res) => {
  try {
    const {
      items = [],
      user_id,
      acquisition_class = 'organic',
      qr_token,
      qr_input,
      tier = 'bronze'
    } = req.body;

    if (!items.length) {
      return res.status(400).json({ error: 'Order basket cannot be empty' });
    }

    // 1. Fetch active config from DB
    const cfgResult = await query('SELECT * FROM aggregator_config WHERE is_active = true LIMIT 1');
    const cfgRecord = cfgResult.rows[0] || testConfig;

    // 2. Resolve items & check combo presence
    let menuSubtotalPaise = 0;
    let foodCostPaise = 0;
    let hasCombo = false;
    const resolvedItems = [];

    for (const line of items) {
      const qty = Number(line.qty || 1);
      if (line.combo_id) {
        hasCombo = true;
        const combo = mockDB.combos.find(c => c.id === line.combo_id);
        if (combo) {
          menuSubtotalPaise += combo.price_paise * qty;
          foodCostPaise += combo.food_cost_paise * qty;
          resolvedItems.push({ id: combo.id, name: combo.name, qty, price_paise: combo.price_paise, is_combo: true });
        }
      } else if (line.menu_item_id) {
        const item = mockDB.menu_items.find(m => m.id === line.menu_item_id);
        if (item) {
          menuSubtotalPaise += item.price_paise * qty;
          foodCostPaise += item.food_cost_paise * qty;
          resolvedItems.push({ id: item.id, name: item.name, qty, price_paise: item.price_paise });
        }
      }
    }

    // 3. Obtain user state & posted loyalty balance
    let postedLoyaltyBalancePaise = 0;
    let userOrderCount = 0;

    if (user_id) {
      postedLoyaltyBalancePaise = getUserLoyaltyBalance(mockDB, user_id);
      userOrderCount = (mockDB.orders || []).filter(o => o.user_id === user_id && o.status === 'completed').length;
    }

    // 4. Resolve QR eligibility input
    let resolvedQrInput = null;
    if (qr_input) {
      resolvedQrInput = qr_input;
    } else if (qr_token) {
      // Check in mockDB qr_tokens or default valid first/repeat
      const foundToken = (mockDB.qr_tokens || []).find(t => t.token_hash === qr_token);
      if (foundToken) {
        const isExpired = foundToken.expires_at && new Date(foundToken.expires_at) < new Date();
        const isUsed = foundToken.status === 'redeemed';
        resolvedQrInput = {
          token: qr_token,
          type: userOrderCount === 0 ? 'first_direct' : 'repeat',
          isValid: !isExpired && !isUsed
        };
      } else {
        // Fallback for valid test token
        resolvedQrInput = {
          token: qr_token,
          type: userOrderCount === 0 ? 'first_direct' : 'repeat',
          isValid: true
        };
      }
    }

    // 5. Run Feature 2: Tiered Direct Incentive Logic
    const tierState = computeTieredIncentive({
      menuSubtotalPaise,
      postedLoyaltyBalancePaise,
      userOrderCount,
      isCombo: hasCombo,
      qrInput: resolvedQrInput,
      acquisitionClass: acquisition_class
    }, cfgRecord);

    // 6. Run Feature 1: Financial Engine
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
      tierShareBps: tierState.effectiveTierShareBps,
      qrBoostBps: tierState.effectiveQrBoostBps,
      acquisitionClass: tierState.isCombo ? 'combo' : acquisition_class
    }, engineConfig);

    // 7. Generate Immutable Audit Snapshot
    const snapshot = createOrderSnapshot(tierState, calcResult, {
      config_version_id: cfgRecord.id,
      user_id,
      commission_bps: cfgRecord.commission_bps
    });

    // 8. Build and save quote record
    const quoteId = `quote_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const expiresAt = new Date(Date.now() + (cfgRecord.quote_ttl_seconds || 300) * 1000);

    const quoteRecord = {
      id: quoteId,
      user_id,
      items: resolvedItems,
      config_version_id: cfgRecord.id,
      tier_state: tierState,
      calcResult,
      snapshot,
      expires_at: expiresAt,
      used: false
    };
    mockDB.order_quotes.push(quoteRecord);

    // 9. Return response with customer view and tier view
    res.json({
      quote_id: quoteId,
      expires_at: expiresAt,
      customer_view: toCustomerView(calcResult),
      tier_view: toCustomerTierView(tierState, calcResult),
      snapshot,
      admin_comparison: toAdminComparison(calcResult)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/orders/confirm
 * Confirms order and marks quote as used.
 * Body: { quote_id, user_id, idempotency_key }
 */
app.post('/api/orders/confirm', async (req, res) => {
  try {
    const { quote_id, user_id, idempotency_key } = req.body;

    if (!quote_id || !idempotency_key) {
      return res.status(400).json({ error: 'quote_id and idempotency_key are required' });
    }

    // Check idempotency replay
    const existingOrder = (mockDB.orders || []).find(o => o.idempotency_key === idempotency_key);
    if (existingOrder) {
      return res.json({ order: existingOrder, replayed: true });
    }

    // Claim quote
    const quoteIndex = mockDB.order_quotes.findIndex(q => q.id === quote_id && !q.used);
    if (quoteIndex === -1) {
      return res.status(400).json({ error: 'QUOTE_INVALID_OR_EXPIRED' });
    }

    const quote = mockDB.order_quotes[quoteIndex];
    if (new Date(quote.expires_at) < new Date()) {
      return res.status(400).json({ error: 'QUOTE_EXPIRED' });
    }

    quote.used = true;

    // Create order
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newOrder = {
      id: orderId,
      user_id: user_id || quote.user_id,
      idempotency_key,
      items: quote.items,
      status: 'placed',
      menu_subtotal_paise: quote.calcResult.menuSubtotalPaise,
      financial_snapshot: quote.snapshot,
      created_at: new Date().toISOString()
    };

    mockDB.orders.push(newOrder);

    res.json({ order: newOrder, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/orders/complete
 * Updates order status to 'completed' and idempotently posts commission-avoided loyalty.
 * Body: { order_id }
 */
app.post('/api/orders/complete', async (req, res) => {
  try {
    const { order_id } = req.body;
    const order = (mockDB.orders || []).find(o => o.id === order_id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = 'completed';
    const loyaltyResult = creditLoyaltyForOrder(mockDB, order);

    res.json({
      order,
      loyalty: loyaltyResult
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
