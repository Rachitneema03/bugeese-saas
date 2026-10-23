/**
 * Bugeese Tiered Direct Incentive Logic (Feature 2)
 *
 * Implements:
 * 1. Configurable Loyalty Tiers (Bronze, Silver, Gold) based on cumulative commission avoided.
 * 2. Balance calculations: Posted Lifetime Balance vs. Projected Balance for the current order.
 * 3. Base tier share and QR incentive boost calculation with strict 75% hard ceiling.
 * 4. Combos protection:
 *    - A combo passes through the engine with its designated headroom share (capped at 60% combo-headroom share cap).
 *    - Additional tier-based upgrade bonuses or QR cash discount stacking above the combo share cap can be disabled
 *      via `disableComboCashStacking: true`.
 * 5. Immutable snapshot generation for orders, quotes, and audit trails.
 * 6. Idempotent loyalty ledger posting on order completion with reversal support.
 */

// Default configurable tier definitions
const DEFAULT_TIERS = [
  {
    tier: 'bronze',
    name: 'Bronze',
    minCommissionAvoidedPaise: 0,
    shareBps: 6000 // 60% of headroom
  },
  {
    tier: 'silver',
    name: 'Silver',
    minCommissionAvoidedPaise: 50000, // Rs 500 commission avoided
    shareBps: 6500 // 65% of headroom
  },
  {
    tier: 'gold',
    name: 'Gold',
    minCommissionAvoidedPaise: 200000, // Rs 2,000 commission avoided
    shareBps: 7000 // 70% of headroom
  }
];

const DEFAULT_QR_BOOSTS = {
  first_direct: 1000, // +10% in bps
  repeat: 500         // +5% in bps
};

const HARD_CAP_BPS = 7500; // 75% maximum combined share
const COMBO_HEADROOM_CAP_BPS = 6000; // 60% headroom share cap for combos

/**
 * Resolves tier configurations from system/aggregator config record or defaults.
 *
 * @param {Object} [cfg={}]
 * @returns {Array<Object>} Sorted list of tiers by threshold ascending
 */
function getTierConfigs(cfg = {}) {
  const bronzeShare = Number(cfg.customer_share_bps_bronze ?? 6000);
  const silverShare = Number(cfg.customer_share_bps_silver ?? 6500);
  const goldShare = Number(cfg.customer_share_bps_gold ?? 7000);

  const silverThreshold = Number(cfg.tier_silver_threshold_paise ?? 50000);
  const goldThreshold = Number(cfg.tier_gold_threshold_paise ?? 200000);

  return [
    {
      tier: 'bronze',
      name: 'Bronze',
      minCommissionAvoidedPaise: 0,
      shareBps: bronzeShare
    },
    {
      tier: 'silver',
      name: 'Silver',
      minCommissionAvoidedPaise: silverThreshold,
      shareBps: silverShare
    },
    {
      tier: 'gold',
      name: 'Gold',
      minCommissionAvoidedPaise: goldThreshold,
      shareBps: goldShare
    }
  ];
}

/**
 * Calculates commission avoided for an order basket.
 * Commission avoided = menuSubtotalPaise * (commissionBps / 10000), rounded half-up.
 *
 * @param {number} menuSubtotalPaise - pre-discount menu value in integer paise
 * @param {number} commissionBps - aggregator commission rate in basis points (e.g. 2500)
 * @returns {number} commission avoided in integer paise
 */
function calculateCommissionAvoided(menuSubtotalPaise, commissionBps) {
  const V = Math.max(0, Math.round(Number(menuSubtotalPaise) || 0));
  const rate = Math.max(0, Number(commissionBps) || 0) / 10000;
  return Math.round(V * rate);
}

/**
 * Determines applicable tier from a commission-avoided balance.
 *
 * @param {number} balancePaise
 * @param {Array<Object>} tiers
 * @returns {Object} { tier: 'bronze'|'silver'|'gold', name: string, shareBps: number, minCommissionAvoidedPaise: number }
 */
