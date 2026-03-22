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

  // Goals table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      target_amount NUMERIC(10,2) NOT NULL CHECK (target_amount > 0),
      emoji VARCHAR(10) NOT NULL DEFAULT '🎯',
      is_completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ goals table");

  // Chores table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chores (
      id SERIAL PRIMARY KEY,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
      completed_at DATE,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ chores table");

  // Recurring transactions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id SERIAL PRIMARY KEY,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
      amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
      description VARCHAR(255) NOT NULL,
      frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
      next_due_date DATE NOT NULL,
      category VARCHAR(50),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ recurring_transactions table");

  // Withdrawal requests
  await pool.query(`
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id SERIAL PRIMARY KEY,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
      description VARCHAR(255) NOT NULL,
      want_need VARCHAR(10) CHECK (want_need IN ('want', 'need')),
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
      parent_note TEXT,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )
  `);
  console.log("✓ withdrawal_requests table");

  // Add new columns to transactions
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category VARCHAR(50)`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_need BOOLEAN`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL`);
  console.log("✓ transactions new columns");

  // New indexes
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_goals_child_id ON goals(child_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_chores_child_id ON chores(child_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_recurring_child_id ON recurring_transactions(child_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_child_id ON withdrawal_requests(child_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_goal_id ON transactions(goal_id)`);
  console.log("✓ new indexes");

  console.log("\nMigrations complete.");
  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
