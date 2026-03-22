import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  return pool;
}

export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
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
  family_id?: number;
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
  category: string | null;
  is_need: boolean | null;
  notes: string | null;
  goal_id: number | null;
};

export type Goal = {
  id: number;
  child_id: number;
  name: string;
  target_amount: string;
  emoji: string;
  is_completed: boolean;
  current_amount?: string;
  created_at: string;
};

export type Chore = {
  id: number;
  child_id: number;
  name: string;
  reward_amount: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
};

export type RecurringTransaction = {
  id: number;
  child_id: number;
  type: "deposit" | "withdrawal";
  amount: string;
  description: string;
  frequency: "weekly" | "biweekly" | "monthly";
  next_due_date: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
};

export type WithdrawalRequest = {
  id: number;
  child_id: number;
  amount: string;
  description: string;
  want_need: "want" | "need" | null;
  status: "pending" | "approved" | "denied";
  parent_note: string | null;
  requested_at: string;
  resolved_at: string | null;
};

// familyId = undefined → global setting (e.g. fed_rate_cache)
// familyId = number   → per-family setting
export async function getSetting(key: string, familyId?: number): Promise<string | null> {
  if (familyId !== undefined) {
    const result = await sql`SELECT value FROM settings WHERE key = ${key} AND family_id = ${familyId}`;
    return (result.rows[0]?.value as string) ?? null;
  }
  const result = await sql`SELECT value FROM settings WHERE key = ${key} AND family_id IS NULL`;
  return (result.rows[0]?.value as string) ?? null;
}

export async function setSetting(key: string, value: string, familyId?: number): Promise<void> {
  if (familyId !== undefined) {
    await sql`
      INSERT INTO settings (family_id, key, value, updated_at)
      VALUES (${familyId}, ${key}, ${value}, NOW())
      ON CONFLICT (family_id, key) DO UPDATE SET value = ${value}, updated_at = NOW()
    `;
  } else {
    await sql`
      INSERT INTO settings (family_id, key, value, updated_at)
      VALUES (NULL, ${key}, ${value}, NOW())
      ON CONFLICT (family_id, key) DO UPDATE SET value = ${value}, updated_at = NOW()
    `;
  }
}

export async function getChildBalance(childId: number): Promise<number> {
  const result = await sql`
    SELECT COALESCE(SUM(CASE WHEN type IN ('deposit', 'interest') THEN amount ELSE -amount END), 0) AS balance
    FROM transactions WHERE child_id = ${childId}
  `;
  return parseFloat(result.rows[0].balance as string);
}

export async function getChildBalanceAsOf(childId: number, date: string): Promise<number> {
  const result = await sql`
    SELECT COALESCE(SUM(CASE WHEN type IN ('deposit', 'interest') THEN amount ELSE -amount END), 0) AS balance
    FROM transactions WHERE child_id = ${childId} AND transaction_date <= ${date}
  `;
  return parseFloat(result.rows[0].balance as string);
}
