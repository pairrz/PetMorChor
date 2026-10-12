import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import cloudinary from "@/lib/cloudinary";
import { getSessionUser } from "@/lib/auth-guard";

const bodySchema = z.object({
  purpose: z.enum(["post", "listing", "chat", "avatar"]),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid purpose" },
      { status: 400 }
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `petmorchor/${user.id}/${parsed.data.purpose}`;

  const paramsToSign = {
    timestamp,
    folder,
    upload_preset: "petmorchor_signed",
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return NextResponse.json({
    signature,
    timestamp,
    folder,
    uploadPreset: "petmorchor_signed",
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
}
