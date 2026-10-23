# Architecture --- Bugeese Commission-Optimized Direct Ordering Engine

**Status:** Proposed architecture baseline. Verify actual repository
structure and implementation status before treating any component as
complete.

## 1. Architecture goals

-   One server-side pricing engine is authoritative for all order entry
    paths.
-   The customer UI never supplies authoritative prices, costs,
    discounts, or profit values.
-   The same engine is used for cart quotes, QR offers, combos, and
    re-orders.
-   Order pricing is reproducible from an immutable snapshot and config
    version.
-   Financial validation and loyalty eligibility are separate
    responsibilities.
-   Simulated integrations must be labelled clearly.

## 2. System context

``` text
Customer browser
  ├── Landing page / featured menu / full menu
  ├── Cart / delivery or pickup / checkout
  ├── OTP login / QR offer / order history
  └── Order confirmation
           |
           v
       Backend API
  ├── Authentication and session validation
  ├── Public menu and availability
  ├── Quote / Financial Engine
  ├── Loyalty eligibility and ledger
  ├── Combo pricing and health checks
  ├── Order placement and immutable snapshot
  ├── KOT / kitchen queue
  ├── QR token lifecycle
  ├── Courier adapter (mock in demo)
  └── Analytics queries
           |
           v
     Supabase PostgreSQL
  ├── Public menu data
  ├── Private costs and versioned config
  ├── Quotes, orders, order items and snapshots
  ├── Loyalty ledger, QR events and tokens
  ├── KOT, dispatch, payment references
  └── Audit / operational records
```

External services: - Supabase Auth: phone OTP and authenticated
identity. - Payment provider: simulated confirmation for the
hackathon. - Courier provider: mock adapter in the demo; real provider
integration is out of scope.

## 3. Main application flows

### 3.1 Quote flow

1.  Client sends item IDs, quantities, fulfilment mode, and applicable
    opaque offer token.
2.  Server validates item existence, availability, quantities, selected
    shop, and token eligibility.
3.  Server loads private item costs and the active versioned pricing
    configuration.
4.  Loyalty module returns the projected tier share and eligible reward
    proposal, if applicable.
5.  Financial engine computes aggregator baseline, direct raw profit,
    headroom, floor, discount budget, reward cost, and final discount.
6.  Profit gate verifies direct profit is strictly greater than
    aggregator profit and meets the floor.
7.  Server stores or returns a quote ID, expiry, pricing breakdown safe
    for the recipient, and config version. Customer-facing response
    excludes private costs and margins.

### 3.2 Checkout/order flow

1.  Client submits quote ID, cart identifiers/quantities, fulfilment
    mode, address reference, and payment reference/mode.
2.  Server revalidates quote expiry, cart, availability, costs/config
    version, QR token and eligibility.
3.  Recalculate or reject stale quote; never trust client-sent prices.
4.  Create order, order items, and immutable pricing snapshot
    transactionally.
5.  Simulated payment confirmation is recorded as simulated.
6.  Confirm order and create KOT idempotently.
7.  Pickup: issue pickup code; no courier dispatch.
8.  Delivery: dispatch request is queued when KOT/order becomes ready;
    mock adapter reports simulated states.
9.  On successful completion, append commission-savings ledger credit.
    On relevant reversal/refund, append a reversal entry.

### 3.3 Loyalty flow

1.  Read customer's lifetime commission avoided from ledger.
2.  Add the current quote's projected commission avoided to determine
    projected tier.
3.  Determine tier share and applicable display/reward proposal.
4.  Send proposal to the financial engine; the financial engine remains
    the sole authority for the final discount.
5.  Display projected tier/reward at checkout.
6.  Permanently credit savings only after order completion; enforce
    idempotency and reversal policy.

### 3.4 QR offer flow

1.  Admin issues a unique random token for a campaign/order.
2.  QR encodes only an opaque token URL.
3.  Record scan event where possible.
4.  At checkout, authenticated customer claims token; first claim wins.
5.  Validate expiry, single-use status, campaign type, and customer
    eligibility.
6.  Pass share boost into the same quote engine. No fixed discount
    promise bypasses the engine.
7.  Redeem only at the defined successful order state; make redemption
    idempotent.

### 3.5 Kitchen and dispatch flow

-   KOT is created when the order is confirmed.
-   KOT status: `new → preparing → ready → handed_over` or `dispatched`.
-   Delivery dispatch is triggered when ready. Pickup skips dispatch.
-   Courier states:
    `pending → requested → rider_assigned → picked_up → delivered`, with
    failed/cancelled branches.
-   Retry with backoff, prevent duplicate requests with idempotency
    keys, and alert manager after configured failure handling.
-   Demo adapter and all generated statuses must be labelled
    "Simulated".

## 4. Financial engine contract

Let: - `V`: pre-discount menu subtotal - `F`: food cost for the basket -
`P`: packaging cost - `C`: direct courier cost estimate (`0` for
pickup) - `G`: gateway fee - `r`: aggregator commission rate

``` text
P_agg  = V − V×r − F − P
P_dir0 = V − F − P − C − G
H      = P_dir0 − P_agg = V×r − C − G
Floor  = max(₹30, 10% of V)
Budget = max(0, min(H × share, P_dir0 − Floor))
```

