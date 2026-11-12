import { z } from "zod";
import { RateLimitedError, verifyLogin } from "@/lib/auth";
import { clientIp, handle, json, jsonError, readJson } from "@/lib/api";
import { createSession } from "@/lib/session";

const bodySchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

export const POST = handle(async (req) => {
  const { email, password } = bodySchema.parse(await readJson(req, 4_000));
  try {
    const userId = await verifyLogin(email, password, clientIp(req));
    if (!userId) return jsonError(401, "Incorrect email or password");
    await createSession(userId);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof RateLimitedError) return jsonError(429, e.message);
    throw e;
  }
});
