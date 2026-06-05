import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

const MAX_BACKUPS = 5;
const BACKUP_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 saat

let intervalHandle: ReturnType<typeof setInterval> | null = null;

function getBackupDir(dataPath: string): string {
  const dir = path.join(dataPath, "backups");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export function runBackup(dbPath: string, dataPath: string): string | null {
  if (!fs.existsSync(dbPath)) return null;

  const backupDir = getBackupDir(dataPath);
  const backupFile = path.join(backupDir, `backup-${getTimestamp()}.db`);

  try {
    const source = new Database(dbPath, { readonly: true });
    try {
      source.exec(`VACUUM INTO '${backupFile.replace(/'/g, "''")}'`);
    } finally {
      source.close();
    }

    pruneOldBackups(backupDir);
    return backupFile;
  } catch (err) {
    console.error("[AutoBackup] Yedek alınamadı:", err);
    return null;
  }
}

function pruneOldBackups(backupDir: string): void {
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".db"))
    .sort()
    .reverse();

  for (const file of files.slice(MAX_BACKUPS)) {
    try {
      fs.unlinkSync(path.join(backupDir, file));
    } catch {
      /* best effort */
    }
  }
}

export function startAutoBackup(dbPath: string, dataPath: string): void {
  runBackup(dbPath, dataPath);

  intervalHandle = setInterval(() => {
    runBackup(dbPath, dataPath);
  }, BACKUP_INTERVAL_MS);
}

export function stopAutoBackup(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

/**
 * WAL checkpoint + integrity check. Call on graceful shutdown.
 */
export function checkpointAndVerify(dbPath: string): {
  ok: boolean;
  error?: string;
} {
  if (!fs.existsSync(dbPath)) return { ok: true };

  try {
    const sqlite = new Database(dbPath);

    sqlite.pragma("wal_checkpoint(TRUNCATE)");

    const result = sqlite.pragma("integrity_check") as { integrity_check: string }[];
    sqlite.close();

    const status = result[0]?.integrity_check;
    if (status === "ok") return { ok: true };

    return { ok: false, error: `Integrity check: ${status}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