-   `share = min(tier share + QR boost, 75%)`.
-   Combo maximum share is 60% of combo headroom.
-   Reward cost `R` comes from the budget; if `R > Budget`, drop the
    reward.
-   Discount `D = floor-to-whole-rupee(Budget − R)`.
-   If `D < ₹5` and `R = 0`, set `D = 0`.
-   Final direct profit: `P_dir = P_dir0 − D − R`.
-   Final checks: `P_dir > P_agg`, `P_dir ≥ Floor`, and customer price
    covers modeled cost. If checks fail, drop reward, cap share, set
    discount to zero, then fail closed if still invalid.
-   Delivery is not offered below the configured break-even basket
    threshold. With the supplied defaults: `₹40 ÷ (25% − 2%) ≈ ₹174`.
-   The formulas assume food and packaging costs are the same in both
    channels; document any channel-specific differences instead of using
    the shortcut.

All amounts are integer paise internally. Fees/costs round up; discounts
round down to whole rupees.

## 5. Recommended technology stack

  -----------------------------------------------------------------------
  Layer                   Choice                  Notes
  ----------------------- ----------------------- -----------------------
  Frontend                Existing React app;     Reuse scrollable burger
                          retain current styling  and menu
                          stack                   

  Backend                 Node.js + Express       Select one and
                          **or** FastAPI          standardize before
                                                  implementation; do not
                                                  build both

  Auth                    Supabase Auth phone OTP UUID is identity; phone
                                                  is verification/contact
                                                  only

  Database                Supabase PostgreSQL     Relational records and
                                                  transactions

  QR                      `qrcode` npm package or Opaque random tokens
                          Python equivalent       only

  Charts                  Recharts or Chart.js    Pick one based on
                                                  existing frontend

  Payments                Simulated in hackathon  No live gateway
                                                  processing

  Courier                 Provider-neutral        Real integration
                          adapter + `MockAdapter` planned, not built

  Hosting                 Railway or Render for   Confirm one deployment
                          backend; chosen         target
                          frontend host           

  Observability           Structured server logs  Never log secrets or
                          and operational status  private cost data to
                          fields                  public responses
  -----------------------------------------------------------------------

## 6. Proposed folder structure

The following is a target structure, not a claim about the current
repository. Adapt names to the existing codebase and chosen backend.

``` text
bugeese/
├── frontend/
│   ├── public/
│   │   └── assets/
│   └── src/
│       ├── app/
│       │   ├── routes/
│       │   └── providers/
│       ├── components/
│       │   ├── landing/
│       │   ├── menu/
│       │   ├── cart/
│       │   ├── checkout/
│       │   ├── loyalty/
│       │   ├── qr/
│       │   ├── kitchen/
│       │   └── dashboard/
│       ├── features/
│       │   ├── menu/
│       │   ├── quotes/
│       │   ├── orders/
│       │   ├── loyalty/
│       │   ├── combos/
│       │   └── analytics/
│       ├── services/
│       │   └── api-client.ts
│       ├── hooks/
│       ├── utils/
│       └── styles/
├── backend/
│   ├── src/
│   │   ├── app.ts
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── menu/
│   │   │   ├── pricing/
│   │   │   ├── loyalty/
│   │   │   ├── quotes/
│   │   │   ├── orders/
│   │   │   ├── combos/
│   │   │   ├── qr/
│   │   │   ├── kitchen/
│   │   │   ├── dispatch/
│   │   │   └── analytics/
│   │   ├── adapters/
│   │   │   └── courier/
│   │   ├── db/
│   │   ├── validation/
│   │   ├── config/
│   │   └── shared/
│   └── tests/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── docs/
│   ├── prd.md
│   ├── architecture.md
│   ├── rules.md
│   ├── memory.md
│   └── schema.md
└── README.md
```

If the team chooses FastAPI, replace the backend TypeScript layout with
Python modules and keep the same domain boundaries. Do not maintain two
backends.

## 7. API boundary suggestions

Exact endpoint names may follow the current repository conventions, but
responsibilities should remain separate:

-   `GET /menu` --- public menu data only.
-   `POST /quotes` --- validated cart/mode/token; server-calculated
    quote.
-   `POST /orders` --- checkout using quote ID; revalidate and create
    snapshot.
-   `GET /orders/:id` --- authorized order summary.
-   `GET /orders/:id/kot` --- authorized KOT view.
-   `GET /loyalty` --- authenticated customer tier and progress.
-   `POST /qr/claim` --- authenticated token claim.
-   Admin endpoints for cost/config management, combos, QR issuance, KOT
    queue, and analytics must require authorization.

## 8. Security and reliability boundaries

-   Backend is authoritative for prices, costs, discount, commission,
    eligibility, and profit.
-   Public menu/API responses never expose food cost or margin.
-   Use Supabase Auth identity UUIDs; never use phone numbers as primary
    identity.
-   Validate every input and every state transition.
-   Use database transactions and idempotency for order creation,
    payment callbacks, QR claims/redemption, ledger entries, and
    dispatch.
-   Pricing snapshots are immutable; config changes do not rewrite
    historic orders.
-   Store payment references only; never store raw card details.
-   Keep secrets in environment configuration, not frontend bundles or
    source control.
-   Admin access is single-role for the hackathon. Multi-role ABAC is
    out of scope.