function getTierForBalance(balancePaise, tiers = DEFAULT_TIERS) {
  const bal = Math.max(0, Math.round(Number(balancePaise) || 0));
  // Sort descending to find highest matching threshold
  const sorted = [...tiers].sort((a, b) => b.minCommissionAvoidedPaise - a.minCommissionAvoidedPaise);
  for (const t of sorted) {
    if (bal >= t.minCommissionAvoidedPaise) {
      return t;
    }
  }
  return tiers[0] || DEFAULT_TIERS[0];
}

/**
 * Finds the next tier above the given balance and the deficit to reach it.
 *
 * @param {number} balancePaise
 * @param {Array<Object>} tiers
 * @returns {Object|null} { nextTier, nextTierName, nextThresholdPaise, neededPaise }
 */
function getNextTierProgress(balancePaise, tiers = DEFAULT_TIERS) {
  const bal = Math.max(0, Math.round(Number(balancePaise) || 0));
  const sorted = [...tiers].sort((a, b) => a.minCommissionAvoidedPaise - b.minCommissionAvoidedPaise);
  const next = sorted.find(t => t.minCommissionAvoidedPaise > bal);
  if (!next) return null;

  return {
    nextTier: next.tier,
    nextTierName: next.name,
    nextThresholdPaise: next.minCommissionAvoidedPaise,
    neededPaise: next.minCommissionAvoidedPaise - bal
  };
}

/**
 * Evaluates QR boost eligibility.
 *
 * @param {Object} [qrInput]
 * @param {string} [qrInput.token] - Opaque QR token
 * @param {string} [qrInput.type] - 'first_direct' | 'repeat' | null
 * @param {boolean} [qrInput.isValid] - whether token is verified and active
 * @param {number} [userOrderCount=0] - number of completed direct orders for customer
 * @param {Object} [cfg={}] - active config
 * @returns {Object} { eligible: boolean, boostBps: number, reason: string|null, qrType: string|null }
 */
function evaluateQREligibility(qrInput, userOrderCount = 0, cfg = {}) {
  if (!qrInput || !qrInput.token) {
    return { eligible: false, boostBps: 0, reason: 'NO_QR', qrType: null };
  }

  if (!qrInput.isValid) {
    return { eligible: false, boostBps: 0, reason: 'QR_INVALID_OR_EXPIRED', qrType: null };
  }

  const firstDirectBoost = Number(cfg.qr_boost_first_direct_bps ?? DEFAULT_QR_BOOSTS.first_direct);
  const repeatBoost = Number(cfg.qr_boost_repeat_bps ?? DEFAULT_QR_BOOSTS.repeat);

  // Type can be explicitly provided or inferred from user history
  const isFirst = qrInput.type === 'first_direct' || (userOrderCount === 0 && qrInput.type !== 'repeat');

  if (isFirst) {
    return {
      eligible: true,
      boostBps: firstDirectBoost,
      reason: null,
      qrType: 'first_direct'
    };
  }

  return {
    eligible: true,
    boostBps: repeatBoost,
    reason: null,
    qrType: 'repeat'
  };
}

/**
 * Computes Tier and Incentive State for an order/quote.
 *
 * @param {Object} params
 * @param {number} params.menuSubtotalPaise - Pre-discount basket value
 * @param {number} [params.postedLoyaltyBalancePaise=0] - Posted balance from completed orders
 * @param {number} [params.userOrderCount=0] - Number of completed orders for customer
 * @param {boolean} [params.isCombo=false] - True if order is a student combo
 * @param {boolean} [params.disableComboCashStacking=false] - Explicit flag to disable extra tier/QR cash stacking on combos
 * @param {Object} [params.qrInput=null] - { token, type, isValid }
 * @param {string} [params.acquisitionClass='organic'] - 'qr_attributed' | 'first_order' | 'organic'
 * @param {Object} [cfg={}] - Configuration table record
 *
 * @returns {Object} Complete tiered incentive state ready for engine and customer/admin views
 */
