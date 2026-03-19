import { sql as vercelSql } from "@vercel/postgres";

const noDb = !process.env.POSTGRES_URL;

// When no DB is configured (local preview), return empty results instead of crashing
const mockSql = (() => Promise.resolve({ rows: [] })) as unknown as typeof vercelSql;

export const sql = noDb ? mockSql : vercelSql;

export type Child = {
  id: number;
  name: string;
  display_color: string;
  avatar_emoji: string;
  created_at: string;
};

export type Transaction = {
  id: number;
  child_id: number;
  type: "deposit" | "withdrawal" | "interest";
  amount: string;
  description: string;
  transaction_date: string;
  created_at: string;
};

export async function getSetting(key: string): Promise<string | null> {
  const result = await sql`SELECT value FROM settings WHERE key = ${key}`;
  return result.rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await sql`
    INSERT INTO settings (key, value, updated_at)
    VALUES (${key}, ${value}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
  `;
}

export async function getChildBalance(childId: number): Promise<number> {
  const result = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type IN ('deposit', 'interest') THEN amount ELSE -amount END), 0) AS balance
    FROM transactions
    WHERE child_id = ${childId}
  `;
  return parseFloat(result.rows[0].balance);
}

export async function getChildBalanceAsOf(childId: number, date: string): Promise<number> {
  const result = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type IN ('deposit', 'interest') THEN amount ELSE -amount END), 0) AS balance
    FROM transactions
    WHERE child_id = ${childId} AND transaction_date <= ${date}
  `;
  return parseFloat(result.rows[0].balance);
}
