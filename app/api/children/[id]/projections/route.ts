export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql, getSetting } from "@/lib/db";
import { getFamilySession } from "@/lib/auth";
import { getFedRate } from "@/lib/fred";
import { computeEffectiveRate } from "@/lib/interest";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const childId = parseInt(id);
  const ownership = await sql`SELECT id FROM children WHERE id = ${childId} AND family_id = ${family.familyId}`;
  if (!ownership.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const balanceResult = await sql`
    SELECT COALESCE(SUM(CASE WHEN type IN ('deposit','interest') THEN amount ELSE -amount END), 0) AS balance
    FROM transactions WHERE child_id = ${childId}
  `;
  const balance = parseFloat(balanceResult.rows[0].balance as string);

  const [multiplierStr, floorStr, fedResult] = await Promise.all([
    getSetting("interest_multiplier", family.familyId),
    getSetting("interest_floor_percent", family.familyId),
    getFedRate(),
  ]);
  const effectiveRate = computeEffectiveRate(fedResult.rate, parseFloat(multiplierStr ?? "2"), parseFloat(floorStr ?? "5"));
  const r = effectiveRate / 100;

  const projections = [1, 3, 5, 10].map((years) => ({
    years,
    amount: parseFloat((balance * Math.pow(1 + r, years)).toFixed(2)),
    interest: parseFloat((balance * Math.pow(1 + r, years) - balance).toFixed(2)),
  }));

  return NextResponse.json({ balance, effectiveRate, projections });
}
