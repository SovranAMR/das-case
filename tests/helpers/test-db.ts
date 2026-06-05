import { randomUUID } from "crypto";
import { mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/lib/db/schema";

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export function createTestDb(): { db: TestDb; cleanup: () => void } {
  const dir = join(tmpdir(), `is-takibi-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  const dbPath = join(dir, "test.db");

  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./drizzle" });

  return {
    db,
    cleanup: () => {
      sqlite.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export async function seedAdminUser(database: TestDb): Promise<string> {
  const id = randomUUID();
  await database.insert(schema.users).values({
    id,
    email: `admin-${id.slice(0, 8)}@buro.local`,
    name: "Test Admin",
    passwordHash: "hash",
    role: "ADMIN",
    mustChangePassword: false,
  });
  return id;
}

export async function seedSoftDeletedTask(
  database: TestDb,
  userId: string,
): Promise<string> {
  const id = randomUUID();
  const now = new Date();
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 7);

  await database.insert(schema.tasks).values({
    id,
    title: "Test iş",
    deadline,
    assignedTo: userId,
    assignedAt: now,
    reminderOffsets: "[]",
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: now,
  });

  return id;
}

export async function seedOverdueTask(
  database: TestDb,
  userId: string,
  daysOverdue: number,
): Promise<string> {
  const id = randomUUID();
  const now = new Date();
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() - daysOverdue);

  await database.insert(schema.tasks).values({
    id,
    title: "Gecikmiş iş",
    deadline,
    status: "PENDING",
    assignedTo: userId,
    assignedAt: now,
    reminderOffsets: "[]",
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}
