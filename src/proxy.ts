import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  const sessionToken = req.cookies.get("session_token")?.value;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    return NextResponse.next();
  }

  const isPublicReadPage =
    method === "GET" &&
    (pathname === "/" ||
      pathname.startsWith("/posts") ||
      pathname.startsWith("/listings") ||
      pathname.startsWith("/articles") ||
      pathname.startsWith("/places"));

  const isPublicReadAPI =
    method === "GET" &&
    (pathname === "/api/posts" ||
      /^\/api\/posts\/\d+$/.test(pathname) ||
      pathname === "/api/listings" ||
      /^\/api\/listings\/\d+$/.test(pathname) ||
      pathname.startsWith("/api/articles") ||
      pathname.startsWith("/api/places"));

  if (isPublicReadPage || isPublicReadAPI) {
    return NextResponse.next();
  }

  if (!sessionToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: กรุณาเข้าสู่ระบบก่อนทำรายการ",
        },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
