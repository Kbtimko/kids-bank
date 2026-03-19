import { NextRequest, NextResponse } from "next/server";
import { verifyParentSession, COOKIE_NAME } from "@/lib/auth";

const PROTECTED_PATTERNS = [
  { method: "POST", path: /^\/api\/children$/ },
  { method: "POST", path: /^\/api\/transactions$/ },
  { method: "DELETE", path: /^\/api\/transactions\// },
  { method: "POST", path: /^\/api\/interest\/apply$/ },
  { method: "PUT", path: /^\/api\/settings$/ },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  const isProtected = PROTECTED_PATTERNS.some(
    (p) => p.method === method && p.path.test(pathname)
  );

  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token || !(await verifyParentSession(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
