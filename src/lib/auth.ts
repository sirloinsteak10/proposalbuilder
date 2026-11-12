import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

let dummyHash: string | undefined;

export class RateLimitedError extends Error {
  constructor() {
    super("Too many attempts. Try again in a few minutes.");
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verifies credentials. Throws RateLimitedError when the email or IP has too many recent
 * failures. Returns the user id on success, null on failure. Runs a dummy hash comparison for
 * unknown emails so response time does not reveal which emails exist.
 */
export async function verifyLogin(emailRaw: string, password: string, ip: string): Promise<string | null> {
  const email = emailRaw.trim().toLowerCase();
  const since = new Date(Date.now() - WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    prisma.loginAttempt.count({ where: { key: `email:${email}`, createdAt: { gt: since } } }),
    prisma.loginAttempt.count({ where: { key: `ip:${ip}`, createdAt: { gt: since } } }),
  ]);
  if (byEmail >= MAX_PER_EMAIL || byIp >= MAX_PER_IP) throw new RateLimitedError();

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);

  if (!user || !ok) {
    await prisma.loginAttempt.createMany({ data: [{ key: `email:${email}` }, { key: `ip:${ip}` }] });
    // Opportunistic cleanup of old rows.
    await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
    return null;
  }
  await prisma.loginAttempt.deleteMany({ where: { key: `email:${email}` } });
  return user.id;
}
