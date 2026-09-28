import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // 1. ตรวจสอบการมีอยู่ของ Stateful Session Cookie (HttpOnly)
  const sessionToken = req.cookies.get("session_token")?.value;

  // 2. ข้ามการตรวจสอบสำหรับ Assets, Static files, Next.js Internal และระบบ Authentication
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

  // 3. กำหนดเงื่อนไข Public Read-Only (Visitor เข้าถึงได้เฉพาะ Method GET เท่านั้น)
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
      /^\/api\/posts\/\d+$/.test(pathname) ||       // GET /api/posts/[id]
      pathname === "/api/listings" ||
      /^\/api\/listings\/\d+$/.test(pathname) ||    // GET /api/listings/[id]
      pathname.startsWith("/api/articles") ||
      pathname.startsWith("/api/places"));

  // หากเป็น Visitor ที่เข้ามาอ่านข้อมูล Public ให้ผ่านไปได้ทันที
  if (isPublicReadPage || isPublicReadAPI) {
    return NextResponse.next();
  }

  // 4. กรณีที่ไม่มี Session (เป็น Visitor หรือ Session หลุด) แล้วพยายามทำ Mutation หรือเข้าโซนปิด
  if (!sessionToken) {
    // 4.1 ถ้าเป็นคำขอฝั่ง API -> ตอบกลับ 401 Unauthorized พร้อม JSON Error
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: กรุณาเข้าสู่ระบบก่อนทำรายการ",
        },
        { status: 401 }
      );
    }

    // 4.2 ถ้าเป็นการนำทางผ่านหน้าเบราว์เซอร์ -> Redirect ไปหน้า /login พร้อมแนบ URL เดิมไว้ใน query
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. หากมี Session Token อนุญาตให้คำขอทำงานต่อไป
  return NextResponse.next();
}

// ระบุเส้นทางทั้งหมดที่ต้องการให้ Middleware ทำงานตรวจสอบ
export const config = {
  matcher: [
    /*
     * ตรวจจับทุกเส้นทาง ยกเว้น:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - ไฟล์นามสกุลรูปภาพ เช่น .svg, .png, .jpg, .jpeg, .webp
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};