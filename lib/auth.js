import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_dev_secret_key_change_me_in_prod"
);

const ALG = "HS256";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  console.warn("WARNING: JWT_SECRET is not set in production. Using default insecure key.");
}

/**
 * Hash a plain text password.
 */
export async function hashPassword(plain) {
  return await bcrypt.hash(plain, 10);
}

/**
 * Verify a password against a hash.
 */
export async function verifyPassword(plain, hash) {
  return await bcrypt.compare(plain, hash);
}

/**
 * Sign a JWT token with user payload.
 */
export async function signToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d") // 7 days session
    .sign(SECRET_KEY);
}

/**
 * Verify a JWT token.
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: [ALG],
    });
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Get current user from server-side request (App Router).
 * Can be used in API routes or Server Components.
 */
export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

/**
 * Helper to get user ID or throw error (for protected API routes).
 */
export async function requireUser() {
  const user = await getUser();
  if (!user || !user.id) {
    throw new Error("Unauthorized");
  }
  return user.id;
}
