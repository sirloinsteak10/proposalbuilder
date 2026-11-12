import { handle, jsonError } from "@/lib/api";

/** Password login removed — Cursor private/team apps sign viewers in at the gate. */
export const POST = handle(async () => jsonError(410, "Password login is disabled. Open this app while signed in to Cursor."));
