export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getFamilySession, isParentUnlocked } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isParentUnlocked())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const choreRow = await sql`
    SELECT ch.* FROM chores ch JOIN children c ON c.id = ch.child_id
    WHERE ch.id = ${parseInt(id)} AND c.family_id = ${family.familyId}
  `;
  if (!choreRow.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const chore = choreRow.rows[0] as Record<string, unknown>;

  // Mark complete: create transaction + set completed_at
  if (body.complete && !chore.completed_at) {
    const today = new Date().toISOString().split("T")[0];
    await sql`UPDATE chores SET completed_at = ${today} WHERE id = ${parseInt(id)}`;
    if (parseFloat(chore.reward_amount as string) > 0) {
      await sql`
        INSERT INTO transactions (child_id, type, amount, description, transaction_date, category, goal_id)
        VALUES (${chore.child_id}, 'deposit', ${chore.reward_amount}, ${`Chore: ${chore.name}`}, ${today}, 'chore', ${body.goal_id ?? null})
      `;
    }
  }

  const result = await sql`SELECT * FROM chores WHERE id = ${parseInt(id)}`;
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isParentUnlocked())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await sql`
    DELETE FROM chores WHERE id = ${parseInt(id)}
    AND child_id IN (SELECT id FROM children WHERE family_id = ${family.familyId})
  `;
  return NextResponse.json({ success: true });
}
