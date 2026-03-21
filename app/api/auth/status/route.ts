export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { isParentUnlocked, getFamilySession } from "@/lib/auth";

export async function GET() {
  const [unlocked, family] = await Promise.all([isParentUnlocked(), getFamilySession()]);
  return NextResponse.json({
    unlocked,
    familyName: family?.familyName ?? null,
    email: family?.email ?? null,
  });
}
