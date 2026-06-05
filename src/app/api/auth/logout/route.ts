import { destroySession } from "@/lib/auth/session";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export const runtime = "nodejs";

export const POST = withAuth(async () => {
  await destroySession();
  return jsonOk({ success: true });
});
