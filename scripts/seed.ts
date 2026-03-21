import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function seed() {
  const existing = await pool.query(`SELECT key FROM settings WHERE key = 'parent_pin_hash'`);
  if (existing.rowCount && existing.rowCount > 0) {
    console.log("Already seeded, skipping. Use the admin panel to make changes.");
    await pool.end();
    process.exit(0);
  }

  console.log("Seeding database...");

  const pinHash = await bcrypt.hash("1234", 12);
  await pool.query(
    `INSERT INTO settings (key, value) VALUES
      ('parent_pin_hash', $1),
      ('interest_multiplier', '2'),
      ('interest_floor_percent', '5'),
      ('fed_rate_cache', '4.33'),
      ('fed_rate_cache_date', $2)
    ON CONFLICT (key) DO NOTHING`,
    [pinHash, new Date().toISOString().split("T")[0]]
  );
  console.log("✓ settings");

  console.log(`
Seed complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Default PIN: 1234  ← CHANGE THIS in the admin panel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
