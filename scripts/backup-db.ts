import fs from "fs";
import path from "path";

const dbPath = process.env.DATABASE_URL ?? "./data/app.db";
const resolved = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(process.cwd(), dbPath);

if (!fs.existsSync(resolved)) {
  console.error("Veritabanı bulunamadı:", resolved);
  process.exit(1);
}

const backupDir = path.join(path.dirname(resolved), "backups");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDir, `app-${stamp}.db`);
fs.copyFileSync(resolved, backupPath);
console.log("Yedek alındı:", backupPath);
