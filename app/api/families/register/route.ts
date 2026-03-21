export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { createFamilySession, createParentSession, FAMILY_COOKIE, PARENT_COOKIE, TWO_HOURS, THIRTY_DAYS } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, familyName, pin } = await req.json();

  if (!email || !familyName || !pin) {
    return NextResponse.json({ error: "Email, family name, and PIN are required" }, { status: 400 });
  }
  if (typeof pin !== "string" || pin.length < 4) {
    return NextResponse.json({ error: "PIN must be at least 4 digits" }, { status: 400 });
  }

  const existing = await sql`SELECT id FROM families WHERE email = ${email.toLowerCase().trim()}`;
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const pinHash = await bcrypt.hash(pin, 12);
  const result = await sql`
    INSERT INTO families (email, name, pin_hash)
    VALUES (${email.toLowerCase().trim()}, ${familyName.trim()}, ${pinHash})
    RETURNING id, email, name
  `;
  const family = result.rows[0] as { id: number; email: string; name: string };

  const [familyToken, parentToken] = await Promise.all([
    createFamilySession(family.id, family.email, family.name),
    createParentSession(family.id),
  ]);

  const res = NextResponse.json({ success: true });
  res.cookies.set(FAMILY_COOKIE, familyToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: THIRTY_DAYS,
    path: "/",
  });
  res.cookies.set(PARENT_COOKIE, parentToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: TWO_HOURS,
    path: "/",
  });
  return res;
}
