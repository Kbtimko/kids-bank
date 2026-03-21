export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { createFamilySession, createParentSession, FAMILY_COOKIE, PARENT_COOKIE, TWO_HOURS, THIRTY_DAYS } from "@/lib/auth";

const attempts = new Map<string, { count: number; blockedUntil: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const now = Date.now();
  const record = attempts.get(ip);
  if (record && record.blockedUntil > now) {
    const wait = Math.ceil((record.blockedUntil - now) / 60000);
    return NextResponse.json({ error: `Too many attempts. Try again in ${wait} minute(s).` }, { status: 429 });
  }

  const { email, pin } = await req.json();
  if (!email || !pin) {
    return NextResponse.json({ error: "Email and PIN are required" }, { status: 400 });
  }

  const result = await sql`SELECT id, email, name, pin_hash FROM families WHERE email = ${email.toLowerCase().trim()}`;
  const family = result.rows[0] as { id: number; email: string; name: string; pin_hash: string } | undefined;

  if (!family || !(await bcrypt.compare(pin, family.pin_hash))) {
    const prev = attempts.get(ip) ?? { count: 0, blockedUntil: 0 };
    const count = prev.count + 1;
    attempts.set(ip, { count, blockedUntil: count >= 5 ? now + 10 * 60 * 1000 : 0 });
    return NextResponse.json({ error: "Invalid email or PIN" }, { status: 401 });
  }

  attempts.delete(ip);

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
