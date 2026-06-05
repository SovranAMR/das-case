import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

type AppDb = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
  db?: AppDb;
};

function getDatabasePath(): string {
  const configured = process.env.DATABASE_URL ?? "./data/app.db";
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

function createDatabase() {
  const dbPath = getDatabasePath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");

  return drizzle(sqlite, { schema });
}

function getDb(): AppDb {
  if (!globalForDb.db) {
    globalForDb.db = createDatabase();
  }
  return globalForDb.db;
}

export const db = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver) as unknown;
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
