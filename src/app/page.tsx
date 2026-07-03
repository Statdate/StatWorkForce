import { redirect } from "next/navigation";
import { getSessionCookie, decrypt } from "@/lib/session";

const DASHBOARD_PATH: Record<string, string> = {
  ADMIN: "/admin",
  MANAGER: "/manager",
  WORKER: "/worker",
};

export default async function Home() {
  const cookie = await getSessionCookie();
  const session = await decrypt(cookie);

  if (session?.userId) {
    redirect(DASHBOARD_PATH[session.accountType] ?? "/login");
  }

  redirect("/login");
}
