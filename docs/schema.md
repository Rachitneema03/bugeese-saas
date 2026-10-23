# Schema --- Bugeese Commission-Optimized Direct Ordering Engine

**Purpose:** Define the data entities, relationships, ownership, and
persistence rules needed by the product. This is a logical schema
proposal based on the supplied Full Flow and PRD. Exact SQL migrations
should be created only after the team confirms the selected backend/ORM
and current repository conventions.

## 1. Data principles

-   Supabase PostgreSQL is the system of record.
-   Use UUID primary keys for externally referenced entities where
    practical; internal numeric IDs are acceptable for static catalog
    records.
-   Every shop-scoped business record includes `shop_id` directly or is
    reachable through a shop-scoped parent.
-   Store money as integer paise in calculation-critical fields, or use
    a consistently specified exact numeric representation. Do not use
    floating-point types for money.
-   Prices/costs used by an order must be snapshotted so future
    menu/config changes do not rewrite history.
-   Private cost and margin fields must not be returned from public menu
    APIs.
-   Store phone OTP identity through Supabase Auth; internal identity is
    the auth UUID, not phone number.
-   Store payment references only, never raw card details.
-   Use append-only ledger entries for loyalty credits and reversals.
-   Add created/updated timestamps and explicit status enums where
    appropriate.
-   Define unique constraints and idempotency keys for operations that
    may be retried.

## 2. Entity relationship overview

``` text
shops
 ├── menu_items ── item_costs (versioned/private)
 ├── combos ── combo_items ── menu_items
 ├── pricing_config (versioned)
 ├── orders ── order_items
 │     ├── order_pricing_snapshots
 │     ├── quotes (quote accepted / referenced)
 │     ├── payments (reference/status only)
 │     ├── kitchen_tickets
 │     ├── dispatches (delivery only)
 │     └── loyalty_ledger (commission-avoided credit/reversal)
 ├── qr_tokens ── campaign_events
 └── analytics derive from completed orders, snapshots, ledger and QR events

auth.users
 ├── customers
 ├── customer_addresses
 ├── saved_orders ── saved_order_items
 └── loyalty_ledger
```

## 3. Tables and key fields

Types below are conceptual. Confirm exact PostgreSQL types, enum
definitions, indexes, and foreign-key actions in migrations.

### 3.1 `shops`

One row per Bugeese shop/branch.

-   `id` UUID or identity PK
-   `name`, `code`
-   `address`, `contact_details`
-   `is_active`
-   `created_at`, `updated_at`

Relationships: one shop has menu items, costs, combos, config versions,
orders, QR tokens, KOTs, and dispatches.

### 3.2 `menu_items`

Public catalog data.

-   `id` PK
-   `shop_id` FK → `shops.id`
-   `name`, `description`
-   `menu_price_paise`
-   `is_vegetarian`
-   `is_available`
-   `image_url`, optional category
-   `created_at`, `updated_at`

Public API may expose name, description, menu price, vegetarian flag,
availability, category, and image. It must not expose food cost.

### 3.3 `item_costs`

Private, versioned cost data separated from public menu records.

-   `id` PK
-   `shop_id` FK → `shops.id`
-   `menu_item_id` FK → `menu_items.id`
-   `food_cost_paise`
-   `effective_from`, optional `effective_to`
-   `version`, `created_by`, `created_at`

A quote/order records the cost values/version it used. Do not update old
order snapshots when costs change.

### 3.4 `pricing_config`

Versioned financial settings. Store one record per applicable
shop/channel/config version.

-   `id` PK
-   `shop_id` FK → `shops.id` (nullable only if an explicitly global
    default is supported)
-   `version`, `is_active`
-   `aggregator_name` or channel identifier
-   `commission_rate_basis_points`
-   `packaging_cost_paise`
-   `delivery_cost_estimate_paise`
-   `gateway_fee_basis_points`
-   `profit_floor_fixed_paise`
-   `profit_floor_percent_basis_points`
-   `minimum_discount_paise`
-   `bronze_share_basis_points`
-   `silver_share_basis_points`
-   `gold_share_basis_points`
-   `combined_share_cap_basis_points`
-   `combo_share_cap_basis_points`
-   `qr_first_direct_boost_basis_points`
-   `qr_repeat_boost_basis_points`
-   `qr_repeat_validity_days`
-   `minimum_delivery_basket_paise` or enough versioned inputs to derive
    it
-   `effective_from`, `created_by`, `created_at`

Rules: configuration changes create a new version; do not overwrite
historical versions referenced by quotes/orders. Avoid storing a
computed default in two places unless reconciliation rules are clear.

