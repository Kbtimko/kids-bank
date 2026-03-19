import { NextRequest, NextResponse } from "next/server";
import { sql, getSetting, getChildBalance } from "@/lib/db";
import { isParentUnlocked } from "@/lib/auth";
import { computeEffectiveRate, computeMonthlyInterest } from "@/lib/interest";
import { getFedRate } from "@/lib/fred";

export async function POST(req: NextRequest) {
  if (!(await isParentUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const overrideRate: number | undefined =
    typeof body.override_rate === "number" ? body.override_rate : undefined;

  // Get settings
  const multiplier = parseFloat((await getSetting("interest_multiplier")) ?? "2");
  const floor = parseFloat((await getSetting("interest_floor_percent")) ?? "5");
  const { rate: fedRate } = await getFedRate();

  const effectiveRate = overrideRate ?? computeEffectiveRate(fedRate, multiplier, floor);

  // Get all children
  const children = await sql`SELECT id, name FROM children ORDER BY id`;

  const now = new Date();
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().split("T")[0];

  const previews: { childId: number; name: string; balance: number; interest: number }[] = [];

  for (const child of children.rows) {
    // Idempotency check: has interest already been applied this month?
    const existing = await sql`
      SELECT id FROM transactions
      WHERE child_id = ${child.id}
        AND type = 'interest'
        AND transaction_date >= ${monthStart}
    `;
    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json(
        { error: `Interest already applied for ${monthLabel} for ${child.name}.` },
        { status: 409 }
      );
    }

    const balance = await getChildBalance(child.id);
    const interest = computeMonthlyInterest(balance, effectiveRate);
    previews.push({ childId: child.id, name: child.name, balance, interest });
  }

  // If preview mode (no confirm flag), return preview
  if (!body.confirm) {
    return NextResponse.json({
      preview: previews,
      effectiveRate,
      fedRate,
      multiplier,
      floor,
      month: monthLabel,
    });
  }

  // Apply interest
  for (const { childId, interest, name } of previews) {
    if (interest > 0) {
      await sql`
        INSERT INTO transactions (child_id, type, amount, description, transaction_date)
        VALUES (
          ${childId},
          'interest',
          ${interest},
          ${`Monthly interest – ${monthLabel} (${effectiveRate.toFixed(2)}% annual)`},
          ${today}
        )
      `;
    }
  }

  return NextResponse.json({ success: true, applied: previews, effectiveRate, month: monthLabel });
}
