import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function seed() {
  // Seed global settings only (fed rate cache defaults)
  const existing = await pool.query(`SELECT key FROM settings WHERE key = 'fed_rate_cache' AND family_id IS NULL`);
  if (existing.rowCount && existing.rowCount > 0) {
    console.log("Already seeded, skipping.");
    await pool.end();
    process.exit(0);
  }

  console.log("Seeding database...");

  await pool.query(
    `INSERT INTO settings (family_id, key, value)
     VALUES
       (NULL, 'fed_rate_cache', '4.33'),
       (NULL, 'fed_rate_cache_date', $1)
     ON CONFLICT (family_id, key) DO NOTHING`,
    [new Date().toISOString().split("T")[0]]
  );
  console.log("✓ global settings");

  console.log(`
Seed complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Register your family at /register to get started.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
