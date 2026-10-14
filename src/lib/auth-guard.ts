import { NextRequest , NextResponse} from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
};

export async function requireAdmin() {
  const user = await getSessionUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { message: "Unauthorized: กรุณาเข้าสู่ระบบก่อนทำรายการ" },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      authorized: false,
      response: NextResponse.json(
        { message: "Forbidden: บัญชีของคุณไม่มีสิทธิ์เข้าถึงส่วนนี้" },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user,
  };
}

export async function getSessionUser(req?: NextRequest): Promise<AuthenticatedUser | null> {
  let sessionToken: string | undefined;

  // 1. ตรวจสอบจาก Stateful Session (CPE OAuth)
  if (req) {
    // กรณีเรียกจาก API Route หรือ Middleware
    sessionToken = req.cookies.get("session_token")?.value;
  } else {
    // กรณีเรียกจาก Server Component เช่น layout.tsx หรือ page.tsx
    const cookieStore = await cookies();
    sessionToken = cookieStore.get("session_token")?.value;
  }

  if (sessionToken) {
    const dbSession = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    // ตรวจสอบว่ามี session และยังไม่หมดอายุ
    if (dbSession && new Date(dbSession.expires) > new Date()) {
      return {
        id: dbSession.user.id,
        email: dbSession.user.email,
        name: dbSession.user.name,
        role: dbSession.user.role as "USER" | "ADMIN",
      };
    }
  }

  // 2. ตรวจสอบจาก Auth.js Session (Google OAuth / Credentials)
  const authSession = await auth();
  const authEmail = authSession?.user?.email;
  if (authEmail) {
    const sessionUser = authSession.user;

    // Credentials sessions already contain the database id and role in the JWT.
    // Avoid a second user lookup for this common path.
    if (
      sessionUser.id &&
      /^\d+$/.test(sessionUser.id) &&
      sessionUser.name &&
      sessionUser.role
    ) {
      return {
        id: Number(sessionUser.id),
        email: authEmail,
        name: sessionUser.name,
        role: sessionUser.role as "USER" | "ADMIN",
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: authEmail },
      select: userSelect,
    });

    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as "USER" | "ADMIN",
      };
    }
  }

  return null;
}