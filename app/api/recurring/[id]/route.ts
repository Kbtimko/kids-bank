export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getFamilySession, isParentUnlocked } from "@/lib/auth";

async function verifyOwnership(id: number, familyId: number) {
  const r = await sql`
    SELECT rt.id FROM recurring_transactions rt JOIN children c ON c.id = rt.child_id
    WHERE rt.id = ${id} AND c.family_id = ${familyId}
  `;
  return r.rows[0] ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isParentUnlocked())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!await verifyOwnership(parseInt(id), family.familyId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const result = await sql`
    UPDATE recurring_transactions SET
      is_active = COALESCE(${body.is_active ?? null}, is_active),
      amount = COALESCE(${body.amount ? parseFloat(body.amount) : null}, amount),
      description = COALESCE(${body.description ?? null}, description),
      category = COALESCE(${body.category ?? null}, category)
    WHERE id = ${parseInt(id)} RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isParentUnlocked())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!await verifyOwnership(parseInt(id), family.familyId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await sql`DELETE FROM recurring_transactions WHERE id = ${parseInt(id)}`;
  return NextResponse.json({ success: true });
}
