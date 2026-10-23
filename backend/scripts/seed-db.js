/**
 * Script to initialize and seed both live PostgreSQL and the mock DB store
 */
const { isMock, mockDB, getPool } = require('../src/db');
const { testConfig, testShop, testMenuItems, testCombos, testRewardItems, testUsers } = require('../src/seedData');

async function seedData() {
  console.log('--- Initializing & Seeding Bugeese Test Data ---');

  // Populate In-Memory Mock Store
  mockDB.aggregator_config = [{ ...testConfig }];
  mockDB.shops = [{ ...testShop }];
  mockDB.menu_items = testMenuItems.map(m => ({ ...m }));
  mockDB.combos = testCombos.map(c => ({ ...c }));
  mockDB.reward_items = testRewardItems.map(r => ({ ...r }));
  mockDB.users = testUsers.map(u => ({ ...u }));

  console.log(`[Mock Store] Seeded:`);
  console.log(` - Config (Commission: ${testConfig.commission_bps / 100}%, Cap: ${testConfig.cap_bps / 100}%)`);
  console.log(` - Menu items: ${mockDB.menu_items.length} pure-veg items`);
  console.log(` - Combos: ${mockDB.combos.length} student combos`);
  console.log(` - Reward items: ${mockDB.reward_items.length}`);
  console.log(` - Users: ${mockDB.users.length}`);

  // Populate Postgres if available
  if (!isMock()) {
    const pool = getPool();
    if (!pool) return;
    try {
      console.log('Connecting to PostgreSQL to seed data...');
      // Insert config
      await pool.query(`
        insert into aggregator_config (
          commission_bps, gateway_fee_flat_paise, customer_share_bps_bronze,
          customer_share_bps_silver, customer_share_bps_gold, qr_boost_bps,
          cap_bps, min_order_for_discount_paise, min_margin_paise, min_margin_bps,
          organic_share_bps, is_active
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
        on conflict do nothing;
      `, [
        testConfig.commission_bps, testConfig.gateway_fee_flat_paise,
        testConfig.customer_share_bps_bronze, testConfig.customer_share_bps_silver,
        testConfig.customer_share_bps_gold, testConfig.qr_boost_bps,
        testConfig.cap_bps, testConfig.min_order_for_discount_paise,
        testConfig.min_margin_paise, testConfig.min_margin_bps,
        testConfig.organic_share_bps
      ]);

      // Insert menu items
      for (const item of testMenuItems) {
        await pool.query(`
          insert into menu_items (id, name, description, price_paise, food_cost_paise, is_veg, available)
          values ($1, $2, $3, $4, $5, $6, $7)
          on conflict (id) do update set price_paise = $4, food_cost_paise = $5;
        `, [item.id, item.name, item.description, item.price_paise, item.food_cost_paise, item.is_veg, item.available]);
      }
      console.log('PostgreSQL seeded successfully.');
    } catch (e) {
      console.warn('PostgreSQL seeding skipped/failed:', e.message);
    }
  }
}

if (require.main === module) {
  seedData().then(() => {
    console.log('Seeding complete.');
    process.exit(0);
  });
}

module.exports = { seedData };
