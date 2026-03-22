export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getFamilySession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const childId = parseInt(id);
  const ownership = await sql`SELECT id, name FROM children WHERE id = ${childId} AND family_id = ${family.familyId}`;
  if (!ownership.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const year = parseInt(new URL(req.url).searchParams.get("year") ?? String(new Date().getFullYear()));
  const format = new URL(req.url).searchParams.get("format");

  const totalsResult = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) AS deposits,
      COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) AS withdrawals,
      COALESCE(SUM(CASE WHEN type = 'interest' THEN amount ELSE 0 END), 0) AS interest
    FROM transactions WHERE child_id = ${childId} AND EXTRACT(YEAR FROM transaction_date) = ${year}
  `;
  const t = totalsResult.rows[0] as Record<string, string>;

  const byMonthResult = await sql`
    SELECT
      TO_CHAR(transaction_date, 'Mon') AS month,
      EXTRACT(MONTH FROM transaction_date) AS month_num,
      COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) AS deposits,
      COALESCE(SUM(CASE WHEN type = 'interest' THEN amount ELSE 0 END), 0) AS interest,
      COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) AS withdrawals
    FROM transactions WHERE child_id = ${childId} AND EXTRACT(YEAR FROM transaction_date) = ${year}
    GROUP BY month, month_num ORDER BY month_num
  `;

  const summary = {
    year,
    child: ownership.rows[0],
    deposits: parseFloat(t.deposits),
    withdrawals: parseFloat(t.withdrawals),
    interest: parseFloat(t.interest),
    net_savings: parseFloat(t.deposits) + parseFloat(t.interest) - parseFloat(t.withdrawals),
    by_month: byMonthResult.rows,
  };

  if (format === "csv") {
    const rows = [
      ["Month", "Deposits", "Interest", "Withdrawals"],
      ...(summary.by_month as Record<string, string>[]).map((m) => [m.month, m.deposits, m.interest, m.withdrawals]),
      [],
      ["TOTAL", summary.deposits, summary.interest, summary.withdrawals],
      ["Net Savings", "", "", summary.net_savings],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tax-summary-${year}.csv"`,
      },
    });
  }

  return NextResponse.json(summary);
}
