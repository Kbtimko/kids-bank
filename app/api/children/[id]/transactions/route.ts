export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getFamilySession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const childId = parseInt(id);
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = (page - 1) * limit;

  // Verify ownership
  const ownership = await sql`SELECT id FROM children WHERE id = ${childId} AND family_id = ${family.familyId}`;
  if (!ownership.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [rows, countResult] = await Promise.all([
    sql`
      SELECT id, type, amount, description, transaction_date
      FROM transactions
      WHERE child_id = ${childId}
      ORDER BY transaction_date DESC, created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql`SELECT COUNT(*) FROM transactions WHERE child_id = ${childId}`,
  ]);

  const total = parseInt(countResult.rows[0].count as string);
  return NextResponse.json({
    transactions: rows.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
