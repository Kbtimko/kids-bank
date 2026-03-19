import { NextResponse } from "next/server";
import { isParentUnlocked } from "@/lib/auth";

export async function GET() {
  const unlocked = await isParentUnlocked();
  return NextResponse.json({ unlocked });
}
