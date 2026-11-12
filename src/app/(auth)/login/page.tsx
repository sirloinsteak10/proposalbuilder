import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy /login path — Cursor identity signs viewers in automatically. */
export default function LoginPage() {
  redirect("/proposals");
}
