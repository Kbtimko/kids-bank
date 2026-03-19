import { NextResponse } from "next/server";
import { getFedRate } from "@/lib/fred";

export async function GET() {
  const result = await getFedRate();
  return NextResponse.json(result);
}
