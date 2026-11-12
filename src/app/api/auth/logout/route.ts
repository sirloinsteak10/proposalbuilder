import { handle, json } from "@/lib/api";

/** Cursor hosts manage sign-in; this endpoint is a no-op for client cleanup. */
export const POST = handle(async () => json({ ok: true }));
