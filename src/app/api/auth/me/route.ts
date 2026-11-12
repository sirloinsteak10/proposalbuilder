import { handle, json, requireUser } from "@/lib/api";

export const GET = handle(async () => {
  const user = await requireUser();
  return json({ user });
});
