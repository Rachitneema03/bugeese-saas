# Memory --- Bugeese Project Handoff

**Last updated:** 2026-10-23\
**Purpose:** Short, factual handoff for the next developer or AI coding
session.

## 1. Project identity

-   Project: Bugeese Commission-Optimized Direct Ordering Engine.
-   Event/team: Team 04 · TechSprint · Bizznnovate 2026.
-   Business problem: shift customers from commission-heavy aggregators
    to direct ordering while ensuring direct orders earn strictly more
    than the modeled aggregator baseline.
-   Primary product question: "Am I making more money when a customer
    orders direct instead of through Zomato or Swiggy?"

## 2. Documents available

-   `prd.md` --- what to build, users, features, priorities, acceptance
    criteria.
-   `architecture.md` --- system boundaries, flows, proposed stack,
    APIs, target folder structure.
-   `rules.md` --- implementation constraints, error handling,
    financial/security invariants, AI boundaries.
-   `schema.md` --- entities, relationships, data placement, and
    persistence rules.
-   Full Flow v2 supplied by the team --- end-to-end source reference.
-   PRD v2 supplied by the team --- requirements and acceptance-test
    source reference.

## 3. Confirmed product rules

-   Basket value `V` is the pre-discount menu subtotal.
-   Default aggregator commission is 25% of `V`; rate is configurable
    and versioned.
-   Packaging is ₹20 flat per order in the example configuration.
-   Courier estimate is ₹40 for delivery and ₹0 for pickup.
-   Gateway fee is 2% of `V`, optionally 0 in demo.
-   Direct delivery is free to the customer, but courier cost is
    absorbed by Bugeese.
-   Minimum delivery basket is approximately ₹174 under the supplied
    default assumptions.
-   Profit floor is `max(₹30, 10% of V)`.
-   Minimum visible discount is ₹5.
-   Tier shares: Bronze 60%, Silver 65%, Gold 70% of headroom.
-   Tier + QR boost cap: 75%; combo share cap: 60%.
-   First-direct QR boost +10 points; repeat boost +5 points, 14-day
    expiry, single use.
-   Loyalty metric is cumulative commission avoided on completed direct
    orders, not discount received.
-   Projected tier may apply in the checkout that crosses the threshold;
    permanent ledger credit happens after completion.
-   Money is integer paise internally; fees/costs round up and discount
    rounds down to whole rupees.
-   Taxes are excluded from the hackathon model.
-   The backend is authoritative for prices, costs, discounts,
    eligibility, and profit.

## 4. Feature priorities from the supplied PRD

### P0

-   Core order/financial engine and server-side quote.
-   Live safe-discount calculator and profit floor.
-   Student combos and combo health checks.
-   QR/repeat offer mock flow.
-   Dashboard with financial reconciliation.
-   Reuse the existing scrollable-burger landing page and menu.
-   KOT and pickup/delivery order flow.

### P1

-   Tiered loyalty ledger and display.
-   Rapid re-order.
-   Simulated courier adapter and dispatch states.

### P2

-   Monthly sales target tracker.
-   Combo health history.

## 5. Current document/work status

-   The supplied Full Flow v2 and PRD v2 have been read and used to
    create this documentation baseline.
-   This session is currently establishing/maintaining the project
    specification documents.
-   **Implementation status has not been independently verified from the
    repository in this handoff.** Do not claim that authentication,
    pricing engine, KOT, dashboard, QR flow, or courier mock is working
    until the code is inspected and the relevant flow is tested.
-   The source PRD lists a build priority/status plan, but the team must
    update status based on actual working code before presentations or
    handoff.

## 6. Current focus

Current architecture focus is Feature 1 (Core Order & Financial Engine)
and Feature 2 (Tiered Loyalty), with the latest Full Flow/PRD rules
taking precedence over earlier simplified formulas.

Important interaction: 1. Financial Engine computes aggregator baseline,
direct raw profit, headroom, floor, and safe budget. 2. Loyalty Engine
computes projected tier from current ledger balance plus this order's
commission avoided and proposes a tier share/reward. 3. Financial Engine
is the only authority that approves final discount/reward cost. 4.
Projected tier can apply during checkout. 5. Permanent
commission-savings ledger credit occurs after eligible order completion,
with idempotency and reversals.

## 7. Required acceptance scenarios

-   ₹500 delivery basket, food cost ₹180: ₹45 discount, customer pays
    ₹455, direct profit ₹205 vs aggregator profit ₹175.
-   ₹180 delivery basket: discount disabled, accepted at menu price if
    all constraints pass.
-   ₹120 delivery basket: delivery blocked; pickup is available and
    example discount is ₹16.
-   Student Saver pickup combo: ₹189; admin can inspect margin.
-   KOT created after order confirmation.
-   QR repeat offer uses a token and flows through the same pricing
    engine.
-   Dashboard reconciliation identity holds for each order.

## 8. Known risks / limitations

-   Example menu prices and food costs are placeholders, not verified
    Bugeese data.
-   Aggregator baseline is modeled, not an actual matched aggregator
    transaction.
-   Real payment and courier integration are out of scope for the
    hackathon demo.
-   QR steering may be restricted by aggregator terms; legal review is
    needed.
-   Tax modeling is excluded.
-   Delivery cost can exceed the estimate; actual-versus-estimated
    variance should be visible.
-   Gold free add-on is display-only in the demo.
-   Multi-role ABAC and franchise comparison are out of scope.

## 9. Next action

Inspect the current repository and compare it with `prd.md` and
`architecture.md`. Update this file with only verified status: - what
works; - what is partially implemented; - what is simulated; - what is
not started; - which file/feature is currently being worked on; - the
next concrete task; - tests/checks actually run and their results.

Do not infer implementation status from plans, previous prompts, or this
document.
