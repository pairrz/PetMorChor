import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=MissingCode", req.url));
  }

  const clientId = process.env.CPE_OAUTH_CLIENT_ID!;
  const clientSecret = process.env.CPE_OAUTH_CLIENT_SECRET!;
  const redirectUri = "http://localhost:3000/api/auth/callback";

  try {
    // 1. แลก Token ตามสเปกของ CPE Mock
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch("https://oauth497.cpecmu.com/application/o/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("CPE Token Exchange Error:", tokenRes.status, errText);
      return NextResponse.redirect(new URL("/login?error=TokenExchangeFailed", req.url));
    }

    const tokenData = await tokenRes.json();

    // 2. ดึงข้อมูล User จาก /userinfo/
    const userInfoRes = await fetch("https://oauth497.cpecmu.com/application/o/userinfo/", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    let userInfo: { email?: string; name?: string; sub?: string } = {};
    if (userInfoRes.ok) {
      userInfo = await userInfoRes.json();
    } else if (tokenData.id_token) {
      // Fallback: แกะ JWT id_token
      const payload = tokenData.id_token.split(".")[1];
      userInfo = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    }

    const email = userInfo.email || `${userInfo.sub || "cpe_user"}@cmu.ac.th`;
    const name = userInfo.name || "CPE Student";

    // 3. บันทึก/อัปเดตข้อมูลผู้ใช้ในตาราง User (Prisma) และเก็บผลลัพธ์ไว้ใน user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        oauthProvider: "cpe",
      },
      create: {
        email,
        name,
        password: null,
        oauthProvider: "cpe",
        role: "USER",
      },
    });

    // 4. สร้าง Session Token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 วัน

    // 5. บันทึกลงตาราง Session ใน PostgreSQL
    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id, // ใช้งาน user.id ได้แล้ว
        expires: expiresAt,
      },
    });

    // 6. แนบ HttpOnly Cookie แล้ว Redirect กลับหน้าแรก
    const response = NextResponse.redirect(new URL("/", req.url));
    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;

  } catch (error) {
    console.error("OAuth Callback Internal Error:", error);
    return NextResponse.redirect(new URL("/login?error=ServerError", req.url));
  }
}