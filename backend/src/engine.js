/**
 * Bugeese Financial Engine (Feature 1)
 * 
 * Rules from AGENTS.md:
 * 1. Pure vegetarian guardrail
 * 2. ALL money = integer paise (never float)
 * 3. Commission rounds half-up to paisa (Math.round)
 * 4. Discount ALWAYS rounds down (Math.floor)
 * 5. Strict guard order:
 *    - Guard 1: headroom <= 0 -> DIRECT_NOT_VIABLE
 *    - Guard 2: V < minOrderPaise -> BELOW_MIN_ORDER
 *    - Guard 3: Share cap (min(share, capBps))
 *    - Guard 4: Strict parity: directProfit after discount & reward > aggregatorProfit
 *    - Guard 5: Floor: directProfit after discount & reward >= marginFloor
 * 6. Dropping reward if R makes discount negative, then recomputing.
 */

/**
 * Runs the financial engine calculation for an order.
 *
 * @param {Object} input
 * @param {number} input.menuSubtotalPaise - V: menu basket subtotal in paise
 * @param {number} input.foodCostPaise - F: total food cost in paise
 * @param {number} [input.packagingPaise=1500] - P: packaging flat fee in paise
 * @param {number} [input.courierEstimatePaise=4000] - C: courier fee estimate in paise
 * @param {number} [input.tierShareBps=6000] - Base tier headroom share in bps (60% = 6000)
 * @param {number} [input.qrBoostBps=0] - QR boost in bps (+10% = 1000)
 * @param {number} [input.rewardCostPaise=0] - R: perk/reward cost in paise
 * @param {string} [input.acquisitionClass='organic'] - 'qr_attributed' | 'first_order' | 'lapsed' | 'organic'
 *
 * @param {Object} cfg - Configuration values (from aggregator_config / system_config)
 * @param {number} cfg.commissionBps - Aggregator commission in bps (e.g. 2500 for 25%)
 * @param {number} [cfg.gatewayFeePaise=0] - Payment gateway flat fee in paise (default 0)
 * @param {number} [cfg.minOrderPaise=20000] - Min order for discount (Rs 200 = 20000 paise)
 * @param {number} [cfg.minMarginPaise=4000] - Absolute min profit floor in paise (Rs 40)
 * @param {number} [cfg.minMarginBps=800] - Relative min profit floor (8% = 800 bps)
 * @param {number} [cfg.capBps=7500] - Hard cap on customer share (75% = 7500 bps)
 * @param {number} [cfg.organicShareBps=3000] - Share for habitual direct customers (30% = 3000 bps)
 *
 * @returns {Object} Engine calculation result
 */
