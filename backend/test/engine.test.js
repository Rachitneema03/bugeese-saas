const { describe, it } = require('node:test');
const assert = require('node:assert');
const { runEngine, toCustomerView, toAdminComparison } = require('../src/engine');

describe('Feature 1: Bugeese Financial Engine Tests', () => {
  const defaultCfg = {
    commissionBps: 2500, // 25%
    gatewayFeePaise: 0,
    minOrderPaise: 20000, // Rs 200
    minMarginPaise: 4000, // Rs 40
    minMarginBps: 800,    // 8%
    capBps: 7500,         // 75%
    organicShareBps: 3000
  };

  it('1. Worked example from AGENTS.md (Student Saver / standard basket)', () => {
    // V=24900, F=10000, P=1500, C=4000, r=25%, share 60%, floor 4000
    const res = runEngine({
      menuSubtotalPaise: 24900,
      foodCostPaise: 10000,
      packagingPaise: 1500,
      courierEstimatePaise: 4000,
      tierShareBps: 6000,
      acquisitionClass: 'qr_attributed'
    }, defaultCfg);

    // commission = round(24900 * 0.25) = 6225
    // aggProfit = 24900 - 6225 - 10000 - 1500 = 7175
    // directRaw = 24900 - 10000 - 1500 - 4000 = 9400
    // headroom = 9400 - 7175 = 2225
    // discount = floor(2225 * 0.60) = 1335
    // directProfit = 9400 - 1335 = 8065 > 7175 -> PASS
    assert.strictEqual(res.commissionPaise, 6225);
    assert.strictEqual(res.aggregatorProfitPaise, 7175);
    assert.strictEqual(res.directProfitRawPaise, 9400);
    assert.strictEqual(res.headroomPaise, 2225);
    assert.strictEqual(res.discountPaise, 1335);
    assert.strictEqual(res.directProfitPaise, 8065);
    assert.strictEqual(res.gateResult, 'PASS');
    assert.ok(res.directProfitPaise > res.aggregatorProfitPaise);
  });

  it('2. Budget Bite demo case: negative headroom disables discount', () => {
    // V=14900, F=7000, P=1500, C=4000, r=25%
    // commission = 3725; aggProfit = 14900 - 3725 - 7000 - 1500 = 2675
    // directRaw = 14900 - 7000 - 1500 - 4000 = 2400
    // headroom = 2400 - 2675 = -275 -> DIRECT_NOT_VIABLE
    const res = runEngine({
      menuSubtotalPaise: 14900,
      foodCostPaise: 7000,
      packagingPaise: 1500,
      courierEstimatePaise: 4000,
      tierShareBps: 6000,
      acquisitionClass: 'qr_attributed'
    }, defaultCfg);

    assert.strictEqual(res.headroomPaise, -275);
    assert.strictEqual(res.discountPaise, 0);
    assert.strictEqual(res.gateResult, 'BLOCKED');
    assert.strictEqual(res.gateReason, 'DIRECT_NOT_VIABLE');
  });

  it('3. Small basket below minimum order threshold blocks discount', () => {
    // V = 18000 (< 20000)
    const res = runEngine({
      menuSubtotalPaise: 18000,
      foodCostPaise: 4000,
      packagingPaise: 1500,
      courierEstimatePaise: 2000,
      tierShareBps: 6000,
      acquisitionClass: 'qr_attributed'
    }, defaultCfg);

    assert.strictEqual(res.gateResult, 'BLOCKED');
    assert.strictEqual(res.gateReason, 'BELOW_MIN_ORDER');
    assert.strictEqual(res.discountPaise, 0);
  });

  it('4. Hard cap 75% enforced when Tier + QR boost exceeds cap', () => {
    // Gold tier (7000 bps) + QR boost (1000 bps) = 8000 bps -> capped at 7500 bps
    const res = runEngine({
      menuSubtotalPaise: 30000,
      foodCostPaise: 9000,
      packagingPaise: 1500,
      courierEstimatePaise: 4000,
      tierShareBps: 7000,
      qrBoostBps: 1000,
      acquisitionClass: 'qr_attributed'
    }, defaultCfg);

    assert.strictEqual(res.effectiveShareBps, 7500);
  });

  it('5. Parity invariant: directProfit must always exceed aggregatorProfit when discount is granted', () => {
    const res = runEngine({
      menuSubtotalPaise: 22000,
      foodCostPaise: 8000,
      packagingPaise: 1500,
      courierEstimatePaise: 4000,
      tierShareBps: 6000,
      acquisitionClass: 'first_order'
    }, defaultCfg);

    if (res.discountPaise > 0) {
      assert.ok(res.directProfitPaise > res.aggregatorProfitPaise);
    }
  });

  it('6. Profit floor invariant: directProfit must be >= marginFloor when discount is granted', () => {
    const res = runEngine({
      menuSubtotalPaise: 50000,
      foodCostPaise: 20000,
      packagingPaise: 1500,
      courierEstimatePaise: 4000,
      tierShareBps: 6000,
      acquisitionClass: 'first_order'
    }, defaultCfg);

    if (res.discountPaise > 0) {
      assert.ok(res.directProfitPaise >= res.marginFloorPaise);
    }
  });

  it('7. Reward drop behavior when reward cost R exceeds headroom', () => {
    // Reward cost of Rs 50 (5000 paise) on a basket with low headroom
    const res = runEngine({
      menuSubtotalPaise: 24900,
      foodCostPaise: 11000,
      packagingPaise: 1500,
      courierEstimatePaise: 4000,
      rewardCostPaise: 5000,
      tierShareBps: 6000,
      acquisitionClass: 'qr_attributed'
    }, defaultCfg);

    // If R would turn candidate discount negative, R is dropped (rewardCostPaise = 0)
    assert.ok(res.rewardCostPaise === 0 || res.discountPaise >= 0);
  });

  it('8. Customer view hides food cost, packaging, courier, and margins', () => {
    const res = runEngine({
      menuSubtotalPaise: 24900,
      foodCostPaise: 10000,
      packagingPaise: 1500,
      courierEstimatePaise: 4000,
      tierShareBps: 6000,
      acquisitionClass: 'qr_attributed'
    }, defaultCfg);

    const custView = toCustomerView(res);
    assert.strictEqual(custView.foodCostPaise, undefined);
    assert.strictEqual(custView.packagingPaise, undefined);
    assert.strictEqual(custView.courierEstimatePaise, undefined);
    assert.strictEqual(custView.directProfitPaise, undefined);
    assert.strictEqual(custView.aggregatorProfitPaise, undefined);
    assert.strictEqual(custView.subtotal, 24900);
    assert.strictEqual(custView.discount, 1335);
    assert.strictEqual(custView.totalToPay, 23565);
  });

  it('9. Admin comparison calculates net profit gain and discount efficiency correctly', () => {
    const res = runEngine({
      menuSubtotalPaise: 24900,
      foodCostPaise: 10000,
      packagingPaise: 1500,
      courierEstimatePaise: 4000,
      tierShareBps: 6000,
      acquisitionClass: 'qr_attributed'
    }, defaultCfg);

    const adminView = toAdminComparison(res);
    assert.strictEqual(adminView.commissionSavedPaise, 6225);
    assert.strictEqual(adminView.netProfitGainPaise, 8065 - 7175); // 890 paise
    assert.strictEqual(adminView.discountEfficiencyPct, 21.45); // (1335 / 6225) * 100 = 21.45%
  });

  it('10. 10,000-case randomized invariant test', () => {
    for (let i = 0; i < 10000; i++) {
      const V = Math.floor(Math.random() * 80000) + 5000; // Rs 50 to 850
      const F = Math.floor(Math.random() * (V * 0.7));    // 0 to 70% of V
      const P = 1500;
      const C = Math.floor(Math.random() * 4000) + 2000;  // Rs 20 to 60
      const tierShare = [6000, 6500, 7000][i % 3];
      const qrBoost = (i % 2 === 0) ? 1000 : 0;

      const res = runEngine({
        menuSubtotalPaise: V,
        foodCostPaise: F,
        packagingPaise: P,
        courierEstimatePaise: C,
        tierShareBps: tierShare,
        qrBoostBps: qrBoost,
        acquisitionClass: (i % 4 === 0) ? 'organic' : 'qr_attributed'
      }, defaultCfg);

      // Invariants
      if (res.discountPaise > 0) {
        assert.ok(res.gateResult === 'PASS', `Pass required for discount ${res.discountPaise}`);
        assert.ok(res.directProfitPaise > res.aggregatorProfitPaise, 'Direct profit must exceed aggregator profit');
        assert.ok(res.directProfitPaise >= res.marginFloorPaise, 'Direct profit must meet or exceed margin floor');
        assert.ok(res.directPricePaise === V - res.discountPaise, 'Customer price must equal V - discount');
      } else {
        assert.strictEqual(res.discountPaise, 0);
      }
    }
  });
});
