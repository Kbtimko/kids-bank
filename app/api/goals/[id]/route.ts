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
  // Verify goal belongs to this family
  const ownership = await sql`
    SELECT g.id FROM goals g JOIN children c ON c.id = g.child_id
    WHERE g.id = ${parseInt(id)} AND c.family_id = ${family.familyId}
  `;
  if (!ownership.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await sql`
    UPDATE goals SET
      name = COALESCE(${body.name ?? null}, name),
      target_amount = COALESCE(${body.target_amount ? parseFloat(body.target_amount) : null}, target_amount),
      emoji = COALESCE(${body.emoji ?? null}, emoji),
      is_completed = COALESCE(${body.is_completed ?? null}, is_completed)
    WHERE id = ${parseInt(id)} RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isParentUnlocked())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await sql`
    DELETE FROM goals WHERE id = ${parseInt(id)}
    AND child_id IN (SELECT id FROM children WHERE family_id = ${family.familyId})
  `;
  return NextResponse.json({ success: true });
}
