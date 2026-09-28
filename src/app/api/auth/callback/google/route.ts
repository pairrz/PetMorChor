import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionAndSetCookie } from "@/lib/session";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", req.url));
  }

  try {
    // 1. แลกเปลี่ยน Authorization Code เป็น Access Token[cite: 6]
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
            grant_type: "authorization_code",
        }),
        });

    const tokens: GoogleTokenResponse = await tokenResponse.json();
    if (!tokens.access_token) {
      return NextResponse.redirect(new URL("/login?error=token_failed", req.url));
    }

    // 2. ดึงข้อมูล User Profile จาก Resource URL ของ Google
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser: GoogleUserInfo = await userResponse.json();

    // 3. ค้นหาหรือสร้างผู้ใช้ในฐานข้อมูล (Upsert User)
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          oauthProvider: "google",
        },
      });
    } else if (!user.oauthProvider) {
      // ถ้าเคยสมัครด้วยรหัสผ่านมาก่อน ให้เชื่อม provider ไปด้วย
      user = await prisma.user.update({
        where: { id: user.id },
        data: { oauthProvider: "google" },
      });
    }

    // 4. ออก Stateful Session ให้กับผู้ใช้
    await createSessionAndSetCookie(user.id);

    // 5. ล็อกอินเสร็จแล้ว Redirect ไปหน้าหลัก
    return NextResponse.redirect(new URL("/", req.url));
  } catch (error) {
    console.error("Google Auth Callback Error:", error);
    return NextResponse.redirect(new URL("/login?error=server_error", req.url));
  }
}