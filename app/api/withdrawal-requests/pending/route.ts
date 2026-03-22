export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getFamilySession, isParentUnlocked } from "@/lib/auth";

export async function GET() {
  if (!(await isParentUnlocked())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await sql`
    SELECT wr.*, c.name AS child_name, c.avatar_emoji
    FROM withdrawal_requests wr JOIN children c ON c.id = wr.child_id
    WHERE c.family_id = ${family.familyId} AND wr.status = 'pending'
    ORDER BY wr.requested_at ASC
  `;
  return NextResponse.json(result.rows);
}
