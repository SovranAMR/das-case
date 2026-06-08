import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  let officeName = "DAS Case";
  try {
    const row = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "office_name"))
      .limit(1);
    if (row[0]?.value) officeName = row[0].value;
  } catch {
    /* fresh db — no settings yet */
  }

  return Response.json({
    app: "das-case",
    name: officeName,
    version: process.env.APP_VERSION ?? process.env.npm_package_version ?? "1.0.1",
    port: parseInt(process.env.PORT ?? "3000", 10),
  });
}
