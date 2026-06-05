import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }

  return children;
}
