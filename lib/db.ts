import { Pool } from "pg";

const noDb = !process.env.POSTGRES_URL;

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  return pool;
}

// Tagged template literal wrapper matching @vercel/postgres API shape
export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  if (noDb) return { rows: [], rowCount: 0 };
  let query = "";
  strings.forEach((str, i) => {
    query += str;
    if (i < values.length) query += `$${i + 1}`;
  });
  const result = await getPool().query(query, values as unknown[]);
  return { rows: result.rows, rowCount: result.rowCount ?? 0 };
}

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
  return (result.rows[0]?.value as string) ?? null;
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
  return parseFloat(result.rows[0].balance as string);
}

export async function getChildBalanceAsOf(childId: number, date: string): Promise<number> {
  const result = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type IN ('deposit', 'interest') THEN amount ELSE -amount END), 0) AS balance
    FROM transactions
    WHERE child_id = ${childId} AND transaction_date <= ${date}
  `;
  return parseFloat(result.rows[0].balance as string);
}
