# Bugeese: Commission-Optimized Direct Ordering Engine
Context file for AI coding agents. Read fully before writing code. Treat this as the source of truth.

## 1. What we are building
Bugeese is a PURE VEGETARIAN restaurant known for indulgent veg burgers. Hackathon: Techsprint Crisis Adaptation Brief, Team 04, Bizznnovate 2026, IIPS DAVV Indore. The whole build must fit a 9-hour window.

Crisis: monthly sales fell from Rs 8-10 lakh to Rs 4 lakh, aggregator orders fell 50%, dine-in fell 60%, against cheaper AI-run veg competitors.
Required adaptation: use existing channel economics (aggregators take ~22-30% commission) to protect per-order profit and move repeat customers to DIRECT ordering, WITHOUT an unsustainable blanket discount.

Core idea: when a customer orders direct, Bugeese avoids aggregator commission but pays its own courier. Compute the real extra profit ("headroom") and share part of it with the customer as a discount, only when the order stays more profitable than the aggregator route AND above a minimum profit floor. If not viable, disable the discount.

## 2. Brief requirements (acceptance)
1. Live "safe direct discount" calculator comparing food, packaging and delivery costs with aggregator commission. BLOCK discounts that break the profit floor.
2. 2-3 student-friendly COMBOS built from existing menu items. Admin sees contribution margin. Never discount below cost.
3. Direct-order repeat/QR offer, plus a dashboard showing commission saved, discount cost and net profit per order.
4. Suggested build order: profit-floor calculation -> combos -> QR/repeat-order mock flow -> savings dashboard.
5. Acceptance demo: same order on aggregator vs direct channel; show customer saving money while Bugeese keeps HIGHER net profit, or DISABLE the discount if not viable.

### Guardrails (never break)
- Pure-veg only. No non-veg item may exist in menu, combos, rewards, add-ons or copy. Enforce in DB (is_veg check).
- Keep indulgent veg-burger positioning and the existing kitchen team. Do not change kitchen roles or recipes. Protect kitchen with a capacity cap.
- NEVER hardcode a discount that ignores delivery cost. The only discount path is the engine. No fixed or client-sent discount.

## 3. Status
- DONE: `backend/src/engine.js` (financial engine, profit floor, guard stack) + `backend/test/engine.test.js` + `backend/test/api.test.js` (16 passing tests incl. 10k-case invariant fuzz & live API quotes from DB). Run `npm test` in `backend/`.
- DONE: Backend scaffolding with Express, dual live PostgreSQL / mock in-memory fallback, and full reusable test data (`backend/src/seedData.js`).
- TODO in order: (2) combos CRUD/activation checks, (3) quote/confirm with concurrency safety (`confirm_order`), (4) QR token flow + 3-tap reorder, (5) loyalty tiers + ledger, (6) admin savings dashboard, (7) mock courier dispatch, (8) auth/security hardening, (9) demo seed data + script.

## 4. Non-negotiable conventions
- ALL money = integer paise. Never floats. Rates/shares = basis points (bps): 25% = 2500, 60% = 6000.
- Rounding: commission rounds half-up to paisa; discount ALWAYS rounds DOWN (Math.floor).
- Backend computes every price. Frontend sends only item/combo IDs and quantities. Never trust client prices or discounts.
- Customers never receive food cost, packaging cost, courier cost, commission or margins. Use `toCustomerView`.
- Nothing is hardcoded: rates, shares, floors, caps, fees, min order, TTLs come from config tables. Every order stores a snapshot of the config used (config_version_id) and the engine outputs.
- Anything simulated (payment, courier, QR scan, estimated courier cost) must be labelled "Simulated" in UI and docs. Never claim live integrations that are not connected.
- All example rupee figures in this file are ILLUSTRATIVE placeholders. Replace with real kitchen costs.

## 5. Financial engine (implemented)
Definitions: V basket value, F food cost, P packaging (flat per order), C courier estimate (direct only), G gateway fee (config, Rs 0 for demo), r commission rate, R reward cost (non-cash perk).
```
commission        = round(V * r)
aggregatorProfit  = V - commission - F - P          # aggregator delivers: no courier, no gateway
directProfitRaw   = V - F - P - C - G
headroom          = directProfitRaw - aggregatorProfit
share             = min(tierShare + qrBoost, 7500 bps)  # hard cap 75%
marginFloor       = max(min_margin_paise, floor(V * min_margin_bps / 10000))
```
Guard order (first failing guard removes the discount):
1. headroom <= 0 -> reason DIRECT_NOT_VIABLE (discount off, direct not economical)
2. V < min_order_for_discount -> BELOW_MIN_ORDER (show "add Rs X to unlock direct savings")
3. share cap 75%
4. strict parity: directProfit after discount and reward > aggregatorProfit
5. floor: directProfit after discount and reward >= marginFloor
Discount = max(0, min(floor(headroom*share), directRaw-R-aggProfit-1, directRaw-R-marginFloor)). If that is negative with the reward included, DROP the reward (R=0) and recompute.

