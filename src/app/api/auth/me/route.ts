import { handle, json, requireUser } from "@/lib/api";

export const GET = handle(async (req) => {
  const user = await requireUser(req);
  return json({ user });
});
