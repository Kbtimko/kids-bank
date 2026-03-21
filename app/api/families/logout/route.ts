export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { FAMILY_COOKIE, PARENT_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(FAMILY_COOKIE);
  res.cookies.delete(PARENT_COOKIE);
  return res;
}
