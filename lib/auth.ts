import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const FAMILY_COOKIE = "family_session";
const PARENT_COOKIE = "parent_session";
const TWO_HOURS = 60 * 60 * 2;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function getSecret() {
  const secret = process.env.PARENT_JWT_SECRET ?? "dev-secret-do-not-use-in-production";
  return new TextEncoder().encode(secret);
}

// --- Family session (persistent login) ---

export async function createFamilySession(familyId: number, email: string, familyName: string): Promise<string> {
  return new SignJWT({ familyId, email, familyName })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${THIRTY_DAYS}s`)
    .sign(getSecret());
}

export async function getFamilySession(): Promise<{ familyId: number; email: string; familyName: string } | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(FAMILY_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.familyId || !payload.email) return null;
    return {
      familyId: payload.familyId as number,
      email: payload.email as string,
      familyName: (payload.familyName as string) ?? "My Family",
    };
  } catch {
    return null;
  }
}

// --- Parent session (elevated admin mode) ---

export async function createParentSession(familyId: number): Promise<string> {
  return new SignJWT({ familyId, role: "parent" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TWO_HOURS}s`)
    .sign(getSecret());
}

export async function isParentUnlocked(): Promise<boolean> {
  const cookieStore = cookies();
  const token = cookieStore.get(PARENT_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === "parent";
  } catch {
    return false;
  }
}

export async function verifyParentSession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === "parent";
  } catch {
    return false;
  }
}

export { FAMILY_COOKIE, PARENT_COOKIE, TWO_HOURS, THIRTY_DAYS };
// backward compat
export const COOKIE_NAME = PARENT_COOKIE;