### 3.5 `customers`

Customer profile keyed by Supabase Auth identity.

-   `user_id` UUID PK/FK → `auth.users.id`
-   `display_name`, optional
-   `created_at`, `updated_at`

Do not use phone number as the customer primary key. Auth provider
controls phone verification.

### 3.6 `customer_addresses`

Saved customer delivery addresses.

-   `id` UUID PK
-   `user_id` FK → `customers.user_id`
-   `label`, `address_fields`, `delivery_instructions`
-   `is_default`
-   `created_at`, `updated_at`

Store only what is needed for fulfillment. Enforce ownership checks on
reads and writes.

### 3.7 `quotes`

Short-lived server-calculated price quotes.

-   `id` UUID PK
-   `shop_id` FK → `shops.id`
-   `user_id` FK → `customers.user_id`, nullable for anonymous browsing
    if supported
-   `fulfilment_mode` enum: `delivery`, `pickup`
-   `status` enum: `valid`, `expired`, `consumed`, `rejected`
-   `subtotal_paise`
-   `discount_paise`
-   `reward_cost_paise`
-   `amount_due_paise`
-   `projected_tier`
-   `pricing_config_id` FK → `pricing_config.id`
-   `expires_at`, `created_at`
-   Optional token/campaign reference

Do not treat the quote as an order. Revalidate it at checkout.

### 3.8 `orders`

Confirmed order and fulfilment lifecycle.

-   `id` UUID PK
-   `shop_id` FK → `shops.id`
-   `user_id` FK → `customers.user_id`
-   `quote_id` FK → `quotes.id`
-   `fulfilment_mode` enum: `delivery`, `pickup`
-   `status` enum with explicitly allowed transitions
-   `subtotal_paise`, `discount_paise`, `reward_cost_paise`,
    `amount_due_paise`
-   `pricing_config_id` FK → `pricing_config.id`
-   `tier_at_order_time`
-   `pickup_code`, nullable
-   `completed_at`, `cancelled_at`, `created_at`, `updated_at`
-   `idempotency_key`, unique within the relevant scope

Orders must not be created from client-provided prices. Checkout
recalculates or validates the quote server-side.

### 3.9 `order_items`

Normalized items for each order.

-   `id` PK
-   `order_id` FK → `orders.id`
-   `menu_item_id` FK → `menu_items.id`
-   `item_name_snapshot`
-   `quantity`
-   `unit_menu_price_paise`
-   `unit_food_cost_paise`
-   `line_subtotal_paise`
-   `combo_id`, nullable
-   `created_at`

Store the item name, price, and cost snapshot required to reconstruct
the historical order. For combo components, preserve the actual
component quantities.

### 3.10 `order_pricing_snapshots`

Immutable financial calculation record for each order.

-   `id` PK
-   `order_id` FK → `orders.id`, unique if one final snapshot per order
-   `pricing_config_id` FK → `pricing_config.id`
-   `V_paise`, `F_paise`, `P_paise`, `C_paise`, `G_paise`
-   `commission_rate_basis_points`
-   `aggregator_commission_paise`
-   `aggregator_profit_paise`
-   `direct_raw_profit_paise`
-   `headroom_paise`
-   `profit_floor_paise`
-   `share_basis_points`
-   `budget_paise`
-   `discount_paise`
-   `reward_cost_paise`
-   `direct_profit_paise`
-   `commission_saved_paise`
-   `validation_verdict`, `validation_reason`
-   `calculation_version`, `created_at`

The snapshot is the source for dashboard financial metrics and
historical explanation. Do not mutate it to reflect later configuration
changes.

### 3.11 `combos`

A direct-only bundle of existing menu items.

-   `id` PK
-   `shop_id` FK → `shops.id`
-   `name`, `description`
-   `pickup_price_paise`, `delivery_price_paise`
-   `is_active`, `health_status`
-   `last_health_check_at`
-   `created_at`, `updated_at`

A failing combo health check hides the combo from the customer menu.

### 3.12 `combo_items`

Join table between combos and menu items.

-   `combo_id` FK → `combos.id`
-   `menu_item_id` FK → `menu_items.id`
-   `quantity`
-   Composite PK (`combo_id`, `menu_item_id`)

A combo's KOT lists component items. A combo does not receive additional
tier or QR cash discounts; loyalty credit may still accrue.

### 3.13 `loyalty_ledger`

Append-only record of commission avoided by customer.