Worked example (illustrative): V=24900, F=10000, P=1500, C=4000, r=25%, share 60%, floor 4000
commission 6225; aggProfit 7175; directRaw 9400; headroom 2225; discount 1335; directProfit 8065 > 7175 -> PASS.
Budget Bite (V=14900, F=7000): headroom -275 -> discount disabled (this is the "disable if not viable" demo case).

Engine API: `runEngine(input, cfg)`, `toCustomerView(res)`, `toAdminComparison(res)`.
cfg = { commissionBps, gatewayFeePaise, minOrderPaise, minMarginPaise, minMarginBps, capBps }.

## 6. Config keys (table system_config + versioned aggregator_config)
commission_bps, gateway_fee_flat_paise (0), customer_share_bps tiers (6000/6500/7000), cap_bps (7500), min_order_for_discount_paise (20000), min_margin_paise (4000), min_margin_bps (800), organic_share_bps (3000), quote_ttl_seconds (300), max_active_orders (12), packaging_flat_paise, tier thresholds (50000 and 200000 paise commission avoided), courier_estimate_paise, qr_boost_bps (1000).

## 7. Data model (core tables)
profiles, shops, menu_items(id, name, price_paise, food_cost_paise, is_veg boolean not null check(is_veg), available), combos, combo_items, reward_items(is_veg check), aggregator_config (versioned, is_active), system_config, order_quotes, orders, loyalty_ledger, qr_tokens, dispatches, payments(mock), admin roles.

order_quotes: id, user_id, shop_id, items jsonb, qr_token_id, config_version_id, loyalty_balance_at_quote bigint, gate_result text, quote_payload jsonb (full engine snapshot), expires_at, used boolean default false.
orders: id, user_id, shop_id, items, status, idempotency_key uuid UNIQUE, config_version_id, tier_at_order_time, acquisition_class, qr_token_id, financial_snapshot jsonb (menu_subtotal, commission, aggregator_profit, headroom, discount, reward_cost, direct_profit, courier_estimated, courier_actual nullable), created_at.
Status flow: placed -> preparing -> ready -> dispatched -> completed; placed -> cancelled. Changes only via compare-and-set (`UPDATE ... WHERE status = expected`).

Required constraints/indexes:
```
unique(orders.idempotency_key); unique(loyalty_ledger.order_id, entry_type);
unique(dispatches.order_id); unique(payments.provider_ref)
```

## 8. Combos (feature 2)
- Tables combos(id, name, description, price_paise, active), combo_items(combo_id, menu_item_id, qty). Built ONLY from existing menu items (all veg by constraint).
- View combo_margin: contribution = price - sum(qty*food_cost) - packaging. Admin sees amount and %. Customers never do.
- Reject save/activate if contribution <= 0 ("never below cost"). A combo is one line in V and goes through the SAME engine, so discounts cannot push it below cost or floor. Same price on aggregator and direct.
- Seed 3 veg combos (illustrative): Student Saver Rs249 (veg burger+fries+drink), Study Duo Rs399 (2 veg burgers+large fries), Budget Bite Rs149 (mini veg burger+drink). Budget Bite must demonstrate discount-disabled behavior.

