import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/giris", "/api/auth/login"];
const SESSION_COOKIE = "is_takibi_session";

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  );
}

function forward(request: NextRequest, init?: ResponseInit): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders }, ...init });
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const cookie = request.headers.get("cookie");
  if (!cookie?.includes(`${SESSION_COOKIE}=`)) return false;

  const meUrl = new URL("/api/auth/me", request.url);
  const res = await fetch(meUrl, {
    headers: {
      cookie,
      "x-session-check": "1",
    },
    cache: "no-store",
  });
  return res.ok;
}

function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export async function middleware(request: NextRequest) {
  if (request.headers.get("x-session-check") === "1") {
    return forward(request);
  }

  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const isPublic = isPublicPath(pathname);

  if (session) {
    const valid = await hasValidSession(request);
    if (!valid) {
      if (pathname === "/giris" || isPublic) {
        return clearSessionCookie(forward(request));
      }
      if (pathname.startsWith("/api/")) {
        return clearSessionCookie(
          NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }),
        );
      }
      const loginUrl = new URL("/giris", request.url);
      loginUrl.searchParams.set("next", pathname);
      return clearSessionCookie(NextResponse.redirect(loginUrl));
    }

    if (pathname === "/giris") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (!isPublic && !session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    }
    const loginUrl = new URL("/giris", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return forward(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