function computeTieredIncentive(params, cfg = {}) {
  const {
    menuSubtotalPaise = 0,
    postedLoyaltyBalancePaise = 0,
    userOrderCount = 0,
    isCombo = false,
    disableComboCashStacking = false,
    qrInput = null,
    acquisitionClass = 'organic'
  } = params;

  const tiers = getTierConfigs(cfg);
  const commissionBps = Number(cfg.commission_bps ?? 2500);
  const capBps = Number(cfg.cap_bps ?? HARD_CAP_BPS);

  // 1. Commission avoided for this specific basket (earned towards loyalty upon completion)
  const orderCommissionAvoidedPaise = calculateCommissionAvoided(menuSubtotalPaise, commissionBps);

  // 2. Loyalty Balances: Posted vs Projected
  const postedBalance = Math.max(0, Math.round(Number(postedLoyaltyBalancePaise) || 0));
  const projectedBalance = postedBalance + orderCommissionAvoidedPaise;

  // 3. Determine Posted Tier and Projected Tier
  const postedTierObj = getTierForBalance(postedBalance, tiers);
  const projectedTierObj = getTierForBalance(projectedBalance, tiers);

  // Policy: Current quote receives the projected tier if the order qualifies
  const applicableTierObj = projectedTierObj;
  const isTierUpgrade = projectedTierObj.tier !== postedTierObj.tier;

  // Next tier progress
  const postedProgress = getNextTierProgress(postedBalance, tiers);
  const projectedProgress = getNextTierProgress(projectedBalance, tiers);

  // 4. Base Tier Share
  const baseTierShareBps = applicableTierObj.shareBps;

  // 5. QR Boost Evaluation
  const qrResult = evaluateQREligibility(qrInput, userOrderCount, cfg);

  // 6. Effective share calculation & Combo compatibility
  let effectiveTierShareBps = baseTierShareBps;
  let effectiveQrBoostBps = qrResult.boostBps;
  let stackingDisabled = false;

  if (isCombo) {
    if (disableComboCashStacking) {
      // Disables additional cash discount stacking
      stackingDisabled = true;
      effectiveTierShareBps = 0;
      effectiveQrBoostBps = 0;
    } else {
      // Combos use combo headroom cap (6000 bps) and do NOT stack higher tier (Silver/Gold) or QR boosts
      stackingDisabled = true;
      effectiveTierShareBps = Math.min(baseTierShareBps, COMBO_HEADROOM_CAP_BPS);
      effectiveQrBoostBps = 0; // No stacking extra QR cash discount on combo
    }
  } else if (acquisitionClass === 'organic' && !qrResult.eligible) {
    // For organic customers without QR, organic_share_bps applies
    const organicShareBps = Number(cfg.organic_share_bps ?? 3000);
    effectiveTierShareBps = organicShareBps;
    effectiveQrBoostBps = 0;
  }

  const combinedShareBps = Math.min(effectiveTierShareBps + effectiveQrBoostBps, capBps);

  return {
    postedBalancePaise: postedBalance,
    projectedBalancePaise: projectedBalance,
    orderCommissionAvoidedPaise,
    postedTier: postedTierObj.tier,
    projectedTier: projectedTierObj.tier,
    applicableTier: applicableTierObj.tier,
    isTierUpgrade,
    postedProgress,
    projectedProgress,
    baseTierShareBps: applicableTierObj.shareBps,
    qrEligible: qrResult.eligible,
    qrBoostBps: qrResult.boostBps,
    qrType: qrResult.qrType,
    qrReason: qrResult.reason,
    isCombo,
    stackingDisabled,
    effectiveTierShareBps,
    effectiveQrBoostBps,
    combinedShareBps,
    capBps
  };
}

