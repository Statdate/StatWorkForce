import { redirect } from "next/navigation";
import { getManagerUnits } from "@/lib/data/manager";

export default async function ManagerRootPage() {
  const units = await getManagerUnits();

  if (units.length === 0) {
    redirect("/unauthorized");
  }

  redirect(`/manager/${units[0].id}`);
}
