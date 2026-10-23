-- Enable pgcrypto for UUIDs
create extension if not exists "pgcrypto";

-- 1. SHOPS & CONFIGURATION
create table if not exists shops (
  id serial primary key,
  name text not null default 'Bugeese Pure Veg Indulgence',
  is_active boolean default true,
  packaging_flat_paise integer not null default 1500,
  courier_estimate_paise integer not null default 4000,
  created_at timestamptz default now()
);

create table if not exists aggregator_config (
  id serial primary key,
  commission_bps integer not null default 2500,
  gateway_fee_flat_paise integer not null default 0,
  customer_share_bps_bronze integer not null default 6000,
  customer_share_bps_silver integer not null default 6500,
  customer_share_bps_gold integer not null default 7000,
  qr_boost_bps integer not null default 1000,
  cap_bps integer not null default 7500,
  min_order_for_discount_paise integer not null default 20000,
  min_margin_paise integer not null default 4000,
  min_margin_bps integer not null default 800,
  organic_share_bps integer not null default 3000,
  quote_ttl_seconds integer not null default 300,
  max_active_orders integer not null default 12,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- 2. MENU ITEMS & COMBOS (Pure Veg Constraint)
create table if not exists menu_items (
  id serial primary key,
  name text not null,
  description text,
  price_paise integer not null,
  food_cost_paise integer not null,
  is_veg boolean not null default true check (is_veg = true),
  available boolean not null default true,
  image_url text,
  created_at timestamptz default now()
);

create table if not exists combos (
  id serial primary key,
  name text not null,
  description text,
  price_paise integer not null,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists combo_items (
  id serial primary key,
  combo_id integer not null references combos(id) on delete cascade,
  menu_item_id integer not null references menu_items(id),
  qty integer not null default 1 check (qty > 0)
);

create table if not exists reward_items (
  id serial primary key,
  name text not null,
  cost_paise integer not null,
  is_veg boolean not null default true check (is_veg = true),
  tier_required text not null check (tier_required in ('silver', 'gold')),
  active boolean default true
);

-- 3. QR TOKENS
create table if not exists qr_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique not null,
  offer_type text not null default 'share_boost',
  offer_value_bps integer not null default 1000,
  status text not null default 'issued' check (status in ('issued', 'scanned', 'claimed', 'redeemed', 'expired')),
  claiming_user_id uuid,
  redeeming_order_id uuid,
  expires_at timestamptz not null,
  issued_at timestamptz default now(),
  scanned_at timestamptz,
  claimed_at timestamptz,
  redeemed_at timestamptz
);

-- 4. ORDER QUOTES & ORDERS
create table if not exists order_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  shop_id integer not null default 1,
  items jsonb not null,
  qr_token_id uuid,
  config_version_id integer not null,
  loyalty_balance_at_quote bigint not null default 0,
  gate_result text not null,
  quote_payload jsonb not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  shop_id integer not null default 1,
  items jsonb not null,
  status text not null default 'placed' check (status in ('placed', 'preparing', 'ready', 'dispatched', 'completed', 'cancelled')),
  idempotency_key uuid unique not null,
  config_version_id integer not null,
  tier_at_order_time text not null default 'bronze',
  acquisition_class text not null default 'organic',
  qr_token_id uuid,
  menu_subtotal_paise integer not null,
  commission_paise integer not null,
  aggregator_profit_paise integer not null,
  direct_profit_raw_paise integer not null,
  headroom_paise integer not null,
  discount_paise integer not null,
  reward_cost_paise integer not null default 0,
  direct_price_paise integer not null,
  direct_profit_paise integer not null,
  courier_estimated_paise integer not null,
  courier_actual_paise integer,
  created_at timestamptz default now()
);

create table if not exists loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  order_id uuid not null references orders(id),
  commission_avoided_paise integer not null,
  entry_type text not null check (entry_type in ('credit', 'reversal')),
  created_at timestamptz default now(),
  constraint uq_order_entry unique(order_id, entry_type)
);
