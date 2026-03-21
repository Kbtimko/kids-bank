import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { PARENT_COOKIE, FAMILY_COOKIE } from "@/lib/auth";

const PROTECTED_API_PATTERNS = [
  { method: "POST", path: /^\/api\/children$/ },
  { method: "POST", path: /^\/api\/transactions$/ },
  { method: "DELETE", path: /^\/api\/transactions\// },
  { method: "POST", path: /^\/api\/interest\/apply$/ },
  { method: "PUT", path: /^\/api\/settings$/ },
];

function getSecret() {
  const secret = process.env.PARENT_JWT_SECRET ?? "dev-secret-do-not-use-in-production";
  return new TextEncoder().encode(secret);
}

async function verifyJwt(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // Always allow: auth/family API routes, share links, static files
  if (
    pathname.startsWith("/api/families/") ||
    pathname.startsWith("/api/share") ||
    pathname.startsWith("/share") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // For protected API routes: require parent session
  if (pathname.startsWith("/api/")) {
    const isProtected = PROTECTED_API_PATTERNS.some(
      (p) => p.method === method && p.path.test(pathname)
    );
    if (!isProtected) return NextResponse.next();

    const token = req.cookies.get(PARENT_COOKIE)?.value;
    if (!token || !(await verifyJwt(token))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // For page routes: allow /login and /register without auth
  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.next();
  }

  // All other pages require family session
  const familyToken = req.cookies.get(FAMILY_COOKIE)?.value;
  if (!familyToken || !(await verifyJwt(familyToken))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
