export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isParentUnlocked, getFamilySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await isParentUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { child_id, type, amount, description, transaction_date, category, is_need, notes, goal_id } = await req.json();

  if (!child_id || !type || !amount || !description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!["deposit", "withdrawal", "interest"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  // Verify child belongs to this family
  const ownership = await sql`SELECT id FROM children WHERE id = ${child_id} AND family_id = ${family.familyId}`;
  if (!ownership.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const date = transaction_date ?? new Date().toISOString().split("T")[0];
  const result = await sql`
    INSERT INTO transactions (child_id, type, amount, description, transaction_date, category, is_need, notes, goal_id)
    VALUES (${child_id}, ${type}, ${amt}, ${description}, ${date}, ${category ?? null}, ${is_need ?? null}, ${notes ?? null}, ${goal_id ?? null})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0], { status: 201 });
}
