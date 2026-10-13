import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export async function POST() {
  const authSession = await auth();
  const email = authSession?.user?.email;

  if (!email) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, message: "ไม่พบผู้ใช้งาน" },
      { status: 404 },
    );
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(
    Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  );

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  const response = NextResponse.json({
    success: true,
    data: { expires },
  });

  response.cookies.set("session_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires,
    path: "/",
  });

  return response;
}
