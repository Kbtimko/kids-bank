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

  const reqResult = await sql`
    SELECT wr.* FROM withdrawal_requests wr JOIN children c ON c.id = wr.child_id
    WHERE wr.id = ${parseInt(id)} AND c.family_id = ${family.familyId}
  `;
  if (!reqResult.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const request = reqResult.rows[0] as Record<string, unknown>;
  if (request.status !== "pending") return NextResponse.json({ error: "Already resolved" }, { status: 409 });

  const { status, parent_note } = body;
  if (!["approved", "denied"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  await sql`
    UPDATE withdrawal_requests SET status = ${status}, parent_note = ${parent_note ?? null}, resolved_at = NOW()
    WHERE id = ${parseInt(id)}
  `;

  // If approved, create withdrawal transaction
  if (status === "approved") {
    const today = new Date().toISOString().split("T")[0];
    await sql`
      INSERT INTO transactions (child_id, type, amount, description, transaction_date)
      VALUES (${request.child_id}, 'withdrawal', ${request.amount}, ${request.description}, ${today})
    `;
  }

  return NextResponse.json({ success: true });
}
