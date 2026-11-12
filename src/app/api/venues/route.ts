import { handle, json, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

export const GET = handle(async (req) => {
  await requireUser(req);
  const venues = await prisma.venue.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return json({ venues });
});
