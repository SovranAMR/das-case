import { z } from "zod";
import { USER_ROLES } from "@/lib/types";
import { parseCsvLine } from "@/lib/utils/parse-csv-line";

const bulkUserLineSchema = z.object({
  name: z.string().trim().min(2, "İsim en az 2 karakter"),
  email: z.string().trim().email("Geçersiz e-posta"),
  role: z.enum(USER_ROLES),
});

export type BulkUserLine = z.infer<typeof bulkUserLineSchema>;

export function parseBulkUsersCsv(text: string): {
  rows: BulkUserLine[];
  errors: string[];
} {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: BulkUserLine[] = [];
  const errors: string[] = [];
  const seenEmails = new Set<string>();

  lines.forEach((line, index) => {
    const parts = parseCsvLine(line);
    if (parts.length < 3) {
      errors.push(`Satır ${index + 1}: isim,e-posta,rol formatı gerekli`);
      return;
    }

    const rolePart = parts[parts.length - 1]?.toUpperCase();
    const emailPart = parts[parts.length - 2];
    const namePart = parts.slice(0, -2).join(", ");

    const parsed = bulkUserLineSchema.safeParse({
      name: namePart,
      email: emailPart,
      role: rolePart,
    });

    if (!parsed.success) {
      errors.push(`Satır ${index + 1}: ${parsed.error.issues[0]?.message ?? "Geçersiz satır"}`);
      return;
    }

    const emailKey = parsed.data.email.toLowerCase();
    if (seenEmails.has(emailKey)) {
      errors.push(`Satır ${index + 1}: tekrarlayan e-posta (${emailKey})`);
      return;
    }
    seenEmails.add(emailKey);

    rows.push(parsed.data);
  });

  return { rows, errors };
}
