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

  const result = await sql`
    SELECT g.*, COALESCE(SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE 0 END), 0) AS current_amount
    FROM goals g
    LEFT JOIN transactions t ON t.goal_id = g.id
    WHERE g.child_id = ${childId}
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `;
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

  const { name, target_amount, emoji } = await req.json();
  if (!name?.trim() || !target_amount) return NextResponse.json({ error: "Name and target required" }, { status: 400 });

  const result = await sql`
    INSERT INTO goals (child_id, name, target_amount, emoji)
    VALUES (${childId}, ${name.trim()}, ${parseFloat(target_amount)}, ${emoji ?? '🎯'})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0], { status: 201 });
}
