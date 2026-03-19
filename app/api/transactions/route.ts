import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isParentUnlocked } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await isParentUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { child_id, type, amount, description, transaction_date } = await req.json();

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

  const date = transaction_date ?? new Date().toISOString().split("T")[0];

  const result = await sql`
    INSERT INTO transactions (child_id, type, amount, description, transaction_date)
    VALUES (${child_id}, ${type}, ${amt}, ${description}, ${date})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0], { status: 201 });
}
