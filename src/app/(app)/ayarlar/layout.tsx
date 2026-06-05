import { redirect } from "next/navigation";
import { canPerform } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/giris");
  }

  if (!canPerform(user.role, "view_admin_settings")) {
    redirect("/");
  }

  return children;
}
