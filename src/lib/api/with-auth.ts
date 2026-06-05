import { logApiRequest } from "@/lib/middleware/forensic-log";
import { sanitizeRequestBody } from "@/lib/middleware/sanitize-body";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { jsonUnauthorized, jsonForbidden } from "@/lib/api/response";
import type { UserRole } from "@/lib/types";

type HandlerContext = {
  user: SessionUser;
  request: Request;
};

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type Handler = (ctx: HandlerContext, routeCtx?: RouteContext) => Promise<Response>;

async function authorize(
  request: Request,
  allowedRoles?: UserRole[],
): Promise<SessionUser | Response> {
  const user = await getSessionUser();
  if (!user) return jsonUnauthorized();
  if (allowedRoles && !allowedRoles.includes(user.role)) return jsonForbidden();
  return user;
}

export function withAuth(handler: Handler, allowedRoles?: UserRole[]) {
  return async (request: Request, routeCtx: RouteContext): Promise<Response> => {
    const auth = await authorize(request, allowedRoles);
    if (auth instanceof Response) return auth;

    let bodyText: string | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        bodyText = await request.clone().text();
      } catch {
        bodyText = undefined;
      }
    }

    void logApiRequest(request, auth.id, sanitizeRequestBody(bodyText) ?? undefined);
    return handler({ user: auth, request }, routeCtx);
  };
}