-   `id` UUID PK
-   `user_id` FK → `customers.user_id`
-   `shop_id` FK → `shops.id`
-   `order_id` FK → `orders.id`
-   `entry_type` enum: `credit`, `reversal`
-   `commission_saved_paise`
-   `reverses_entry_id` FK → `loyalty_ledger.id`, nullable
-   `idempotency_key`, unique
-   `created_at`, optional `reason`

Lifetime commission avoided is the sum of valid credits and reversals.
Tier is derived from the balance and configured thresholds; an optional
cached tier may be stored but must be reconciled against the ledger.
Credit only after eligible completion. Never edit/delete history to
reverse a credit.

### 3.14 `qr_tokens`

Opaque, random, single-use offer tokens.

-   `id` UUID PK
-   `shop_id` FK → `shops.id`
-   `campaign_type` enum: `first_direct`, `repeat`
-   `token_hash` unique
-   `status` enum: `issued`, `claimed`, `redeemed`, `expired`, `revoked`
-   `issued_for_order_id` FK → `orders.id`, nullable
-   `claimed_by_user_id` FK → `customers.user_id`, nullable
-   `issued_at`, `expires_at`, `claimed_at`, `redeemed_at`
-   `idempotency_key`

QR encodes an opaque token URL, not user ID, costs, or discount amount.
Repeat offer is single-use and valid for 14 days per the supplied rules.

### 3.15 `campaign_events`

Funnel events for QR and offer attribution.

-   `id` PK
-   `qr_token_id` FK → `qr_tokens.id`
-   `shop_id` FK → `shops.id`
-   `event_type` enum: `issued`, `scanned`, `claimed`, `ordered`,
    `redeemed`, `expired`
-   `user_id` FK → `customers.user_id`, nullable
-   `order_id` FK → `orders.id`, nullable
-   `occurred_at`, optional minimal event metadata

Avoid collecting unnecessary identifying data. Define unique/event
semantics so retries do not inflate conversion.

### 3.16 `kitchen_tickets`

Kitchen Order Ticket created when an order is confirmed.

-   `id` UUID PK
-   `shop_id` FK → `shops.id`
-   `order_id` FK → `orders.id`, unique
-   `ticket_number`, unique per shop per business day
-   `status` enum: `new`, `preparing`, `ready`, `handed_over`,
    `dispatched`
-   `pickup_code`, nullable
-   `notes`, `created_at`, `updated_at`, status timestamps

KOT component lines can be derived from `order_items` and combo
components or stored as a ticket-line snapshot if kitchen history
requires it.

### 3.17 `dispatches`

Courier request and lifecycle, delivery orders only.

-   `id` UUID PK
-   `shop_id` FK → `shops.id`
-   `order_id` FK → `orders.id`
-   `provider` (e.g. `mock`)
-   `status` enum: `pending`, `requested`, `rider_assigned`,
    `picked_up`, `delivered`, `failed`, `cancelled`
-   `estimated_fee_paise`, `actual_fee_paise`, nullable
-   `provider_reference`, nullable
-   `idempotency_key`, unique
-   `request_payload_snapshot` with carefully controlled personal data
-   `created_at`, `updated_at`

Use a provider-neutral adapter. Pickup orders must not create dispatch
records.

### 3.18 `payments`

Payment reference and demo state only.

-   `id` UUID PK
-   `order_id` FK → `orders.id`
-   `provider`
-   `provider_reference`, nullable
-   `status` enum: `pending`, `simulated_success`, `authorized`,
    `failed`, `refunded`
-   `amount_paise`
-   `idempotency_key`
-   `created_at`, `updated_at`

No raw card numbers, CVV, or payment credentials are stored. The
hackathon flow uses simulated payment confirmation.

### 3.19 `saved_orders` and `saved_order_items`

Re-order templates, not price locks.

`saved_orders`: - `id` UUID PK - `user_id` FK → `customers.user_id` -
`source_order_id` FK → `orders.id` - `label`, `created_at`, `updated_at`

`saved_order_items`: - `saved_order_id` FK → `saved_orders.id` -
`menu_item_id` FK → `menu_items.id` - `quantity` - Composite PK
(`saved_order_id`, `menu_item_id`)

On re-order, fetch current price/availability and request a fresh quote.

## 4. Relationship and deletion rules

-   `shops` → menu/config/orders/combos/QR/KOT/dispatch: one-to-many.
-   `menu_items` ↔ `combos`: many-to-many through `combo_items`.
-   `orders` → `order_items`, pricing snapshot, KOT, payment, dispatch:
    one-to-many or one-to-one as specified above.
-   `customers` → addresses, orders, saved orders, loyalty ledger:
    one-to-many.
