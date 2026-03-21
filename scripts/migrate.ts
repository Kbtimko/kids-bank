import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function migrate() {
  console.log("Running migrations...");

  // Families table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS families (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL DEFAULT 'My Family',
      pin_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ families table");

  // Children table (with family_id)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS children (
      id SERIAL PRIMARY KEY,
      family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      display_color VARCHAR(7) NOT NULL DEFAULT '#4F46E5',
      avatar_emoji VARCHAR(10) NOT NULL DEFAULT '⭐',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Add family_id if upgrading from old schema
  await pool.query(`ALTER TABLE children ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE CASCADE`);
  console.log("✓ children table");

  // Transactions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'interest')),
      amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
      description VARCHAR(255) NOT NULL,
      transaction_date DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ transactions table");

  // Settings table — nullable family_id (NULL = global, e.g. fed_rate_cache)
  // Drop old version if it has the old schema (key-only primary key)
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'settings'
          AND constraint_name = 'settings_pkey'
          AND constraint_type = 'PRIMARY KEY'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings' AND column_name = 'family_id'
      ) THEN
        DROP TABLE settings;
      END IF;
    END $$;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
      key VARCHAR(100) NOT NULL,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE NULLS NOT DISTINCT (family_id, key)
    )
  `);
  console.log("✓ settings table");

  // Share tokens
  await pool.query(`
    CREATE TABLE IF NOT EXISTS share_tokens (
      token VARCHAR(64) PRIMARY KEY,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ share_tokens table");

  // Indexes
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_child_id ON transactions(child_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_children_family_id ON children(family_id)`);
  console.log("✓ indexes");

  console.log("\nMigrations complete.");
  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
