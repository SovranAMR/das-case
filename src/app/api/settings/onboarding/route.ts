import { eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases, settings, tasks, users } from "@/lib/db/schema";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export const runtime = "nodejs";

const BACKUP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const GET = withAuth(
  async () => {
    const [userRow] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [caseRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(isNull(cases.deletedAt));
    const [taskRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(isNull(tasks.deletedAt));

    const backup = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "last_backup_at"))
      .limit(1);

    const backupFresh = backup[0]?.value
      ? Date.now() - new Date(backup[0].value).getTime() <= BACKUP_MAX_AGE_MS
      : false;

    const items = [
      {
        id: "users",
        label: "En az 2 kullanıcı oluştur",
        done: (userRow?.count ?? 0) >= 2,
        href: "/ayarlar",
      },
      {
        id: "case",
        label: "İlk dosyayı ekle",
        done: (caseRow?.count ?? 0) >= 1,
        href: "/dosyalar",
      },
      {
        id: "task",
        label: "İlk işi oluştur",
        done: (taskRow?.count ?? 0) >= 1,
        href: "/isler",
      },
      {
        id: "backup",
        label: "Son 7 gün içinde yedek al",
        done: backupFresh,
        href: "/ayarlar",
      },
    ];

    return jsonOk({
      items,
      complete: items.every((item) => item.done),
    });
  },
  ["ADMIN"],
);
