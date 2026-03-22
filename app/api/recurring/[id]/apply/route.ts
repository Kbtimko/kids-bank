export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getFamilySession, isParentUnlocked } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isParentUnlocked())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const ruleResult = await sql`
    SELECT rt.* FROM recurring_transactions rt JOIN children c ON c.id = rt.child_id
    WHERE rt.id = ${parseInt(id)} AND c.family_id = ${family.familyId}
  `;
  if (!ruleResult.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rule = ruleResult.rows[0] as Record<string, unknown>;

  const today = new Date().toISOString().split("T")[0];
  const tx = await sql`
    INSERT INTO transactions (child_id, type, amount, description, transaction_date, category)
    VALUES (${rule.child_id}, ${rule.type}, ${rule.amount}, ${rule.description}, ${today}, ${rule.category ?? null})
    RETURNING *
  `;

  // Advance next_due_date
  await sql`
    UPDATE recurring_transactions SET next_due_date = next_due_date + (CASE WHEN frequency = 'weekly' THEN INTERVAL '7 days' WHEN frequency = 'biweekly' THEN INTERVAL '14 days' ELSE INTERVAL '1 month' END)
    WHERE id = ${parseInt(id)}
  `;

  return NextResponse.json({ transaction: tx.rows[0] });
}