-   `orders` → loyalty ledger: one-to-many to support credits and
    reversals.
-   `qr_tokens` → campaign events: one-to-many.
-   `pricing_config` → quotes and order snapshots: one-to-many.
-   Prefer soft-disable/archive for shops, menu items, and configs
    referenced by historical orders. Do not cascade-delete financial
    snapshots or ledger history.
-   Define foreign-key delete behavior explicitly in migrations.

## 5. Where data belongs

  ----------------------------------------------------------------------------------
  Data                      Store in                         Visibility
  ------------------------- -------------------------------- -----------------------
  Public menu               `menu_items`                     Public, safe fields
  name/price/availability                                    only

  Food cost                 `item_costs`                     Backend/admin only

  Commission and pricing    `pricing_config`                 Backend/admin only
  settings                                                   

  Current quote and expiry  `quotes`                         Authorized customer +
                                                             backend

  Final order and item      `orders`, `order_items`          Customer/authorized
  lines                                                      staff

  Historic financial        `order_pricing_snapshots`        Admin/analytics only
  calculation                                                

  Commission-avoided        `loyalty_ledger`                 Backend; customer sees
  history                                                    safe tier/progress

  QR token lifecycle        `qr_tokens`                      Backend/admin; opaque
                                                             token in QR

  QR funnel                 `campaign_events`                Analytics/admin

  Kitchen queue             `kitchen_tickets`                Authorized
                                                             kitchen/admin

  Courier state and fee     `dispatches`                     Authorized staff/admin
  variance                                                   

  Payment state/reference   `payments`                       Authorized
                                                             customer/admin; no card
                                                             data

  Saved address             `customer_addresses`             Owning customer and
                                                             authorized fulfilment
                                                             staff only

  Dashboard metrics         Derived from                     Admin; label seeded
                            orders/snapshots/ledger/events   records

  Secrets/API keys          Hosting environment/secret       Backend only; never
                            manager                          database rows exposed
                                                             to client
  ----------------------------------------------------------------------------------

## 6. Dashboard calculations

Calculate metrics from immutable snapshots and completed/eligible order
states:

-   Commission saved = sum of order-time `V × commission rate` for
    completed direct orders.
-   Discount cost = cash discount + incremental reward cost, including
    combo savings under the agreed definition.
-   Net profit gain = direct profit − comparable aggregator profit.
-   Average net profit/order = average stored direct profit for the
    selected eligible orders.
-   Average margin = net profit ÷ amount paid.
-   QR conversion = QR-attributed direct customers/orders ÷ unique QR
    scanners, using a documented attribution window.
-   Courier variance = actual courier fee − estimate.
-   Combo performance = units, margin, and discount cost per combo.

Reconciliation target under the supplied model:

`commission saved = discount cost + net profit gain + courier and gateway cost`

Definitions must be consistent. If the equality fails, investigate cost,
discount, commission, or status accounting rather than adjusting figures
artificially.

## 7. Indexes and constraints to consider

-   `menu_items(shop_id, is_available)`
-   `item_costs(menu_item_id, effective_from)`
-   `pricing_config(shop_id, version)` and a safe constraint for the
    active config
-   `quotes(user_id, expires_at, status)` and
    `quotes(shop_id, created_at)`
-   `orders(shop_id, created_at, status)`,
    `orders(user_id, created_at)`, unique idempotency key
-   Unique `order_pricing_snapshots(order_id)`
-   `order_items(order_id)`
-   `loyalty_ledger(user_id, created_at)`, unique idempotency key
-   Unique QR token hash and indexes for expiry/status/campaign
-   `campaign_events(qr_token_id, occurred_at, event_type)`
-   Unique KOT order ID and unique
    `(shop_id, business_date, ticket_number)`
-   Unique dispatch idempotency key and indexed
    `dispatches(order_id, status)`

## 8. Items to confirm before SQL migrations

-   Select Node.js/Express or FastAPI; select one only.
-   Confirm whether config is per shop, global, and/or per aggregator;
    preserve the per-order commission rate.
-   Confirm exact meaning of "discount cost" in dashboard
    reconciliation, especially combo savings and reward cost.
-   Confirm order status at which commission savings are credited and
    how post-fulfilment refunds reverse them.
-   Confirm whether anonymous quote records are needed or whether quotes
    begin after OTP login.
-   Confirm retention and access policy for address/contact data in mock
    dispatch payloads.
-   Confirm whether KOT line items need their own immutable snapshot.
-   Confirm enum values and allowed state transitions before migration
    generation.
