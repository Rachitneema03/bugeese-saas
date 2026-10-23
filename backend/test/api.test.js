const { describe, it } = require('node:test');
const assert = require('node:assert');
const app = require('../src/server');

describe('API Integration Tests (Backend + Database/Mock Engine)', () => {
  let server;
  const port = 5001;

  it('1. Server starts and responds to /api/health', async () => {
    await new Promise((resolve) => {
      server = app.listen(port, resolve);
    });

    const res = await fetch(`http://localhost:${port}/api/health`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'ok');
  });

  it('2. GET /api/combos returns student combos, withholds margins from customers', async () => {
    const res = await fetch(`http://localhost:${port}/api/combos`);
    const combos = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(combos.length >= 3);
    // Ensure food cost and margins are omitted for customer security
    assert.strictEqual(combos[0].food_cost_paise, undefined);
    assert.strictEqual(combos[0].contribution_margin_pct, undefined);
  });

  it('3. GET /api/combos?admin=true reveals contribution margins', async () => {
    const res = await fetch(`http://localhost:${port}/api/combos?admin=true`);
    const combos = await res.json();
    assert.strictEqual(res.status, 200);
    const studentSaver = combos.find(c => c.name.includes('Student Saver'));
    assert.ok(studentSaver);
    assert.strictEqual(studentSaver.food_cost_paise, 8900);
    assert.ok(studentSaver.contribution_margin_pct > 0);
  });

  it('4. POST /api/orders/quote calculates discount for Student Saver combo', async () => {
    const res = await fetch(`http://localhost:${port}/api/orders/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ combo_id: 1, qty: 1 }],
        acquisition_class: 'qr_attributed',
        tier: 'bronze'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.quote_id);
    assert.strictEqual(data.customer_view.subtotal, 24900);
    assert.strictEqual(data.customer_view.discount, 1335); // 60% of 2225 headroom
    assert.strictEqual(data.customer_view.totalToPay, 23565);
    assert.strictEqual(data.admin_comparison.commissionSavedPaise, 6225);
    assert.strictEqual(data.admin_comparison.gateResult, 'PASS');
  });

  it('5. POST /api/orders/quote disables discount for Budget Bite demo combo', async () => {
    const res = await fetch(`http://localhost:${port}/api/orders/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ combo_id: 3, qty: 1 }], // Budget Bite: Rs 149, negative headroom
        acquisition_class: 'qr_attributed'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.customer_view.discount, 0);
    assert.strictEqual(data.admin_comparison.gateResult, 'BLOCKED');
    assert.strictEqual(data.admin_comparison.gateReason, 'DIRECT_NOT_VIABLE');
  });

  it('Close server after tests', async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
