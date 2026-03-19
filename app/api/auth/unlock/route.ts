export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createParentSession, COOKIE_NAME, TWO_HOURS } from "@/lib/auth";
import { getSetting as getSettingDb } from "@/lib/db";

// Simple in-memory rate limiter (resets on cold start, fine for family app)
const attempts = new Map<string, { count: number; blockedUntil: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const now = Date.now();

  const record = attempts.get(ip);
  if (record && record.blockedUntil > now) {
    const wait = Math.ceil((record.blockedUntil - now) / 60000);
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${wait} minute(s).` },
      { status: 429 }
    );
  }

  const { pin } = await req.json();
  if (!pin || typeof pin !== "string") {
    return NextResponse.json({ error: "PIN required" }, { status: 400 });
  }

  let hash = await getSettingDb("parent_pin_hash");
  // No DB yet (local preview) — accept default PIN "1234"
  if (!hash) {
    if (process.env.POSTGRES_URL) {
      return NextResponse.json({ error: "App not configured" }, { status: 500 });
    }
    const bcrypt = await import("bcryptjs");
    hash = await bcrypt.hash("1234", 10);
  }

  const valid = await bcrypt.compare(pin, hash);
  if (!valid) {
    const prev = attempts.get(ip) ?? { count: 0, blockedUntil: 0 };
    const count = prev.count + 1;
    const blockedUntil = count >= 5 ? now + 10 * 60 * 1000 : 0;
    attempts.set(ip, { count, blockedUntil });
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  attempts.delete(ip);
  const token = await createParentSession();

  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: TWO_HOURS,
    path: "/",
  });
  return res;
}
