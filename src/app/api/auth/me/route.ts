import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }

  return NextResponse.json({ authenticated: true, user }, { status: 200 });
}