/**
 * Builds an immutable audit snapshot for an order or quote.
 *
 * @param {Object} tierState - Output from computeTieredIncentive
 * @param {Object} engineResult - Output from Feature 1 runEngine
 * @param {Object} [meta={}] - Additional context (user_id, fulfilment, config_version_id, etc.)
 * @returns {Object} Complete immutable snapshot
 */
function createOrderSnapshot(tierState, engineResult, meta = {}) {
  return {
    config_version_id: meta.config_version_id || 1,
    user_id: meta.user_id || null,
    fulfilment_mode: meta.fulfilment_mode || 'delivery',
    menu_subtotal_paise: engineResult.menuSubtotalPaise,
    commission_bps: meta.commission_bps || 2500,
    commission_avoided_paise: tierState.orderCommissionAvoidedPaise,
    posted_loyalty_balance_paise: tierState.postedBalancePaise,
    projected_loyalty_balance_paise: tierState.projectedBalancePaise,
    posted_tier: tierState.postedTier,
    applicable_tier: tierState.applicableTier,
    is_tier_upgrade: tierState.isTierUpgrade,
    base_tier_share_bps: tierState.baseTierShareBps,
    qr_boost_bps: tierState.qrBoostBps,
    combined_share_bps: tierState.combinedShareBps,
    is_combo: tierState.isCombo,
    stacking_disabled: tierState.stackingDisabled,
    aggregator_profit_paise: engineResult.aggregatorProfitPaise,
    direct_profit_raw_paise: engineResult.directProfitRawPaise,
    headroom_paise: engineResult.headroomPaise,
    margin_floor_paise: engineResult.marginFloorPaise,
    discount_paise: engineResult.discountPaise,
    reward_cost_paise: engineResult.rewardCostPaise,
    direct_price_paise: engineResult.directPricePaise,
    direct_profit_paise: engineResult.directProfitPaise,
    courier_estimated_paise: engineResult.courierEstimatePaise,
    gate_result: engineResult.gateResult,
    gate_reason: engineResult.gateReason,
    created_at: meta.created_at || new Date().toISOString()
  };
}

/**
 * Formats customer-facing loyalty and tier summary.
 * Hides all sensitive kitchen costs, margins, and aggregator figures.
 *
 * @param {Object} tierState
 * @param {Object} engineResult
 * @returns {Object}
 */
function toCustomerTierView(tierState, engineResult) {
  const tierName = tierState.applicableTier.charAt(0).toUpperCase() + tierState.applicableTier.slice(1);
  const postedTierName = tierState.postedTier.charAt(0).toUpperCase() + tierState.postedTier.slice(1);

  let message = `Your current tier is ${postedTierName}.`;
  let progressText = null;

  if (tierState.postedProgress) {
    const neededRs = (tierState.postedProgress.neededPaise / 100).toFixed(0);
    progressText = `₹${neededRs} commission avoided toward ${tierState.postedProgress.nextTierName}.`;
  }

  let projectedUpgradeMessage = null;
  if (tierState.isTierUpgrade) {
    projectedUpgradeMessage = `Complete this order to reach ${tierName}!`;
  }

  let comboMessage = null;
  if (tierState.isCombo && tierState.stackingDisabled) {
    comboMessage = 'This combo already includes direct-order savings. Additional tier and QR cash discounts do not apply.';
  }

  return {
    currentTier: tierState.postedTier,
    currentTierName: postedTierName,
    applicableTier: tierState.applicableTier,
    applicableTierName: tierName,
    isTierUpgrade: tierState.isTierUpgrade,
    postedBalancePaise: tierState.postedBalancePaise,
    projectedBalancePaise: tierState.projectedBalancePaise,
    orderCommissionAvoidedPaise: tierState.orderCommissionAvoidedPaise,
    progressText,
    projectedUpgradeMessage,
    comboMessage,
    tierMessage: message,
    qrBoostApplied: tierState.qrBoostBps > 0 && !tierState.isCombo,
    qrBoostPercent: tierState.qrBoostBps / 100,
    discountPaise: engineResult.discountPaise,
    totalToPayPaise: engineResult.directPricePaise
  };
}

