import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { jsonError } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export const runtime = "nodejs";

export const GET = withAuth(
  async () => {
    const dbPath = process.env.DATABASE_URL ?? "./data/app.db";
    const resolved = path.isAbsolute(dbPath)
      ? dbPath
      : path.join(process.cwd(), dbPath);

    if (!fs.existsSync(resolved)) {
      return jsonError("Veritabanı bulunamadı", 404);
    }

    const now = new Date().toISOString();
    await db
      .insert(settings)
      .values({ key: "last_backup_at", value: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: now },
      });

    const backupPath = resolved + ".backup";
    const source = new Database(resolved, { readonly: true });
    try {
      source.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
    } finally {
      source.close();
    }

    const buffer = fs.readFileSync(backupPath);
    fs.unlinkSync(backupPath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="is-takibi-backup-${new Date().toISOString().slice(0, 10)}.db"`,
      },
    });
  },
  ["ADMIN"],
);
