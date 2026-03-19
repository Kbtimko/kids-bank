import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "parent_session";
const TWO_HOURS = 60 * 60 * 2;

function getSecret() {
  const secret = process.env.PARENT_JWT_SECRET;
  if (!secret) throw new Error("PARENT_JWT_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

export async function createParentSession(): Promise<string> {
  return new SignJWT({ role: "parent" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TWO_HOURS}s`)
    .sign(getSecret());
}

export async function verifyParentSession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === "parent";
  } catch {
    return false;
  }
}

export async function isParentUnlocked(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyParentSession(token);
}

export { COOKIE_NAME, TWO_HOURS };