function runEngine(input, cfg) {
  const V = Math.round(Number(input.menuSubtotalPaise));
  const F = Math.round(Number(input.foodCostPaise));
  const P = Math.round(Number(input.packagingPaise ?? 1500));
  const C = Math.round(Number(input.courierEstimatePaise ?? 4000));
  const G = Math.round(Number(cfg.gatewayFeePaise ?? 0));
  const r = Number(cfg.commissionBps) / 10000;
  
  // 1. Commission & Aggregator baseline
  // commission = round(V * r)
  const commissionPaise = Math.round(V * r);
  // aggregator delivers: no courier, no gateway
  const aggregatorProfitPaise = V - commissionPaise - F - P;

  // 2. Direct raw profit before discount
  const directProfitRawPaise = V - F - P - C - G;
  const headroomPaise = directProfitRawPaise - aggregatorProfitPaise;

  // 3. Margin floor calculation
  const minMarginPaise = Number(cfg.minMarginPaise ?? 4000);
  const minMarginBps = Number(cfg.minMarginBps ?? 800);
  const marginFloorPaise = Math.max(
    minMarginPaise,
    Math.floor((V * minMarginBps) / 10000)
  );

  // 4. Effective customer share determination
  const capBps = Number(cfg.capBps ?? 7500);
  let requestedShareBps;
  if (input.acquisitionClass === 'organic') {
    requestedShareBps = Number(cfg.organicShareBps ?? 3000);
  } else {
    const tierShareBps = Number(input.tierShareBps ?? 6000);
    const qrBoostBps = Number(input.qrBoostBps ?? 0);
    requestedShareBps = tierShareBps + qrBoostBps;
  }
  const effectiveShareBps = Math.min(requestedShareBps, capBps);
  const share = effectiveShareBps / 10000;

  // Determine reward cost R
  let rewardCostPaise = Math.round(Number(input.rewardCostPaise ?? 0));

  // Base output helper
  const makeOutput = (discountPaise, gateResult, gateReason, rewardUsed) => {
    const finalDiscount = Math.max(0, Math.floor(discountPaise));
    const directPricePaise = V - finalDiscount;
    const directProfitPaise = directPricePaise - F - P - C - G - rewardUsed;

    return {
      menuSubtotalPaise: V,
      foodCostPaise: F,
      packagingPaise: P,
      courierEstimatePaise: C,
      gatewayFeePaise: G,
      commissionPaise,
      aggregatorProfitPaise,
      directProfitRawPaise,
      headroomPaise,
      effectiveShareBps,
      marginFloorPaise,
      discountPaise: finalDiscount,
      rewardCostPaise: rewardUsed,
      directPricePaise,
      directProfitPaise,
      gateResult, // 'PASS' | 'BLOCKED'
      gateReason  // null | 'DIRECT_NOT_VIABLE' | 'BELOW_MIN_ORDER' | 'MARGIN_FLOOR_BREACH' | 'PARITY_BREACH'
    };
  };

  // Guard 1: Headroom <= 0 -> direct route not economical
  if (headroomPaise <= 0) {
    return makeOutput(0, 'BLOCKED', 'DIRECT_NOT_VIABLE', 0);
  }

  // Guard 2: Order below minimum threshold
  const minOrderPaise = Number(cfg.minOrderPaise ?? 20000);
  if (V < minOrderPaise) {
    return makeOutput(0, 'BLOCKED', 'BELOW_MIN_ORDER', 0);
  }

  // Calculate discount candidates respecting Strict Parity & Floor
  // Discount = max(0, min(floor(headroom * share), directRaw - R - aggProfit - 1, directRaw - R - marginFloor))
  const computeDiscount = (rCost) => {
    const fromShare = Math.floor(headroomPaise * share);
    const maxForParity = directProfitRawPaise - rCost - aggregatorProfitPaise - 1;
    const maxForFloor = directProfitRawPaise - rCost - marginFloorPaise;
    return Math.min(fromShare, maxForParity, maxForFloor);
  };

  let candidateDiscount = computeDiscount(rewardCostPaise);

  // If candidate is negative with reward included, DROP the reward (R=0) and recompute
  if (candidateDiscount < 0 && rewardCostPaise > 0) {
    rewardCostPaise = 0;
    candidateDiscount = computeDiscount(0);
  }

  if (candidateDiscount <= 0) {
    // Determine which constraint blocked the discount
    const fromShare = Math.floor(headroomPaise * share);
    const maxForParity = directProfitRawPaise - aggregatorProfitPaise - 1;
    const maxForFloor = directProfitRawPaise - marginFloorPaise;

    let reason = 'MARGIN_FLOOR_BREACH';
    if (maxForParity < maxForFloor && maxForParity <= 0) {
      reason = 'PARITY_BREACH';
    }
    return makeOutput(0, 'BLOCKED', reason, 0);
  }

  return makeOutput(candidateDiscount, 'PASS', null, rewardCostPaise);
}

/**
 * Returns safe view for customers. Never leaks food costs, packaging, courier, or margins.
 */
function toCustomerView(res) {
  const isBlocked = res.gateResult === 'BLOCKED';
  let bannerMessage = null;

  if (isBlocked) {
    if (res.gateReason === 'BELOW_MIN_ORDER') {
      const deficitPaise = 20000 - res.menuSubtotalPaise;
      bannerMessage = `Add ₹${(deficitPaise / 100).toFixed(2)} to unlock direct savings!`;
    } else {
      bannerMessage = 'Direct ordering discount unavailable for this item combination.';
    }
  } else {
    bannerMessage = `You saved ₹${(res.discountPaise / 100).toFixed(2)} by ordering direct!`;
  }

  return {
    subtotal: res.menuSubtotalPaise,
    discount: res.discountPaise,
    totalToPay: res.directPricePaise,
    rewardIncluded: res.rewardCostPaise > 0,
    bannerMessage
  };
}

/**
 * Side-by-side comparison for Admin savings dashboard and acceptance demo.
 */
function toAdminComparison(res) {
  const profitGainPaise = res.directProfitPaise - res.aggregatorProfitPaise;
  const commissionSavedPaise = res.commissionPaise;
  const totalIncentiveCostPaise = res.discountPaise + res.rewardCostPaise;
  const discountEfficiencyPct = commissionSavedPaise > 0
    ? Number(((totalIncentiveCostPaise / commissionSavedPaise) * 100).toFixed(2))
    : 0;

  return {
    menuSubtotalPaise: res.menuSubtotalPaise,
    aggregatorChannel: {
      commissionChargedPaise: res.commissionPaise,
      netProfitPaise: res.aggregatorProfitPaise
    },
    directChannel: {
      courierCostPaise: res.courierEstimatePaise,
      discountGivenPaise: res.discountPaise,
      rewardCostPaise: res.rewardCostPaise,
      netProfitPaise: res.directProfitPaise
    },
    headroomPaise: res.headroomPaise,
    netProfitGainPaise: profitGainPaise,
    commissionSavedPaise,
    discountEfficiencyPct,
    gateResult: res.gateResult,
    gateReason: res.gateReason
  };
}

module.exports = {
  runEngine,
  toCustomerView,
  toAdminComparison
};
