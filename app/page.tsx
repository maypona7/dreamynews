import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function RootPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!session.appUser || session.appUser.status === "pending") {
    redirect("/pending");
  }
  if (session.appUser.status === "rejected") redirect("/rejected");
  redirect("/feed");
}
