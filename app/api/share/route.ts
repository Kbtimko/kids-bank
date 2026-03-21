export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { isParentUnlocked } from "@/lib/auth";
import { sql } from "@/lib/db";
import { mockChildren, mockTransactions, getBalance, mockSettings } from "@/lib/mock-store";
import { getFedRate } from "@/lib/fred";
import { computeEffectiveRate, computeMonthlyInterest } from "@/lib/interest";
import { getSetting } from "@/lib/db";
import crypto from "crypto";

const noDb = !process.env.POSTGRES_URL;

// In-memory share tokens for local dev
const mockTokens = new Map<string, { childId: number; createdAt: number }>();

export async function POST(req: NextRequest) {
  if (!(await isParentUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId } = await req.json();
  if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });

  const token = crypto.randomBytes(16).toString("hex");

  if (noDb) {
    mockTokens.set(token, { childId, createdAt: Date.now() });
    return NextResponse.json({ token });
  }

  await sql`
    INSERT INTO share_tokens (token, child_id, created_at)
    VALUES (${token}, ${childId}, NOW())
  `;
  return NextResponse.json({ token });
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  let childId: number;

  if (noDb) {
    const entry = mockTokens.get(token);
    if (!entry) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    childId = entry.childId;

    const child = mockChildren.find((c) => c.id === childId);
    if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const balance = getBalance(childId);
    const allTxs = mockTransactions.filter((t) => t.child_id === childId);
    const sum = (type: string) => allTxs.filter((t) => t.type === type).reduce((s, t) => s + parseFloat(t.amount), 0);
    const multiplier = parseFloat(mockSettings.interest_multiplier);
    const floor = parseFloat(mockSettings.interest_floor_percent);
    const effectiveRate = computeEffectiveRate(4.33, multiplier, floor);

    return NextResponse.json({
      child: { name: child.name, avatar_emoji: child.avatar_emoji, display_color: child.display_color },
      balance,
      totals: { deposits: sum("deposit"), withdrawals: sum("withdrawal"), interest: sum("interest") },
      effectiveRate,
      nextMonthInterest: computeMonthlyInterest(balance, effectiveRate),
    });
  }

  const tokenRow = await sql`SELECT child_id FROM share_tokens WHERE token = ${token}`;
  if (!tokenRow.rows[0]) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  childId = tokenRow.rows[0].child_id as number;

  const [childRow, balanceRow, totalsRow] = await Promise.all([
    sql`SELECT name, avatar_emoji, display_color FROM children WHERE id = ${childId}`,
    sql`SELECT COALESCE(SUM(CASE WHEN type IN ('deposit','interest') THEN amount ELSE -amount END),0) AS balance FROM transactions WHERE child_id = ${childId}`,
    sql`SELECT
      COALESCE(SUM(CASE WHEN type='deposit' THEN amount END),0) AS deposits,
      COALESCE(SUM(CASE WHEN type='withdrawal' THEN amount END),0) AS withdrawals,
      COALESCE(SUM(CASE WHEN type='interest' THEN amount END),0) AS interest
    FROM transactions WHERE child_id = ${childId}`,
  ]);

  const child = childRow.rows[0] as Record<string, string>;
  const balance = parseFloat(balanceRow.rows[0].balance as string);
  const totals = totalsRow.rows[0] as Record<string, string>;

  const [multiplierStr, floorStr, fedResult] = await Promise.all([
    getSetting("interest_multiplier"),
    getSetting("interest_floor_percent"),
    getFedRate(),
  ]);
  const effectiveRate = computeEffectiveRate(fedResult.rate, parseFloat(multiplierStr ?? "2"), parseFloat(floorStr ?? "5"));

  return NextResponse.json({
    child,
    balance,
    totals: { deposits: parseFloat(totals.deposits), withdrawals: parseFloat(totals.withdrawals), interest: parseFloat(totals.interest) },
    effectiveRate,
    nextMonthInterest: computeMonthlyInterest(balance, effectiveRate),
  });
}
