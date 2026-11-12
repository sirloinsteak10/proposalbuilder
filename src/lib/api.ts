import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser, type SessionUser } from "@/lib/session";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown").slice(0, 64);
}

/** Reject cross-site state-changing requests (defence in depth on top of SameSite=Lax). */
export function assertSameOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new ApiError(403, "Invalid origin");
    }
    if (originHost !== host) throw new ApiError(403, "Cross-origin request blocked");
    return;
  }
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new ApiError(403, "Cross-site request blocked");
}

export async function readJson(req: NextRequest, maxBytes = 600_000): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new ApiError(413, "Request body too large");
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError(413, "Request body too large");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "Invalid JSON");
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Not signed in");
  return user;
}

const ID_RE = /^[a-z0-9]{20,32}$/;
export function validId(id: string): string {
  if (!ID_RE.test(id)) throw new ApiError(404, "Not found");
  return id;
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/** Wraps a route handler: same-origin check, and uniform error responses without leaking internals. */
export function handle<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return jsonError(e.status, e.message);
      if (e instanceof ZodError) {
        return jsonError(400, "Invalid data", {
          issues: e.issues.slice(0, 20).map((i) => ({ path: i.path.join("."), message: i.message })),
        });
      }
      console.error("API error", e);
      return jsonError(500, "Something went wrong");
    }
  };
}
