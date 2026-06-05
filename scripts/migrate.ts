import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = process.env.DATABASE_URL ?? "./data/app.db";
const resolved = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(process.cwd(), dbPath);

const dir = path.dirname(resolved);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(resolved);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);
migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migration tamamlandı:", resolved);
sqlite.close();
