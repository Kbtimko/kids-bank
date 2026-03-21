import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function migrate() {
  console.log("Running migrations...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS children (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      display_color VARCHAR(7) NOT NULL DEFAULT '#4F46E5',
      avatar_emoji VARCHAR(10) NOT NULL DEFAULT '⭐',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ children table");

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ settings table");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS share_tokens (
      token VARCHAR(64) PRIMARY KEY,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ share_tokens table");

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_child_id ON transactions(child_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)`);
  console.log("✓ indexes");

  console.log("\nMigrations complete.");
  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
