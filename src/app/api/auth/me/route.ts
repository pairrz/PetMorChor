import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-guard";

export async function GET() {
  const user = await getSessionUser();

  return NextResponse.json({
    authenticated: !!user,
    user,
  });
}