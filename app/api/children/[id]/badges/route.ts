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

  const txResult = await sql`
    SELECT type, amount, transaction_date FROM transactions
    WHERE child_id = ${childId} ORDER BY transaction_date ASC, created_at ASC
  `;
  const txs = txResult.rows as { type: string; amount: string; transaction_date: string }[];

  const badges: { id: string; label: string; emoji: string; description: string; earnedAt: string }[] = [];

  let runningBalance = 0;
  let firstDeposit: string | null = null;
  const milestones: Record<number, string | null> = { 50: null, 100: null, 500: null, 1000: null };
  let hasInterest = false;

  for (const tx of txs) {
    const amt = parseFloat(tx.amount);
    if (tx.type === "deposit" || tx.type === "interest") runningBalance += amt;
    else runningBalance -= amt;

    if (tx.type === "deposit" && !firstDeposit) firstDeposit = tx.transaction_date;
    if (tx.type === "interest" && !hasInterest) { hasInterest = true; }
    for (const m of [50, 100, 500, 1000]) {
      if (!milestones[m] && runningBalance >= m) milestones[m] = tx.transaction_date;
    }
  }

  if (firstDeposit) badges.push({ id: "first_deposit", label: "First Deposit!", emoji: "🌱", description: "Made your very first deposit", earnedAt: firstDeposit });
  if (milestones[50]) badges.push({ id: "balance_50", label: "$50 Saver", emoji: "💰", description: "Reached a $50 balance", earnedAt: milestones[50]! });
  if (milestones[100]) badges.push({ id: "balance_100", label: "$100 Club", emoji: "💵", description: "Reached a $100 balance", earnedAt: milestones[100]! });
  if (milestones[500]) badges.push({ id: "balance_500", label: "$500 Milestone", emoji: "🏆", description: "Reached a $500 balance", earnedAt: milestones[500]! });
  if (milestones[1000]) badges.push({ id: "balance_1000", label: "Thousand-aire!", emoji: "💎", description: "Reached a $1,000 balance", earnedAt: milestones[1000]! });
  if (hasInterest) badges.push({ id: "first_interest", label: "Interest Earned", emoji: "✨", description: "Earned your first interest payment", earnedAt: txs.find((t) => t.type === "interest")?.transaction_date ?? "" });

  // Streak badges from streak endpoint logic
  const monthResult = await sql`
    SELECT DISTINCT TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') AS month
    FROM transactions WHERE child_id = ${childId} AND type = 'deposit' ORDER BY month DESC
  `;
  const months = monthResult.rows.map((r) => r.month as string);
  let maxStreak = 0;
  let s = months.length > 0 ? 1 : 0;
  for (let i = 1; i < months.length; i++) {
    const [y1, m1] = months[i - 1].split("-").map(Number);
    const [y2, m2] = months[i].split("-").map(Number);
    s = (y1 * 12 + m1) - (y2 * 12 + m2) === 1 ? s + 1 : 1;
    maxStreak = Math.max(maxStreak, s);
  }
  maxStreak = Math.max(maxStreak, s);
  if (maxStreak >= 3) badges.push({ id: "streak_3", label: "3-Month Streak!", emoji: "🔥", description: "Saved for 3 months in a row", earnedAt: months[2] ?? "" });
  if (maxStreak >= 6) badges.push({ id: "streak_6", label: "6-Month Streak!", emoji: "⚡", description: "Saved for 6 months in a row", earnedAt: months[5] ?? "" });

  return NextResponse.json({ badges });
}
