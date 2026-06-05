import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { UserRole } from "@/lib/types";

export async function countAdmins(): Promise<number> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "ADMIN"));
  return rows.length;
}

export async function isLastAdmin(userId: string): Promise<boolean> {
  const adminCount = await countAdmins();
  if (adminCount !== 1) return false;

  const rows = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return rows[0]?.role === "ADMIN";
}

export async function wouldRemoveLastAdmin(
  userId: string,
  nextRole?: UserRole,
): Promise<boolean> {
  if (!nextRole || nextRole === "ADMIN") return false;
  return isLastAdmin(userId);
}
