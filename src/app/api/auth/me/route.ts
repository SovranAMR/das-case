import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export const runtime = "nodejs";

export const GET = withAuth(async ({ user }) => jsonOk({ user }));
