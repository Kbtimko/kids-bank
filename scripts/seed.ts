import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";

async function seed() {
  // Check if already seeded
  const existing = await sql`SELECT key FROM settings WHERE key = 'parent_pin_hash'`;
  if (existing.rowCount && existing.rowCount > 0) {
    console.log("Already seeded, skipping. Use the admin panel to make changes.");
    process.exit(0);
  }

  console.log("Seeding database...");

  // Settings
  const pinHash = await bcrypt.hash("1234", 12);
  await sql`
    INSERT INTO settings (key, value) VALUES
      ('parent_pin_hash', ${pinHash}),
      ('interest_multiplier', '2'),
      ('interest_floor_percent', '5'),
      ('fed_rate_cache', '4.33'),
      ('fed_rate_cache_date', ${new Date().toISOString().split("T")[0]})
    ON CONFLICT (key) DO NOTHING
  `;
  console.log("✓ settings (4 rows)");

  // Children — update these names/colors/emojis to match your kids!
  const child1 = await sql`
    INSERT INTO children (name, display_color, avatar_emoji)
    VALUES ('Child 1', '#4F46E5', '⭐')
    RETURNING id
  `;
  const child2 = await sql`
    INSERT INTO children (name, display_color, avatar_emoji)
    VALUES ('Child 2', '#059669', '🚀')
    RETURNING id
  `;
  console.log("✓ children (2 rows)");

  // Opening balances — set to 0 or whatever they currently have saved
  const today = new Date().toISOString().split("T")[0];
  await sql`
    INSERT INTO transactions (child_id, type, amount, description, transaction_date)
    VALUES
      (${child1.rows[0].id}, 'deposit', 0.01, 'Opening balance', ${today}),
      (${child2.rows[0].id}, 'deposit', 0.01, 'Opening balance', ${today})
  `;
  console.log("✓ opening balance transactions (2 rows)");

  console.log(`
Seed complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Default PIN: 1234  ← CHANGE THIS IMMEDIATELY in the admin panel
Children:    Child 1, Child 2  ← Rename in admin panel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
