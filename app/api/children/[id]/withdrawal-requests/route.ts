export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getFamilySession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const childId = parseInt(id);
  const ownership = await sql`SELECT id FROM children WHERE id = ${childId} AND family_id = ${family.familyId}`;
  if (!ownership.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await sql`SELECT * FROM withdrawal_requests WHERE child_id = ${childId} ORDER BY requested_at DESC LIMIT 20`;
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const childId = parseInt(id);
  const ownership = await sql`SELECT id FROM children WHERE id = ${childId} AND family_id = ${family.familyId}`;
  if (!ownership.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { amount, description, want_need } = await req.json();
  if (!amount || !description) return NextResponse.json({ error: "Amount and description required" }, { status: 400 });

  const result = await sql`
    INSERT INTO withdrawal_requests (child_id, amount, description, want_need)
    VALUES (${childId}, ${parseFloat(amount)}, ${description}, ${want_need ?? null})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0], { status: 201 });
}
