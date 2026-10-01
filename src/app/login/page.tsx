// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, setIsPending] = useState(false); // ควบคุมสถานะปุ่มและการโหลด

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsPending(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ยืนยันการส่ง/รับ Session Cookie
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // ล้าง Cache ของผู้ใช้เดิม เพื่อให้ useAuth() โหลดข้อมูลผู้ใช้ใหม่
        await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        router.push("/");
        router.refresh();
      } else {
        setErrorMsg(data.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsPending(false);
    }
  };

  const handleGoogleLogin = () => {
    // ส่งเบราว์เซอร์ตรงไปยัง GET /api/auth/google เพื่อเริ่ม OAuth 2.0 Flow
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
      <h2 className="text-2xl font-bold mb-2 text-center text-gray-800">เข้าสู่ระบบ Pet MorChor</h2>
      <p className="text-sm text-center text-gray-500 mb-6">
        เข้าสู่ระบบเพื่อโพสต์สัตว์เลี้ยงและพูดคุยในชุมชน
      </p>

      {errorMsg && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">อีเมล</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
            placeholder="example@cmu.ac.th"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">รหัสผ่าน</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending}
            className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วยอีเมล"}
        </button>
      </form>

      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <span className="relative bg-white px-3 text-xs uppercase tracking-wider text-gray-400">
          หรือ
        </span>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 border border-gray-300 py-2.5 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>เข้าสู่ระบบด้วย Google</span>
      </button>

      <div className="mt-6 text-center text-sm text-gray-600">
      ยังไม่มีบัญชี Pet MorChor ใช่หรือไม่?{" "}
      <Link
        href="/register"
        className="font-semibold text-blue-600 hover:text-blue-500 hover:underline"
      >
        สมัครสมาชิกใหม่
      </Link>
      </div>
    </div>
  );
}