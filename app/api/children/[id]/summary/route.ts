export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql, getChildBalanceAsOf, getSetting } from "@/lib/db";
import { getFamilySession } from "@/lib/auth";
import { getFedRate } from "@/lib/fred";
import { computeEffectiveRate, computeMonthlyInterest } from "@/lib/interest";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const childId = parseInt(id);
  const now = new Date();

  // Verify child belongs to this family
  const ownership = await sql`SELECT id FROM children WHERE id = ${childId} AND family_id = ${family.familyId}`;
  if (!ownership.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  const balance = parseFloat(balanceResult.rows[0].balance as string);
  const mtd = mtdResult.rows[0] as Record<string, string>;
  const totals = totalsResult.rows[0] as Record<string, string>;

  const [multiplierStr, floorStr, fedResult] = await Promise.all([
    getSetting("interest_multiplier", family.familyId),
    getSetting("interest_floor_percent", family.familyId),
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
