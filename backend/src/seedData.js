/**
 * Reusable test data for Bugeese Pure-Veg Commission Engine.
 * All prices and costs are strictly in INTEGER PAISE (Rs 1 = 100 paise).
 */

const testConfig = {
  id: 1,
  commission_bps: 2500, // 25% aggregator commission
  gateway_fee_flat_paise: 0, // Rs 0 for hackathon demo
  customer_share_bps_bronze: 6000, // 60% headroom share
  customer_share_bps_silver: 6500, // 65% headroom share
  customer_share_bps_gold: 7000,   // 70% headroom share
  qr_boost_bps: 1000,              // +10% boost for QR insert
  cap_bps: 7500,                   // 75% hard ceiling
  min_order_for_discount_paise: 20000, // Rs 200 min basket
  min_margin_paise: 4000,          // Rs 40 minimum profit floor
  min_margin_bps: 800,             // 8% margin floor
  organic_share_bps: 3000,         // 30% for organic customers
  quote_ttl_seconds: 300,
  max_active_orders: 12,           // kitchen capacity cap
  is_active: true
};

const testShop = {
  id: 1,
  name: 'Bugeese Pure Veg Indulgence - Indore Flagship',
  is_active: true,
  packaging_flat_paise: 1500,   // Rs 15.00
  courier_estimate_paise: 4000  // Rs 40.00
};

// Pure vegetarian menu items (is_veg = true enforced)
const testMenuItems = [
  {
    id: 1,
    name: 'Bugeese Classic Crisp Veg Burger',
    description: 'Crispy spiced potato & herb patty with house mint mayo',
    price_paise: 16900,     // Rs 169.00
    food_cost_paise: 5500,  // Rs 55.00
    is_veg: true,
    available: true
  },
  {
    id: 2,
    name: 'Truffle & Smoked Cheese Veg Burger',
    description: 'Grilled paneer, caramelized onions, smoked cheese and truffle glaze',
    price_paise: 24900,     // Rs 249.00
    food_cost_paise: 8200,  // Rs 82.00
    is_veg: true,
    available: true
  },
  {
    id: 3,
    name: 'Peri-Peri Crinkle Fries',
    description: 'Golden crinkle fries dusted with house peri-peri seasoning',
    price_paise: 9900,      // Rs 99.00
    food_cost_paise: 2200,  // Rs 22.00
    is_veg: true,
    available: true
  },
  {
    id: 4,
    name: 'Indori Shikanji Soda',
    description: 'Refreshing spiced lemon soda with cumin and mint',
    price_paise: 6900,      // Rs 69.00
    food_cost_paise: 1200,  // Rs 12.00
    is_veg: true,
    available: true
  },
  {
    id: 5,
    name: 'Mini Crisp Slider',
    description: 'Compact crispy veg patty slider',
    price_paise: 8900,      // Rs 89.00
    food_cost_paise: 3800,  // Rs 38.00
    is_veg: true,
    available: true
  }
];

// Student-friendly combos built strictly from existing items
const testCombos = [
  {
    id: 1,
    name: 'Student Saver Combo',
    description: 'Classic Crisp Veg Burger + Crinkle Fries + Indori Shikanji Soda',
    price_paise: 24900, // Rs 249 (regular individual sum: 169 + 99 + 69 = Rs 337)
    food_cost_paise: 8900, // 5500 + 2200 + 1200
    packaging_paise: 1500,
    items: [
      { menu_item_id: 1, name: 'Bugeese Classic Crisp Veg Burger', qty: 1 },
      { menu_item_id: 3, name: 'Peri-Peri Crinkle Fries', qty: 1 },
      { menu_item_id: 4, name: 'Indori Shikanji Soda', qty: 1 }
    ],
    active: true
  },
  {
    id: 2,
    name: 'Study Duo Feast',
    description: '2x Truffle & Smoked Cheese Burgers + Peri-Peri Fries',
    price_paise: 44900, // Rs 449 (regular sum: 249 + 249 + 99 = Rs 597)
    food_cost_paise: 18600, // 8200*2 + 2200
    packaging_paise: 1500,
    items: [
      { menu_item_id: 2, name: 'Truffle & Smoked Cheese Veg Burger', qty: 2 },
      { menu_item_id: 3, name: 'Peri-Peri Crinkle Fries', qty: 1 }
    ],
    active: true
  },
  {
    id: 3,
    name: 'Budget Bite Combo',
    description: 'Mini Crisp Slider + Indori Shikanji Soda (Discount Disabled Demo)',
    price_paise: 14900, // Rs 149 (Demonstrates negative headroom -> disabled discount)
    food_cost_paise: 7000,
    packaging_paise: 1500,
    items: [
      { menu_item_id: 5, name: 'Mini Crisp Slider', qty: 1 },
      { menu_item_id: 4, name: 'Indori Shikanji Soda', qty: 1 }
    ],
    active: true
  }
];

const testRewardItems = [
  {
    id: 1,
    name: 'Cheesy Jalapeño Dip',
    cost_paise: 1200, // Rs 12 kitchen cost
    is_veg: true,
    tier_required: 'silver'
  },
  {
    id: 2,
    name: 'Mini Brownie Sundae (Eggless)',
    cost_paise: 2500, // Rs 25 kitchen cost
    is_veg: true,
    tier_required: 'gold'
  }
];

const testUsers = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    phone: '+919876543210',
    name: 'Aman Sharma',
    role: 'customer',
    tier: 'bronze'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    phone: '+919988776655',
    name: 'Pooja Verma',
    role: 'customer',
    tier: 'silver'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000099',
    phone: '+919000000000',
    name: 'Bugeese Manager',
    role: 'admin'
  }
];

module.exports = {
  testConfig,
  testShop,
  testMenuItems,
  testCombos,
  testRewardItems,
  testUsers
};