## 9. Quote / confirm flow and CONCURRENCY (feature 3)
Flow: POST /api/orders/quote {items|combo_id, qr_token?} -> backend runs engine -> returns {quote_id, customer view, expires_at}. POST /api/orders/confirm {quote_id, idempotency_key}.
Rules: never check-then-write. Use unique constraints and conditional UPDATE ... WHERE state=expected ... RETURNING (0 rows = lost the race).
`confirm_order(quote_id, user_id, idem_key)` must be ONE DB transaction (Postgres function via rpc, or BEGIN/COMMIT with pg):
1. If order exists for idem_key -> return it (replay).
2. Lock user row FOR UPDATE (serialize one customer's orders).
3. Claim quote: UPDATE order_quotes SET used=true WHERE id AND user AND used=false AND expires_at>now() RETURNING; none -> QUOTE_INVALID.
4. config_version_id still active, else REQUOTE_CONFIG.
5. SUM(loyalty_ledger) equals loyalty_balance_at_quote, else REQUOTE_LOYALTY.
6. If QR: UPDATE qr_tokens SET status='redeemed' WHERE id AND status='claimed' AND claiming_user_id=user AND not expired; none -> QR_INVALID.
7. Kitchen capacity: active orders < max_active_orders else KITCHEN_BUSY.
8. Insert order with snapshot from quote. Catch unique_violation on idempotency key and return the existing order.
Any exception rolls back everything. API maps REQUOTE_* to a fresh quote with the new price shown. Payment is mock; nothing is saved if payment fails; loyalty credited only when order status becomes completed (same transaction, unique ledger entry).
Concurrency tests to automate: 10 parallel confirms same idem key -> 1 order; 10 parallel same quote -> 1 order; 2 users claim one QR token -> 1 claim; config change between quote and confirm -> REQUOTE_CONFIG; two simultaneous orders by one user -> second gets REQUOTE_LOYALTY if balance changed.

## 10. Loyalty (feature 5)
Metric = cumulative COMMISSION AVOIDED by Bugeese (V*r per qualifying order), not discount given. Balance = SUM(loyalty_ledger) (never a stored running total). Cancellation writes a negative reversal entry.
Tiers by commission avoided: Bronze 0-499 Rs share 60% of headroom; Silver 500-1999 share 65% + free veg add-on; Gold 2000+ share 70% + free veg add-on. Share is of HEADROOM, never extra % of menu price. Combined share (tier + QR boost) hard cap 75%.
Same-checkout tier upgrade: project balance + V*r at quote; show "this order takes you to Silver".
Perk cost R comes from reward_items (veg only, real cost). Free delivery is already universal on direct orders (courier is inside the engine), so do NOT use it as a tier perk (or, if the team prefers, charge a delivery fee by default and waive it for Silver with R = fee. Do not mix).
Leakage fix, acquisition_class: qr_attributed / first_order / lapsed (no direct order in 30 days) get tier share (+QR boost) and ledger credit; organic (habitual direct customer) gets organic_share_bps (default 30%) and NO ledger credit. Report discount spend by class.

## 11. QR flow and repeat order (feature 4)
- Printed QR on packaging inserts carries an OPAQUE token only. No user_id (aggregator customer has no account). Store token hash. 128-bit random.
- State machine: issued -> scanned -> claimed (after signup/login) -> redeemed | expired. All transitions via conditional UPDATE. Rate-limit the claim endpoint.
- Offer = +10% SHARE BOOST (qr_boost_bps), never a fixed rupee amount, so the gate still holds. Combined share capped at 75%.
- Copy: "Bugeese loyalty insert". Do NOT say "use this instead of Zomato" (aggregator T&C risk). Mention the risk in the pitch as a known risk.
- 3-tap Reorder: last order + saved address + mock payment. ALWAYS create a fresh quote (never reuse old prices).
- Min order message: "Add Rs X to unlock direct savings".

## 12. Courier (mock only)
Adapter pattern: CourierAdapter { dispatch, cancel, getStatus }. MockAdapter returns a fake rider and steps statuses automatically, labelled "Simulated". DunzoAdapter/ShadowfaxAdapter are named stubs only. Payload {pickup, dropoff, weight, order_id}; use order_id as idempotency key; unique dispatch per order. Store courier_cost_estimated (used in engine) and courier_cost_actual (nullable); dashboard shows variance only when actual exists.

## 13. Admin dashboard (feature 6)
Metrics: commission saved; discount cost (discount + reward cost); net profit per order; net profit gain vs aggregator baseline; discount efficiency (discount cost / commission saved); offers blocked by gate_result reason; discount spend by acquisition_class; QR funnel (issued, scanned, claimed, ordered, redeemed); tier distribution; courier variance. No hardcoded numbers: empty state when no data; label estimates. Also an order-detail view for the acceptance demo: aggregator vs direct side by side using toAdminComparison.

## 14. Security
JWT auth with refresh tokens; admin role guard on all dashboard and cost endpoints; Postgres row-level security so customers cannot read cost columns or financial_snapshot; validate all inputs; rate limit login, quote and QR claim; hash QR tokens; no secrets in repo; CORS restricted; never expose stack traces.

## 15. Acceptance demo script
1. Student Saver combo on aggregator view vs direct view (customer saves).
2. Admin order view: commission, discount cost, net profit. Direct > aggregator.
3. Budget Bite: discount disabled with reason.
4. Mock QR claim, boost applied, cap respected, token single-use.
5. Reorder in 3 taps with a fresh quote.
6. Dashboard totals, blocked offers, spend by class.
7. Optional: run parallel-confirm script, exactly 1 order.

## 16. Build rules for the agent
- Work one feature at a time in the order above. After each: tests pass, short summary, update this file's Status.
- Keep changes within the 9-hour scope. Real: engine, combos, quote/confirm, QR+reorder, dashboard core. Mock/slide-only: courier providers, webhooks, ledger reversals beyond basics, courier reconciliation.
- Do not edit engine behavior without updating tests; do not remove the fuzz invariant test.
- Ask the team before adding dependencies or changing the stack.
- Open decision: Silver perk model (add-on item vs delivery fee waiver), and final stack choice.
