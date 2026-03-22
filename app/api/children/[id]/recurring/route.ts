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
  const result = await sql`SELECT * FROM recurring_transactions WHERE child_id = ${childId} ORDER BY created_at DESC`;
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

  const { type, amount, description, frequency, start_date, category } = await req.json();
  if (!type || !amount || !description || !frequency) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const nextDate = start_date ?? new Date().toISOString().split("T")[0];

  const result = await sql`
    INSERT INTO recurring_transactions (child_id, type, amount, description, frequency, next_due_date, category)
    VALUES (${childId}, ${type}, ${parseFloat(amount)}, ${description}, ${frequency}, ${nextDate}, ${category ?? null})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0], { status: 201 });
}
