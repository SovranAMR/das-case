import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AppProviders } from "@/components/providers/app-providers";
import { getSessionUser } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/giris");
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  if (user.mustChangePassword && !pathname.startsWith("/profil")) {
    redirect("/profil?changePassword=required");
  }

  return (
    <AppProviders>
      <AppShell user={user}>{children}</AppShell>
    </AppProviders>
  );
}
