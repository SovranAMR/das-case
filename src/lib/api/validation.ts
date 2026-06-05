import { z } from "zod";
import { validateBureauEmail } from "@/lib/auth/email-policy";
import {
  CASE_STATUSES,
  DEFAULT_REMINDER_OFFSETS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  USER_ROLES,
} from "@/lib/types";

const reminderOffsetSchema = z.object({
  days: z.number().int().min(0).max(365).optional(),
  hours: z.number().int().min(0).max(168).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, "Mevcut şifre en az 8 karakter olmalı"),
    newPassword: z.string().min(8, "Yeni şifre en az 8 karakter olmalı").max(128),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Yeni şifre mevcut şifreden farklı olmalı",
    path: ["newPassword"],
  });

export const createUserSchema = z
  .object({
    email: z.string().email("Geçerli bir giriş e-postası girin"),
    name: z.string().min(2, "Ad en az 2 karakter olmalı").max(100),
    password: z.string().min(8, "Şifre en az 8 karakter olmalı").max(128),
    role: z.enum(USER_ROLES),
  })
  .superRefine((data, ctx) => {
    const check = validateBureauEmail(data.email);
    if (!check.valid) {
      ctx.addIssue({ code: "custom", message: check.message ?? "Geçersiz e-posta", path: ["email"] });
    }
  });

export const updateUserSchema = z
  .object({
    email: z.string().email("Geçerli bir giriş e-postası girin").optional(),
    name: z.string().min(2, "Ad en az 2 karakter olmalı").max(100).optional(),
    password: z.string().min(8, "Şifre en az 8 karakter olmalı").max(128).optional(),
    role: z.enum(USER_ROLES).optional(),
    active: z.boolean().optional(),
    mustChangePassword: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.email) {
      const check = validateBureauEmail(data.email);
      if (!check.valid) {
        ctx.addIssue({ code: "custom", message: check.message ?? "Geçersiz e-posta", path: ["email"] });
      }
    }
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Güncellenecek en az bir alan gerekli",
  });

export const createCaseSchema = z.object({
  courtName: z.string().min(2).max(200),
  fileNumber: z.string().min(1).max(100),
  clientName: z.string().min(2).max(200),
  title: z.string().min(2).max(300),
  status: z.enum(CASE_STATUSES).optional(),
});

export const updateCaseSchema = createCaseSchema.partial();

export const createTaskSchema = z.object({
  caseId: z.string().uuid().nullable().optional(),
  title: z.string().min(2).max(300),
  description: z.string().max(5000).optional().nullable(),
  deadline: z.string().datetime({ offset: true }).or(z.string().min(1)),
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  taskType: z.enum(TASK_TYPES).optional(),
  assignedTo: z.string().uuid("Atanan kişi seçilmeli"),
  reminderOffsets: z.array(reminderOffsetSchema).optional(),
});

export const updateTaskSchema = createTaskSchema
  .extend({
    archived: z.boolean().optional(),
    completedAt: z.string().datetime({ offset: true }).or(z.string().min(1)).optional().nullable(),
    overdueReason: z
      .string()
      .min(10, "Gecikme gerekçesi en az 10 karakter olmalı")
      .max(2000)
      .optional(),
    deadlineChangeReason: z
      .string()
      .min(10, "Son tarih değişikliği gerekçesi en az 10 karakter")
      .max(2000)
      .optional(),
  })
  .partial();

export const addNoteSchema = z.object({
  caseId: z.string().uuid().optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
  note: z.string().min(1).max(5000),
});

export const defaultReminderOffsets = DEFAULT_REMINDER_OFFSETS;
