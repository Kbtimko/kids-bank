export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isParentUnlocked, getFamilySession } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isParentUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // Only delete if the transaction belongs to a child in this family
  await sql`
    DELETE FROM transactions WHERE id = ${parseInt(id)}
    AND child_id IN (SELECT id FROM children WHERE family_id = ${family.familyId})
  `;
  return NextResponse.json({ success: true });
}
