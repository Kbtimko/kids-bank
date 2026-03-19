export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isParentUnlocked } from "@/lib/auth";
import { mockChildren, addChild } from "@/lib/mock-store";

const noDb = !process.env.POSTGRES_URL;

export async function GET() {
  if (noDb) return NextResponse.json(mockChildren.map(({ id, name, display_color, avatar_emoji }) => ({ id, name, display_color, avatar_emoji })));
  const result = await sql`
    SELECT id, name, display_color, avatar_emoji FROM children ORDER BY id
  `;
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  if (!(await isParentUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, display_color, avatar_emoji } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (noDb) {
    const child = addChild(name.trim(), display_color ?? "#4F46E5", avatar_emoji ?? "⭐");
    return NextResponse.json(child, { status: 201 });
  }

  const result = await sql`
    INSERT INTO children (name, display_color, avatar_emoji)
    VALUES (${name.trim()}, ${display_color ?? "#4F46E5"}, ${avatar_emoji ?? "⭐"})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0], { status: 201 });
}
