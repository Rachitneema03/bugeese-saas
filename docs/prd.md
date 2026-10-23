# PRD --- Bugeese Commission-Optimized Direct Ordering Engine

**Team:** Team 04 · TechSprint · Bizznnovate 2026\
**Version:** 1.0 --- based on the supplied Full Flow v2 and PRD v2\
**Status:** Requirements baseline; implementation status must be
verified by the team

## 1. Product summary

Bugeese is a vegetarian, indulgent-burger quick-service restaurant
chain. Food delivery aggregators such as Zomato and Swiggy charge
approximately 22--30% commission. The project is a direct-ordering web
application backed by a server-side financial engine that compares
direct-order economics with an estimated aggregator baseline and safely
shares part of the avoided commission with customers.

**Product question:** "Am I making more money when a customer orders
direct instead of through Zomato or Swiggy?"

The engine must never approve a discount that violates the configured
profit floor or the rule that direct-order profit must be strictly
higher than comparable aggregator profit.

## 2. Business context and goals

The crisis brief states that monthly sales have fallen from an ₹8--10
lakh target to ₹4 lakh, aggregator orders are down 50%, dine-in is down
60%, and cheaper AI-run cloud kitchens are undercutting prices. These
are brief-provided context figures, not independently verified
analytics.

### Goals

1.  Price direct orders so their modeled profit is strictly higher than
    the same basket through an aggregator.
2.  Encourage repeat direct ordering without relying on an unsustainable
    blanket discount.
3.  Show owners the commission saved, discount cost, profit gain,
    margins, and conversion metrics.
4.  Keep the demo honest: clearly label simulated integrations and
    seeded data.
5.  Reuse the existing Bugeese burger landing page and menu UI where
    practical.

### Non-goals

-   Live payment gateway processing.
-   Real courier-provider integration.
-   Custom SMS infrastructure beyond Supabase test OTP.
-   Full ABAC/multi-role permission system or franchise comparison in
    the hackathon build.
-   GST/tax modeling.
-   Dine-in table ordering.
-   Native mobile apps.

## 3. Target users

  -----------------------------------------------------------------------
  User                    Need                    Product support
  ----------------------- ----------------------- -----------------------
  Aggregator customer     A cheaper way to buy    QR offer that leads to
                          the same food           direct ordering

  Repeat direct customer  Fast, rewarding repeat  Tier display, repeat QR
                          orders                  offer, rapid re-order

  Student                 Affordable meal         Student combos,
                                                  pickup-first pricing

  Restaurant owner/admin  Evidence that direct    Financial calculator,
                          orders earn more        dashboard, combo
                                                  health/margins

  Kitchen staff           Clear tickets without   Kitchen Order Ticket
                          changing the kitchen    (KOT) queue
                          workflow                
  -----------------------------------------------------------------------

## 4. Fixed business rules

All business settings must be stored in versioned database
configuration, not hardcoded. Each order stores the configuration
version used.

  -----------------------------------------------------------------------
  Setting                             Default
  ----------------------------------- -----------------------------------
  Basket value `V`                    Menu subtotal before discounts;
                                      same menu price basis on both
                                      channels

  Aggregator commission `r`           25% of `V`, configurable by
                                      aggregator

  Packaging `P`                       ₹20 flat per order

  Delivery courier estimate `C`       ₹40 for delivery; ₹0 for pickup

  Payment gateway fee `G`             2% of `V`; may be 0 for demo

  Delivery                            Free to customer on eligible direct
                                      orders; courier cost is absorbed
                                      and counted

  Minimum delivery basket             Break-even threshold:
                                      `C ÷ (r − G%)`; with defaults,
                                      about ₹174

  Profit floor                        `max(₹30, 10% of V)`

  Minimum visible discount            ₹5; smaller discounts are hidden

  Tier shares                         Bronze 60%, Silver 65%, Gold 70% of
                                      headroom

  Combined tier + QR share cap        75%

  Combo maximum share                 60% of combo headroom

  QR boosts                           First direct order +10 percentage
                                      points; repeat +5 points, valid 14
                                      days and single-use

  Taxes                               Excluded from the demo calculations
                                      and must be disclosed
  -----------------------------------------------------------------------

Money is stored as integer paise. Costs and fees round up; discounts
round down to a whole rupee. The frontend must not submit prices or
discount amounts as authoritative values.

## 5. Features and priorities

### F1 --- Core order and financial engine (P0)

-   Server-side quote for any cart.
-   Recalculate quotes after cart changes (debounced client requests).
-   Support delivery and pickup. Pickup has no courier cost and no
    courier dispatch.
-   Block delivery below the minimum eligible basket; explain how much
    more the customer needs to add or offer pickup.
-   Revalidate the quote at checkout.
-   Store an immutable pricing snapshot and configuration version.
-   Create a KOT when an order is confirmed.
-   Ignore client-sent prices and discounts.

**Acceptance scenarios** - ₹500 delivery basket with food cost ₹180: ₹45
discount, customer pays ₹455, direct profit ₹205 vs modeled aggregator
profit ₹175. - ₹180 delivery basket: discount disabled; order can
proceed at menu price if the profit and delivery rules pass. - ₹120
delivery basket: delivery is unavailable; pickup is offered and the
example produces a ₹16 discount. - No customer-facing API exposes food
costs or profit margins.

