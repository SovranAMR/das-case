import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["ADMIN", "LAWYER", "SECRETARY"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
  mustChangePassword: integer("must_change_password", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const loginAttempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: integer("reset_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const cases = sqliteTable("cases", {
  id: text("id").primaryKey(),
  courtName: text("court_name").notNull(),
  fileNumber: text("file_number").notNull(),
  clientName: text("client_name").notNull(),
  title: text("title").notNull(),
  caseType: text("case_type", { enum: ["HUKUK", "ICRA", "IS", "CEZA"] })
    .notNull()
    .default("HUKUK"),
  currentStage: text("current_stage").notNull().default("OPENED"),
  opposingParty: text("opposing_party"),
  judgeName: text("judge_name"),
  nextHearingAt: integer("next_hearing_at", { mode: "timestamp_ms" }),
  summary: text("summary"),
  openedAt: integer("opened_at", { mode: "timestamp_ms" }),
  status: text("status", { enum: ["ACTIVE", "CLOSED", "ARCHIVED"] })
    .notNull()
    .default("ACTIVE"),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const caseEvents = sqliteTable("case_events", {
  id: text("id").primaryKey(),
  caseId: text("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
  metadata: text("metadata"),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});

export const caseNotes = sqliteTable("case_notes", {
  id: text("id").primaryKey(),
  caseId: text("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  caseId: text("case_id").references(() => cases.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  deadline: integer("deadline", { mode: "timestamp_ms" }).notNull(),
  priority: text("priority", {
    enum: ["LOW", "NORMAL", "URGENT", "LEGAL_DEADLINE"],
  })
    .notNull()
    .default("NORMAL"),
  status: text("status", {
    enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  })
    .notNull()
    .default("PENDING"),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  taskType: text("task_type", {
    enum: ["HEARING", "PETITION", "RESPONSE_DEADLINE", "ENFORCEMENT", "GENERAL"],
  })
    .notNull()
    .default("GENERAL"),
  assignedTo: text("assigned_to").references(() => users.id, {
    onDelete: "set null",
  }),
  assignedAt: integer("assigned_at", { mode: "timestamp_ms" }),
  archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
  reminderOffsets: text("reminder_offsets").notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  remindAt: integer("remind_at", { mode: "timestamp_ms" }).notNull(),
  dismissedAt: integer("dismissed_at", { mode: "timestamp_ms" }),
  sentAt: integer("sent_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey(),
  caseId: text("case_id").references(() => cases.id, { onDelete: "set null" }),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  details: text("details"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const requestLogs = sqliteTable("request_logs", {
  id: text("id").primaryKey(),
  method: text("method").notNull(),
  path: text("path").notNull(),
  body: text("body"),
  clientIp: text("client_ip"),
  userAgent: text("user_agent"),
  acceptLanguage: text("accept_language"),
  userId: text("user_id"),
  cfRay: text("cf_ray"),
  countryCode: text("country_code"),
  platform: text("platform"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const escalationDismissals = sqliteTable(
  "escalation_dismissals",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dismissedAt: integer("dismissed_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    taskUserIdx: uniqueIndex("escalation_dismissals_task_user_idx").on(
      table.taskId,
      table.userId,
    ),
  }),
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
