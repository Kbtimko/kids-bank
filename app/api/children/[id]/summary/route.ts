import { NextRequest, NextResponse } from "next/server";
import { sql, getChildBalanceAsOf } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const childId = parseInt(id);

  // Current balance
  const balanceResult = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type IN ('deposit', 'interest') THEN amount ELSE -amount END), 0) AS balance
    FROM transactions WHERE child_id = ${childId}
  `;
  const balance = parseFloat(balanceResult.rows[0].balance);

  // Month-to-date breakdown
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const mtdResult = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount END), 0) AS deposits,
      COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount END), 0) AS withdrawals,
      COALESCE(SUM(CASE WHEN type = 'interest' THEN amount END), 0) AS interest
    FROM transactions
    WHERE child_id = ${childId} AND transaction_date >= ${monthStart}
  `;
  const mtd = mtdResult.rows[0];

  // 12-month chart: balance at end of each month
  const chart: { month: string; balance: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const dateStr = lastDay.toISOString().split("T")[0];
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const bal = await getChildBalanceAsOf(childId, dateStr);
    chart.push({ month: label, balance: bal });
  }

  return NextResponse.json({
    balance,
    mtd: {
      deposits: parseFloat(mtd.deposits),
      withdrawals: parseFloat(mtd.withdrawals),
      interest: parseFloat(mtd.interest),
    },
    chart,
  });
}
