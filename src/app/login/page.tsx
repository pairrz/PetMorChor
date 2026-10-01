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
  const [isPending, setIsPending] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    setIsPending(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
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
    window.location.href = "/api/auth/google";
  };

  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-xl shadow-violet-950/5 md:grid-cols-2">
        <aside className="relative hidden min-h-[560px] flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-100 via-purple-50 to-orange-50 p-10 md:flex">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/60" />
          <div className="absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-orange-200/30" />

          <Link href="/" className="relative z-10 flex items-center gap-3 text-lg font-bold text-slate-800">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-2xl shadow-sm">
              🐾
            </span>
            PetMorChor
          </Link>

          <div className="relative z-10">
            <span className="text-xs font-bold tracking-[0.18em] text-violet-700">
              PET COMMUNITY · CHIANG MAI
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-800">
              ชุมชนเล็ก ๆ
              <br />
              เพื่อเพื่อนตัวน้อย
            </h1>
            <p className="mt-4 max-w-sm leading-7 text-slate-600">
              เข้าสู่ระบบเพื่อค้นหา ประกาศหาบ้าน และแบ่งปันเรื่องราวกับคนรักสัตว์ในรั้วมหาวิทยาลัย
            </p>
            <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm">
              <span className="text-2xl">💜</span>
              <span className="text-sm font-medium text-slate-700">
                พื้นที่อบอุ่นสำหรับคนรักสัตว์
              </span>
            </div>
          </div>

          <p className="relative z-10 text-xs text-slate-500">
            PetMorChor · มหาวิทยาลัยเชียงใหม่
          </p>
        </aside>

        <div className="p-6 sm:p-10 md:p-12">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-violet-700 md:hidden"
          >
            <span aria-hidden="true">←</span> กลับหน้าหลัก
          </Link>

          <div className="mb-8">
            <span className="text-sm font-bold text-violet-700">ยินดีต้อนรับกลับ</span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              เข้าสู่ระบบ
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              เข้าสู่บัญชี PetMorChor เพื่อใช้งานชุมชน
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                อีเมล
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50"
                placeholder="example@cmu.ac.th"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                รหัสผ่าน
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50"
                placeholder="กรอกรหัสผ่าน"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3.5 font-bold text-white shadow-lg shadow-violet-700/20 transition hover:-translate-y-0.5 hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              {!isPending && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            หรือเข้าสู่ระบบด้วย
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            เข้าสู่ระบบด้วย Google
          </button>

          <p className="mt-8 text-center text-sm text-slate-500">
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="font-bold text-violet-700 hover:underline">
              สมัครสมาชิก
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}