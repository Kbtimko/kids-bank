export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getFamilySession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const childId = parseInt(id);
  const ownership = await sql`SELECT id FROM children WHERE id = ${childId} AND family_id = ${family.familyId}`;
  if (!ownership.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await sql`
    SELECT DISTINCT TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') AS month
    FROM transactions WHERE child_id = ${childId} AND type = 'deposit'
    ORDER BY month DESC
  `;
  const months = result.rows.map((r) => r.month as string);

  let longestStreak = 0;

  // currentStreak is the streak ending at the most recent deposit month
  const currentStreak = months.length > 0 ? (() => {
    let s = 1;
    for (let i = 1; i < months.length; i++) {
      const [y1, m1] = months[i - 1].split("-").map(Number);
      const [y2, m2] = months[i].split("-").map(Number);
      if ((y1 * 12 + m1) - (y2 * 12 + m2) === 1) s++;
      else break;
    }
    return s;
  })() : 0;

  let s = months.length > 0 ? 1 : 0;
  for (let i = 1; i < months.length; i++) {
    const [y1, m1] = months[i - 1].split("-").map(Number);
    const [y2, m2] = months[i].split("-").map(Number);
    s = (y1 * 12 + m1) - (y2 * 12 + m2) === 1 ? s + 1 : 1;
    longestStreak = Math.max(longestStreak, s);
  }
  longestStreak = Math.max(longestStreak, s);

  return NextResponse.json({ currentStreak, longestStreak, monthsWithDeposits: months.length });
}