### F2 --- Live safe-discount calculator and profit floor (P0)

-   Customer view: "You pay ₹X, you save ₹Y vs menu price."
-   Admin view shows the full financial waterfall: basket value, food
    cost, packaging, courier, gateway fee, aggregator commission/profit,
    direct raw profit, headroom, floor, budget, reward cost, discount,
    final profit, and verdict.
-   Allow admin what-if changes to configuration in the demo, with
    validation.
-   Verdicts: Viable, Disabled (below minimum discount), or Blocked
    (below profit floor / minimum delivery basket).

### F3 --- Student combos (P0)

-   Admin can define combos from existing menu items with pickup and
    delivery prices.
-   Show contribution margin and aggregator comparison.
-   Re-run health checks when costs or config change; hide failing
    combos.
-   A combo is already discounted: do not stack tier or QR cash
    discounts on it. Loyalty credit can still accrue.
-   Mixed-cart combo savings count against the same basket budget.
-   KOT lists the combo's component items.

### F4 --- QR and repeat offers (P0, mock flow)

-   Generate a unique QR token per printed order/offer.
-   QR stores an opaque random token or short URL only; never encode
    user ID, cost, or discount amount.
-   Offers: first-direct (+10 points) and repeat (+5 points, 14 days,
    single use).
-   Flow: issued → scanned → claimed → quote with boost → ordered →
    redeemed, with expiry.
-   Anonymous visitors may browse; OTP login at checkout binds the token
    to the account (first claim wins).
-   Log funnel events: issued, scanned, claimed, ordered, redeemed,
    expired.
-   The engine applies boosts as share adjustments; the combined share
    cap and profit floor still apply.

### F5 --- Dashboard (P0)

-   Metrics: commission saved, discount cost, net profit gain, average
    net profit/order, average margin, QR scan-to-order conversion,
    courier fee variance.
-   Tables/charts: orders, combo performance, channel comparison for the
    same basket.
-   Reconciliation identity must hold for every order:\
    `commission saved = discount cost + net profit gain + courier and gateway cost`
-   Seeded metrics must be labelled "demo data".

### F6 --- Tiered loyalty (P1)

-   Loyalty metric: cumulative commission avoided on completed direct
    orders (`V × order-time commission rate`), not the discount
    received.
-   Bronze: lifetime commission avoided below ₹500; 60% share of
    headroom.
-   Silver: ₹500 to below ₹2,000; 65% share.
-   Gold: ₹2,000 or more; 70% share and a free add-on shown as
    display-only in the demo.
-   The projected tier may apply in the checkout that crosses a
    threshold.
-   Permanently credit savings only after order completion.
-   Use an append-only ledger with reversals and idempotency keys.

### F7 --- Rapid re-order (P1)

-   Show previous orders and a re-order action.
-   Restore items, but use current prices, availability, address, and a
    fresh quote.
-   Store saved addresses and payment references only; never raw card
    details.
-   Three taps is a target, not a guarantee if
    authorization/substitution is needed.

### F8 --- Courier dispatch (P1, simulated)

-   Use a provider-neutral adapter interface.
-   Demo uses a `MockAdapter`, clearly labelled "Simulated".
-   Dispatch after a delivery order is marked ready; pickup skips
    dispatch.
-   Track estimated and actual courier fees.
-   Model states and failures, including retries, cancellation, and
    manager alerting.

### F9 --- Existing frontend reuse

-   Retain the scrollable burger landing page, featured menu, and full
    menu design.
-   Connect the existing UI to the backend quote/order APIs.

### P2

-   Monthly direct sales tracker versus ₹8--10 lakh target.
-   Per-combo health history.

## 6. Customer journey

1.  Scrollable burger landing page with "Order direct and save".
2.  Featured menu and combo cards.
3.  Full menu with search, categories, and student combos.
4.  Cart; every change triggers a quote request.
5.  Select delivery or pickup.
6.  Phone OTP login; use internal UUID as identity, not phone number.
7.  Checkout; backend revalidates and snapshots the quote.
8.  Simulated payment confirmation.
9.  Confirmation page with order summary, projected/current tier
    progress, and pickup code if applicable.
10. KOT is created.
11. Delivery uses the simulated courier adapter; pickup skips dispatch.
12. Receipt/packaging QR presents a next-order offer.
13. Re-order uses current prices and a new quote.

## 7. Success measures

-   Percentage of discounted orders where direct profit exceeds modeled
    aggregator profit (target: 100%).
-   Commission saved, discount cost, and net profit gain per order.
-   QR scan-to-order conversion among unique scanners.
-   Courier actual-minus-estimated cost.
-   Combo units, margin, and discount cost.

Use only real or explicitly labelled demo data. Do not invent results.

## 8. Risks and assumptions

-   Menu prices and food costs in examples are placeholders until
    replaced with verified values.
-   Aggregator profit is modeled; profit gain is an estimate against a
    comparable order.
-   Aggregator terms may restrict off-platform QR steering; legal review
    is needed.
-   QR conversion measures only people who scan a QR.
-   Actual courier costs may exceed estimates.
-   Taxes are excluded.
-   Per-order gain may be modest; repeat-order volume is the intended
    lever.
-   Preserve vegetarian/indulgent-burger positioning and the kitchen's
    existing workflow.