/**
 * Loyalty Ledger helper: idempotent credit posting upon order completion.
 *
 * @param {Object} store - Storage provider (mockDB or DB client)
 * @param {Object} order - Completed order record with snapshot
 * @returns {Object} { success: boolean, ledgerEntry: Object, alreadyCredited: boolean }
 */
function creditLoyaltyForOrder(store, order) {
  if (!order || order.status !== 'completed') {
    throw new Error('Loyalty credit can only be granted on completed orders.');
  }

  const userId = order.user_id;
  if (!userId) {
    return { success: false, reason: 'ANONYMOUS_ORDER_NO_USER' };
  }

  const orderId = order.id;
  const commissionAvoidedPaise = order.financial_snapshot?.commission_avoided_paise ||
    calculateCommissionAvoided(order.menu_subtotal_paise, 2500);

  // Check unique idempotency constraint: (order_id, entry_type)
  const existing = (store.loyalty_ledger || []).find(
    e => e.order_id === orderId && e.entry_type === 'credit'
  );

  if (existing) {
    return { success: true, ledgerEntry: existing, alreadyCredited: true };
  }

  const newEntry = {
    id: `loyalty_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    order_id: orderId,
    commission_avoided_paise: commissionAvoidedPaise,
    entry_type: 'credit',
    created_at: new Date().toISOString()
  };

  store.loyalty_ledger.push(newEntry);
  return { success: true, ledgerEntry: newEntry, alreadyCredited: false };
}

/**
 * Loyalty Ledger helper: reversal on refunded/cancelled-after-completion order.
 *
 * @param {Object} store - Storage provider
 * @param {string} orderId
 * @param {string} userId
 * @returns {Object}
 */
function reverseLoyaltyForOrder(store, orderId, userId) {
  const creditEntry = (store.loyalty_ledger || []).find(
    e => e.order_id === orderId && e.entry_type === 'credit'
  );

  if (!creditEntry) {
    return { success: false, reason: 'NO_CREDIT_ENTRY_TO_REVERSE' };
  }

  const existingReversal = store.loyalty_ledger.find(
    e => e.order_id === orderId && e.entry_type === 'reversal'
  );

  if (existingReversal) {
    return { success: true, ledgerEntry: existingReversal, alreadyReversed: true };
  }

  const reversalEntry = {
    id: `reversal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    order_id: orderId,
    commission_avoided_paise: -creditEntry.commission_avoided_paise,
    entry_type: 'reversal',
    created_at: new Date().toISOString()
  };

  store.loyalty_ledger.push(reversalEntry);
  return { success: true, ledgerEntry: reversalEntry, alreadyReversed: false };
}

/**
 * Calculates current posted loyalty balance for a user from the ledger.
 * Balance = sum of credits + sum of reversals (never a stored running total).
 *
 * @param {Object} store
 * @param {string} userId
 * @returns {number} Balance in integer paise
 */
function getUserLoyaltyBalance(store, userId) {
  if (!userId || !store.loyalty_ledger) return 0;
  return store.loyalty_ledger
    .filter(e => e.user_id === userId)
    .reduce((sum, e) => sum + Number(e.commission_avoided_paise || 0), 0);
}

module.exports = {
  DEFAULT_TIERS,
  DEFAULT_QR_BOOSTS,
  HARD_CAP_BPS,
  COMBO_HEADROOM_CAP_BPS,
  getTierConfigs,
  calculateCommissionAvoided,
  getTierForBalance,
  getNextTierProgress,
  evaluateQREligibility,
  computeTieredIncentive,
  createOrderSnapshot,
  toCustomerTierView,
  creditLoyaltyForOrder,
  reverseLoyaltyForOrder,
  getUserLoyaltyBalance
};
