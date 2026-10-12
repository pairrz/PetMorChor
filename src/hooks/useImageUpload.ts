"use client";
import { useMutation } from "@tanstack/react-query";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export type UploadedImage = {
  url: string;
  publicId: string;
  width: number;
  height: number;
};

type Purpose = "post" | "listing" | "chat" | "avatar";

async function uploadImage(file: File, purpose: Purpose): Promise<UploadedImage> {
  if (!ALLOWED.includes(file.type)) throw new Error("รองรับเฉพาะ JPG, PNG, WEBP");
  if (file.size > MAX_SIZE) throw new Error("ไฟล์ต้องไม่เกิน 5MB");

  // 1) ขอลายเซ็น
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose }),
  });
  if (!signRes.ok) throw new Error("กรุณาเข้าสู่ระบบก่อนอัปโหลด");
  const sig = await signRes.json();

  // 2) อัปโหลดตรงไป Cloudinary
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  form.append("upload_preset", sig.uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    { method: "POST", body: form }
  );
  if (!res.ok) throw new Error("อัปโหลดรูปไม่สำเร็จ");
  const data = await res.json();

  return {
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
  };
}

export function useImageUpload(purpose: Purpose) {
  return useMutation({ mutationFn: (file: File) => uploadImage(file, purpose) });
}