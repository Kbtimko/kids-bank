export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isParentUnlocked, getFamilySession } from "@/lib/auth";

export async function GET() {
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await sql`
    SELECT id, name, display_color, avatar_emoji FROM children
    WHERE family_id = ${family.familyId} ORDER BY id
  `;
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  if (!(await isParentUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const family = await getFamilySession();
  if (!family) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, display_color, avatar_emoji } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const result = await sql`
    INSERT INTO children (family_id, name, display_color, avatar_emoji)
    VALUES (${family.familyId}, ${name.trim()}, ${display_color ?? "#4F46E5"}, ${avatar_emoji ?? "⭐"})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0], { status: 201 });
}
