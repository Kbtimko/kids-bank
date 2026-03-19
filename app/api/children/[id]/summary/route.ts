export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql, getChildBalanceAsOf } from "@/lib/db";
import { mockTransactions, getBalance, getBalanceAsOf, mockSettings } from "@/lib/mock-store";
import { getFedRate } from "@/lib/fred";
import { computeEffectiveRate, computeMonthlyInterest } from "@/lib/interest";

const noDb = !process.env.POSTGRES_URL;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const childId = parseInt(id);
  const now = new Date();

  if (noDb) {
    const balance = getBalance(childId);
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const allTxs = mockTransactions.filter((t) => t.child_id === childId);
    const mtdTxs = allTxs.filter((t) => t.transaction_date >= monthStart);
    const sumBy = (txs: typeof allTxs, type: string) =>
      txs.filter((t) => t.type === type).reduce((s, t) => s + parseFloat(t.amount), 0);

    const multiplier = parseFloat(mockSettings.interest_multiplier);
    const floor = parseFloat(mockSettings.interest_floor_percent);
    const effectiveRate = computeEffectiveRate(4.33, multiplier, floor);
    const nextMonthInterest = computeMonthlyInterest(balance, effectiveRate);

    const chart = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return {
        month: d.toLocaleString("default", { month: "short", year: "2-digit" }),
        balance: getBalanceAsOf(childId, lastDay.toISOString().split("T")[0]),
      };
    });

    return NextResponse.json({
      balance,
      mtd: { deposits: sumBy(mtdTxs, "deposit"), withdrawals: sumBy(mtdTxs, "withdrawal"), interest: sumBy(mtdTxs, "interest") },
      totals: { deposits: sumBy(allTxs, "deposit"), withdrawals: sumBy(allTxs, "withdrawal"), interest: sumBy(allTxs, "interest") },
      effectiveRate,
      nextMonthInterest,
      chart,
    });
  }

  // DB path
  const [balanceResult, mtdResult, totalsResult] = await Promise.all([
    sql`SELECT COALESCE(SUM(CASE WHEN type IN ('deposit','interest') THEN amount ELSE -amount END),0) AS balance FROM transactions WHERE child_id = ${childId}`,
    sql`SELECT
      COALESCE(SUM(CASE WHEN type='deposit' THEN amount END),0) AS deposits,
      COALESCE(SUM(CASE WHEN type='withdrawal' THEN amount END),0) AS withdrawals,
      COALESCE(SUM(CASE WHEN type='interest' THEN amount END),0) AS interest
    FROM transactions WHERE child_id = ${childId} AND transaction_date >= ${`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`}`,
    sql`SELECT
      COALESCE(SUM(CASE WHEN type='deposit' THEN amount END),0) AS deposits,
      COALESCE(SUM(CASE WHEN type='withdrawal' THEN amount END),0) AS withdrawals,
      COALESCE(SUM(CASE WHEN type='interest' THEN amount END),0) AS interest
    FROM transactions WHERE child_id = ${childId}`,
  ]);

  const balance = parseFloat(balanceResult.rows[0].balance);
  const mtd = mtdResult.rows[0];
  const totals = totalsResult.rows[0];

  const [{ getSetting }] = await Promise.all([import("@/lib/db")]);
  const [multiplierStr, floorStr, fedResult] = await Promise.all([
    getSetting("interest_multiplier"),
    getSetting("interest_floor_percent"),
    getFedRate(),
  ]);
  const multiplier = parseFloat(multiplierStr ?? "2");
  const floor = parseFloat(floorStr ?? "5");
  const effectiveRate = computeEffectiveRate(fedResult.rate, multiplier, floor);
  const nextMonthInterest = computeMonthlyInterest(balance, effectiveRate);

  const chart: { month: string; balance: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    chart.push({
      month: d.toLocaleString("default", { month: "short", year: "2-digit" }),
      balance: await getChildBalanceAsOf(childId, lastDay.toISOString().split("T")[0]),
    });
  }

  return NextResponse.json({
    balance,
    mtd: { deposits: parseFloat(mtd.deposits), withdrawals: parseFloat(mtd.withdrawals), interest: parseFloat(mtd.interest) },
    totals: { deposits: parseFloat(totals.deposits), withdrawals: parseFloat(totals.withdrawals), interest: parseFloat(totals.interest) },
    effectiveRate,
    nextMonthInterest,
    chart,
  });
}
