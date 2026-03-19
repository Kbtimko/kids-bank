export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { isParentUnlocked } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const [multiplier, floor] = await Promise.all([
    getSetting("interest_multiplier"),
    getSetting("interest_floor_percent"),
  ]);
  return NextResponse.json({
    interest_multiplier: multiplier ?? "2",
    interest_floor_percent: floor ?? "5",
  });
}

export async function PUT(req: NextRequest) {
  if (!(await isParentUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.interest_multiplier !== undefined) {
    await setSetting("interest_multiplier", String(parseFloat(body.interest_multiplier)));
  }
  if (body.interest_floor_percent !== undefined) {
    await setSetting("interest_floor_percent", String(parseFloat(body.interest_floor_percent)));
  }
  if (body.new_pin) {
    if (body.new_pin.length < 4) {
      return NextResponse.json({ error: "PIN must be at least 4 digits" }, { status: 400 });
    }
    const hash = await bcrypt.hash(body.new_pin, 12);
    await setSetting("parent_pin_hash", hash);
  }

  return NextResponse.json({ success: true });
}
