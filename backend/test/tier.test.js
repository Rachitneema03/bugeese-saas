const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  DEFAULT_TIERS,
  DEFAULT_QR_BOOSTS,
  HARD_CAP_BPS,
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
} = require('../src/tieredIncentive');
const { runEngine } = require('../src/engine');
const { testConfig } = require('../src/seedData');

describe('Feature 2: Tiered Direct Incentive Logic & Loyalty Ledger Tests', () => {

  it('1. A customer with no history receives the configured entry tier (Bronze at 60% share)', () => {
    const tier = getTierForBalance(0);
    assert.strictEqual(tier.tier, 'bronze');
    assert.strictEqual(tier.shareBps, 6000);
  });

  it('2. A Bronze customer receives the configured Bronze share (6000 bps)', () => {
    const state = computeTieredIncentive({
      menuSubtotalPaise: 24900,
      postedLoyaltyBalancePaise: 10000, // below 50000 Silver threshold
      acquisitionClass: 'qr_attributed'
    }, testConfig);

    assert.strictEqual(state.postedTier, 'bronze');
    assert.strictEqual(state.baseTierShareBps, 6000);
    assert.strictEqual(state.effectiveTierShareBps, 6000);
  });

  it('3. A Silver customer receives the configured Silver share (6500 bps)', () => {
    const state = computeTieredIncentive({
      menuSubtotalPaise: 24900,
      postedLoyaltyBalancePaise: 60000, // >= 50000 Silver threshold
      acquisitionClass: 'qr_attributed'
    }, testConfig);

    assert.strictEqual(state.postedTier, 'silver');
    assert.strictEqual(state.applicableTier, 'silver');
    assert.strictEqual(state.effectiveTierShareBps, 6500);
  });

  it('4. A Gold customer receives the configured Gold share (7000 bps)', () => {
    const state = computeTieredIncentive({
      menuSubtotalPaise: 24900,
      postedLoyaltyBalancePaise: 250000, // >= 200000 Gold threshold
      acquisitionClass: 'qr_attributed'
    }, testConfig);

    assert.strictEqual(state.postedTier, 'gold');
    assert.strictEqual(state.applicableTier, 'gold');
    assert.strictEqual(state.effectiveTierShareBps, 7000);
  });

  it('5. An eligible first-direct QR adds 10 percentage points (1000 bps)', () => {
    const qrResult = evaluateQREligibility({ token: 'qr_tok_123', isValid: true }, 0, testConfig);
    assert.strictEqual(qrResult.eligible, true);
    assert.strictEqual(qrResult.boostBps, 1000);
    assert.strictEqual(qrResult.qrType, 'first_direct');
  });

  it('6. An eligible repeat QR adds 5 percentage points (500 bps)', () => {
    const qrResult = evaluateQREligibility({ token: 'qr_tok_456', isValid: true }, 2, testConfig);
    assert.strictEqual(qrResult.eligible, true);
    assert.strictEqual(qrResult.boostBps, 500);
    assert.strictEqual(qrResult.qrType, 'repeat');
  });

  it('7. The combined tier and QR share never exceeds 75% (7500 bps)', () => {
    // Gold (7000 bps) + First Direct QR (1000 bps) = 8000 bps -> capped at 7500 bps
    const state = computeTieredIncentive({
      menuSubtotalPaise: 24900,
      postedLoyaltyBalancePaise: 250000, // Gold
      userOrderCount: 0,
      qrInput: { token: 'qr_boost_gold', isValid: true },
      acquisitionClass: 'qr_attributed'
    }, testConfig);

    assert.strictEqual(state.applicableTier, 'gold');
    assert.strictEqual(state.baseTierShareBps, 7000);
    assert.strictEqual(state.qrBoostBps, 1000);
    assert.strictEqual(state.combinedShareBps, 7500);
  });

  it('8. Current order crossing a tier threshold qualifies for projected tier upgrade during checkout', () => {
    // Posted balance 45000 (Bronze). Order 24900 at 25% commission avoids 6225 paise.
    // Projected = 45000 + 6225 = 51225 >= 50000 (Silver threshold)
    const state = computeTieredIncentive({
      menuSubtotalPaise: 24900,
      postedLoyaltyBalancePaise: 45000,
      acquisitionClass: 'qr_attributed'
    }, testConfig);

    assert.strictEqual(state.postedTier, 'bronze');
    assert.strictEqual(state.projectedTier, 'silver');
    assert.strictEqual(state.applicableTier, 'silver');
    assert.strictEqual(state.isTierUpgrade, true);
    assert.strictEqual(state.effectiveTierShareBps, 6500);
  });

  it('9. Projected tier progress does not permanently credit the ledger before completion', () => {
    const mockStore = { loyalty_ledger: [] };
    const initialBal = getUserLoyaltyBalance(mockStore, 'user_test_1');
    assert.strictEqual(initialBal, 0);

    // Run quote calculation
    computeTieredIncentive({
      menuSubtotalPaise: 50000,
      postedLoyaltyBalancePaise: initialBal,
      acquisitionClass: 'qr_attributed'
    }, testConfig);

    // Ledger must remain untouched
    const afterQuoteBal = getUserLoyaltyBalance(mockStore, 'user_test_1');
    assert.strictEqual(afterQuoteBal, 0);
    assert.strictEqual(mockStore.loyalty_ledger.length, 0);
  });

  it('10. A completed qualifying order credits commission avoided exactly once', () => {
    const mockStore = { loyalty_ledger: [] };
    const order = {
      id: 'ord_complete_1',
      user_id: 'user_1',
      status: 'completed',
      menu_subtotal_paise: 24900,
      financial_snapshot: { commission_avoided_paise: 6225 }
    };

    const result = creditLoyaltyForOrder(mockStore, order);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.alreadyCredited, false);
    assert.strictEqual(getUserLoyaltyBalance(mockStore, 'user_1'), 6225);
  });

  it('11. A repeated completion event does not duplicate the credit (idempotency)', () => {
    const mockStore = { loyalty_ledger: [] };
    const order = {
      id: 'ord_dup_1',
      user_id: 'user_1',
      status: 'completed',
      menu_subtotal_paise: 24900,
      financial_snapshot: { commission_avoided_paise: 6225 }
    };

    const first = creditLoyaltyForOrder(mockStore, order);
    const second = creditLoyaltyForOrder(mockStore, order);

    assert.strictEqual(first.alreadyCredited, false);
    assert.strictEqual(second.alreadyCredited, true);
    assert.strictEqual(mockStore.loyalty_ledger.length, 1);
    assert.strictEqual(getUserLoyaltyBalance(mockStore, 'user_1'), 6225);
  });

  it('12. A failed or cancelled order does not earn a qualifying credit', () => {
    const mockStore = { loyalty_ledger: [] };
    const placedOrder = {
      id: 'ord_placed_1',
      user_id: 'user_1',
      status: 'placed',
      menu_subtotal_paise: 24900
    };

    assert.throws(() => {
      creditLoyaltyForOrder(mockStore, placedOrder);
    }, /completed orders/);

    assert.strictEqual(mockStore.loyalty_ledger.length, 0);
  });

  it('13. An invalid or expired QR does not receive a boost', () => {
    const qrResult = evaluateQREligibility({ token: 'expired_qr', isValid: false }, 0, testConfig);
    assert.strictEqual(qrResult.eligible, false);
    assert.strictEqual(qrResult.boostBps, 0);
    assert.strictEqual(qrResult.reason, 'QR_INVALID_OR_EXPIRED');

    const state = computeTieredIncentive({
      menuSubtotalPaise: 24900,
      postedLoyaltyBalancePaise: 0,
      qrInput: { token: 'expired_qr', isValid: false },
      acquisitionClass: 'qr_attributed'
    }, testConfig);

    assert.strictEqual(state.qrEligible, false);
    assert.strictEqual(state.effectiveQrBoostBps, 0);
    assert.strictEqual(state.combinedShareBps, 6000); // Only base Bronze
  });

  it('14. A combo does not receive an extra tier or QR cash discount (cash stacking disabled)', () => {
    const state = computeTieredIncentive({
      menuSubtotalPaise: 24900,
      postedLoyaltyBalancePaise: 250000, // Gold customer
      isCombo: true,
      disableComboCashStacking: true,
      qrInput: { token: 'qr_valid', isValid: true },
      acquisitionClass: 'qr_attributed'
    }, testConfig);

    assert.strictEqual(state.isCombo, true);
    assert.strictEqual(state.stackingDisabled, true);
    assert.strictEqual(state.combinedShareBps, 0); // extra discount disabled
  });

  it('15. A combo still earns loyalty commission avoided towards future tier progress', () => {
    const state = computeTieredIncentive({
      menuSubtotalPaise: 24900,
      postedLoyaltyBalancePaise: 0,
      isCombo: true
    }, testConfig);

    assert.strictEqual(state.orderCommissionAvoidedPaise, 6225);
    assert.strictEqual(state.projectedBalancePaise, 6225);
  });

  it('16. Reversal on order cancellation correctly reverses loyalty balance', () => {
    const mockStore = { loyalty_ledger: [] };
    const order = {
      id: 'ord_rev_1',
      user_id: 'user_1',
      status: 'completed',
      menu_subtotal_paise: 24900,
      financial_snapshot: { commission_avoided_paise: 6225 }
    };

    creditLoyaltyForOrder(mockStore, order);
    assert.strictEqual(getUserLoyaltyBalance(mockStore, 'user_1'), 6225);

    const rev = reverseLoyaltyForOrder(mockStore, 'ord_rev_1', 'user_1');
    assert.strictEqual(rev.success, true);
    assert.strictEqual(getUserLoyaltyBalance(mockStore, 'user_1'), 0);
  });

  it('17. A tier incentive passes through Feature 1 and respects the profit floor and parity', () => {
    const state = computeTieredIncentive({
      menuSubtotalPaise: 24900,
      postedLoyaltyBalancePaise: 250000, // Gold (7000 bps)
      acquisitionClass: 'qr_attributed'
    }, testConfig);

    const engineConfig = {
      commissionBps: testConfig.commission_bps,
      gatewayFeePaise: testConfig.gateway_fee_flat_paise,
      minOrderPaise: testConfig.min_order_for_discount_paise,
      minMarginPaise: testConfig.min_margin_paise,
      minMarginBps: testConfig.min_margin_bps,
      capBps: testConfig.cap_bps
    };

    const calcResult = runEngine({
      menuSubtotalPaise: 24900,
      foodCostPaise: 10000,
      packagingPaise: 1500,
      courierEstimatePaise: 4000,
      tierShareBps: state.effectiveTierShareBps,
      qrBoostBps: state.effectiveQrBoostBps,
      acquisitionClass: 'qr_attributed'
    }, engineConfig);

    assert.strictEqual(calcResult.gateResult, 'PASS');
    assert.ok(calcResult.directProfitPaise > calcResult.aggregatorProfitPaise);
    assert.ok(calcResult.directProfitPaise >= calcResult.marginFloorPaise);
  });

  it('18. Customer tier view provides clean safe copy and hides sensitive margins', () => {
    const state = computeTieredIncentive({
      menuSubtotalPaise: 24900,
      postedLoyaltyBalancePaise: 45000, // Bronze -> Silver upgrade
      acquisitionClass: 'qr_attributed'
    }, testConfig);

    const calcResult = {
      discountPaise: 1446,
      directPricePaise: 23454
    };

    const view = toCustomerTierView(state, calcResult);
    assert.strictEqual(view.currentTier, 'bronze');
    assert.strictEqual(view.applicableTier, 'silver');
    assert.strictEqual(view.isTierUpgrade, true);
    assert.strictEqual(view.projectedUpgradeMessage, 'Complete this order to reach Silver!');
    assert.strictEqual(view.totalToPayPaise, 23454);
    assert.strictEqual(view.foodCostPaise, undefined); // Sensitive data withheld
  });

  it('19. Order snapshot preserves complete audit trail for compliance', () => {
    const state = computeTieredIncentive({
      menuSubtotalPaise: 24900,
      postedLoyaltyBalancePaise: 0,
      acquisitionClass: 'qr_attributed'
    }, testConfig);

    const calcResult = {
      menuSubtotalPaise: 24900,
      aggregatorProfitPaise: 7175,
      directProfitRawPaise: 9400,
      headroomPaise: 2225,
      marginFloorPaise: 4000,
      discountPaise: 1335,
      rewardCostPaise: 0,
      directPricePaise: 23565,
      directProfitPaise: 8065,
      courierEstimatePaise: 4000,
      gateResult: 'PASS',
      gateReason: null
    };

    const snapshot = createOrderSnapshot(state, calcResult, { user_id: 'u123' });
    assert.strictEqual(snapshot.user_id, 'u123');
    assert.strictEqual(snapshot.commission_avoided_paise, 6225);
    assert.strictEqual(snapshot.applicable_tier, 'bronze');
    assert.strictEqual(snapshot.gate_result, 'PASS');
  });

  it('20. Fail-closed behavior: negative headroom basket disables discount even for Gold tier', () => {
    // Budget Bite combo (V=14900, F=7000)
    const state = computeTieredIncentive({
      menuSubtotalPaise: 14900,
      postedLoyaltyBalancePaise: 250000, // Gold customer
      acquisitionClass: 'qr_attributed'
    }, testConfig);

    const engineConfig = {
      commissionBps: testConfig.commission_bps,
      gatewayFeePaise: testConfig.gateway_fee_flat_paise,
      minOrderPaise: testConfig.min_order_for_discount_paise,
      minMarginPaise: testConfig.min_margin_paise,
      minMarginBps: testConfig.min_margin_bps,
      capBps: testConfig.cap_bps
    };

    const calcResult = runEngine({
      menuSubtotalPaise: 14900,
      foodCostPaise: 7000,
      packagingPaise: 1500,
      courierEstimatePaise: 4000,
      tierShareBps: state.effectiveTierShareBps,
      qrBoostBps: state.effectiveQrBoostBps,
      acquisitionClass: 'qr_attributed'
    }, engineConfig);

    assert.strictEqual(calcResult.gateResult, 'BLOCKED');
    assert.strictEqual(calcResult.discountPaise, 0);
  });

});
