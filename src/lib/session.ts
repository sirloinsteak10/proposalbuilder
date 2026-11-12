import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { headers } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { getIdentity } from "../../cursor/identity";
import { prisma } from "@/lib/db";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF";
}

/** Ephemeral signing key for short-lived print tokens (no hardcoded secret). */
let printSecret: Uint8Array | undefined;
function printKey(): Uint8Array {
  const fromEnv = process.env.PRINT_TOKEN_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) return new TextEncoder().encode(fromEnv);
  printSecret ??= randomBytes(48);
  return printSecret;
}

function emailForSub(sub: string, email: string): string {
  const trimmed = email.trim().toLowerCase();
  if (trimmed) return trimmed.slice(0, 200);
  const slug = createHash("sha256").update(sub).digest("hex").slice(0, 24);
  return `viewer-${slug}@users.local`;
}

async function ensureDbUser(identity: {
  sub: string;
  email: string;
  name: string;
  kind?: string;
  teamRole?: string;
}): Promise<SessionUser | null> {
  if (identity.kind === "key") return null;
  const email = emailForSub(identity.sub, identity.email);
  const name = (identity.name.trim() || email.split("@")[0] || "Viewer").slice(0, 120);
  const role = identity.teamRole === "admin" ? "ADMIN" : "STAFF";
  // passwordHash is unused with Cursor identity; store an unusable marker (additive schema).
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      role,
      passwordHash: "!",
    },
    update: { name, role },
    select: { id: true, email: true, name: true, role: true },
  });
  return user;
}

async function userFromHeaders(headerBag: Headers): Promise<SessionUser | null> {
  const identity = await getIdentity(headerBag);
  if (!identity.verified) return null;
  return ensureDbUser(identity);
}

/** Returns the signed-in Cursor viewer as an app user, or null. Memoised per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  return userFromHeaders(await headers());
});

/** API routes pass the request so identity comes from the same headers as the page. */
export async function getUserFromRequest(req: Request): Promise<SessionUser | null> {
  return userFromHeaders(req.headers);
}

/** Short-lived token that lets the headless browser render a single proposal for PDF export. */
export async function signPrintToken(proposalId: string): Promise<string> {
  return new SignJWT({ typ: "print", pid: proposalId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("90s")
    .sign(printKey());
}

export async function verifyPrintToken(token: string | undefined, proposalId: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, printKey(), { algorithms: ["HS256"] });
    return payload.typ === "print" && payload.pid === proposalId;
  } catch {
    return false;
  }
}
