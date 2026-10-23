# Bugeese --- Commission-Optimized Direct Ordering Engine

**Team 04 · TechSprint · Bizznnovate 2026**

Bugeese is a direct-ordering web application for a vegetarian,
indulgent-burger quick-service restaurant chain. It aims to move
customers from commission-heavy food delivery aggregators to Bugeese's
own ordering platform while ensuring that every approved discount
preserves the restaurant's required profit.

> **Core question:** Am I making more money when a customer orders
> direct instead of through Zomato or Swiggy?

## Project goals

-   Calculate a safe discount for each direct order using a server-side
    financial engine.
-   Ensure direct-order profit is strictly greater than the modeled
    aggregator profit and meets the configured profit floor.
-   Encourage repeat orders with tiered incentives and QR-based offers.
-   Offer student combos and pickup-first pricing.
-   Give the restaurant visibility into commission avoided, discount
    cost, net profit gain, margins, QR conversion, and courier-fee
    variance.
-   Keep simulated features and seeded demo data clearly labelled.

## Customer flow

1.  Explore the scrollable-burger landing page.
2.  Browse featured items, the full menu, and student combos.
3.  Build a cart and choose delivery or pickup.
4.  Receive a fresh server-calculated quote.
5.  Sign in with phone OTP when required.
6.  Review the price and check out.
7.  View order confirmation and pickup code, if applicable.
8.  Kitchen staff receive a Kitchen Order Ticket (KOT).
9.  Delivery orders use a simulated courier adapter; pickup orders skip
    dispatch.
10. Scan a QR offer on packaging/receipt and return for a future direct
    order.

## Key business rules

The defaults below come from the supplied project flow and PRD. Replace
placeholder menu costs with verified business data before making real
business decisions.

  Setting                                                                 Default
  --------------------------- ---------------------------------------------------
  Aggregator commission                          25% of pre-discount basket value
  Packaging cost                                                    ₹20 per order
  Delivery courier estimate                                    ₹40; ₹0 for pickup
  Gateway fee                                2% of basket value; can be 0 in demo
  Profit floor                                    `max(₹30, 10% of basket value)`
  Minimum visible discount                                                     ₹5
  Bronze share of headroom                                                    60%
  Silver share of headroom                                                    65%
  Gold share of headroom                                                      70%
  Tier + QR share cap                                                         75%
  Combo share cap                                                             60%
  First-direct QR boost                                     +10 percentage points
  Repeat QR boost               +5 percentage points; 14-day validity, single use

The financial engine must revalidate every offer. Loyalty and QR modules
can propose incentives but cannot bypass the profit validator. The
backend is authoritative for prices, costs, discounts, and eligibility.

## Features and priorities

### P0 --- Core demo

-   Core order and financial engine.
-   Live safe-discount calculator and profit floor.
-   Student combos and combo health checks.
-   QR/repeat offer mock flow.
-   Dashboard and financial reconciliation.
-   Existing landing page and menu reuse.
-   Order placement and KOT; delivery/pickup handling.

### P1 --- If time allows

-   Tiered loyalty ledger and display.
-   Rapid re-order.
-   Simulated courier dispatch adapter.

### P2 --- Optional

-   Monthly direct-sales target tracker.
-   Combo health history.

See [`prd.md`](prd.md) for the complete requirements and acceptance
criteria.

## Technology stack

The project specification proposes:

-   **Frontend:** reuse the existing React application and styling.
-   **Backend:** choose **one**: Node.js + Express or FastAPI.
-   **Authentication:** Supabase Auth phone OTP.
-   **Database:** Supabase PostgreSQL.
-   **QR generation:** `qrcode` npm package or a Python equivalent.
-   **Charts:** choose Recharts or Chart.js.
-   **Payments:** simulated for the hackathon.
-   **Courier:** provider-neutral adapter with a `MockAdapter`.
-   **Hosting:** Railway or Render for the backend; confirm the frontend
    host used by the team.

The final backend and charting-library choices must be confirmed before
implementation. Do not maintain both Express and FastAPI backends.

