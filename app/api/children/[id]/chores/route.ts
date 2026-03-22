export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getFamilySession, isParentUnlocked } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const childId = parseInt(id);
  const ownership = await sql`SELECT id FROM children WHERE id = ${childId} AND family_id = ${family.familyId}`;
  if (!ownership.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await sql`SELECT * FROM chores WHERE child_id = ${childId} ORDER BY completed_at IS NULL DESC, created_at DESC`;
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isParentUnlocked())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const childId = parseInt(id);
  const ownership = await sql`SELECT id FROM children WHERE id = ${childId} AND family_id = ${family.familyId}`;
  if (!ownership.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, reward_amount, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const result = await sql`
    INSERT INTO chores (child_id, name, reward_amount, notes)
    VALUES (${childId}, ${name.trim()}, ${parseFloat(reward_amount ?? 0)}, ${notes ?? null})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0], { status: 201 });
}