## Documentation

  --------------------------------------------------------------------------
  File                                   Purpose
  -------------------------------------- -----------------------------------
  [`prd.md`](prd.md)                     Product requirements, target users,
                                         features, priorities, and
                                         acceptance criteria

  [`architecture.md`](architecture.md)   Application flow, module
                                         boundaries, API suggestions, tech
                                         stack, and proposed folder
                                         structure

  [`rules.md`](rules.md)                 Engineering constraints, financial
                                         invariants, security, error
                                         handling, and AI coding boundaries

  [`memory.md`](memory.md)               Project handoff, confirmed
                                         decisions, status caveats, and next
                                         actions

  [`schema.md`](schema.md)               Database entities, relationships,
                                         data ownership, and persistence
                                         rules
  --------------------------------------------------------------------------

The documentation folder can contain all five files:

``` text
docs/
├── prd.md
├── architecture.md
├── rules.md
├── memory.md
└── schema.md
```

This README is the project overview and entry point.

## Financial model

The current simplified model is:

``` text
P_agg  = V − V×r − F − P
P_dir0 = V − F − P − C − G
H      = P_dir0 − P_agg
Floor  = max(₹30, 10% of V)
Budget = max(0, min(H × share, P_dir0 − Floor))
```

Where: - `V` = pre-discount basket subtotal - `r` = configured
aggregator commission rate - `F` = food cost - `P` = packaging cost -
`C` = direct courier cost (zero for pickup) - `G` = payment gateway
fee - `H` = direct-order profit headroom over the aggregator baseline

The discount and any reward cost must fit the budget, and final direct
profit must remain strictly greater than aggregator profit and at least
the profit floor. See `architecture.md` and `rules.md` for rounding and
fallback details.

## Demo acceptance scenarios

The supplied PRD defines these core checks:

1.  **₹500 delivery basket:** food cost ₹180; ₹45 discount; customer
    pays ₹455; direct profit ₹205 versus modeled aggregator profit ₹175.
2.  **₹180 delivery basket:** discount disabled; order may proceed at
    menu price if all other constraints pass.
3.  **₹120 basket:** delivery blocked; pickup is offered and the example
    produces a ₹16 discount.
4.  **Student Saver pickup combo:** ₹189 with margin visible to the
    admin.
5.  Confirm an order and show its KOT.
6.  Scan a receipt QR and demonstrate the repeat-offer flow.
7.  Show dashboard metrics and the financial reconciliation identity.

Example menu prices/costs and aggregator profit are modeled
placeholders, not verified operational results. Clearly label seeded
data and simulated integrations.

## Security and reliability

-   Never trust client-sent prices, discounts, costs, tier values, or
    profit values.
-   Never expose private food costs or internal profit margins in
    customer-facing responses.
-   Use internal Supabase Auth UUIDs as identities; phone numbers are
    for verification/contact.
-   Store money as integer paise internally and follow the specified
    rounding rules.
-   Use immutable order pricing snapshots and versioned configuration.
-   Use idempotency for order creation, QR redemption, loyalty ledger
    updates, and dispatch.
-   Store payment references only; never store raw card details.
-   Keep secrets in backend environment configuration and out of source
    control/frontend bundles.
-   Label payment/courier mocks and seeded dashboard data as
    simulated/demo data.

## Development status

This repository documentation does not verify which application features
are already implemented. Before presenting the project, inspect the
actual code, run the relevant tests, and update `memory.md` with
verified status. Do not claim that a feature is built merely because it
appears in this plan.

## Next steps

1.  Inspect the current repository and compare it with `prd.md` and
    `architecture.md`.
2.  Confirm the backend choice (Express or FastAPI) and charting
    library.
3.  Confirm the schema and financial rules before creating migrations.
4.  Implement and test the P0 acceptance scenarios.
5.  Update `memory.md` after each verified milestone.

## Disclaimer

This is a hackathon planning/demo project. Financial results are
estimates based on configured assumptions and placeholder data.
Aggregator terms may restrict off-platform QR steering and should be
reviewed before any real deployment. Taxes are excluded from the current
model.
