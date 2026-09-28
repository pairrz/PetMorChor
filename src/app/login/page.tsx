"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setErrorMsg(data.message || "เข้าสู่ระบบไม่สำเร็จ");
    }
  };

  const handleGoogleLogin = () => {
    // นำทางไปยัง Endpoint ที่จะพาไปหน้า Consent Screen ของ Google
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white border rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">เข้าสู่ระบบ Pet MorChor</h2>

      {errorMsg && <p className="text-red-500 mb-4 text-sm">{errorMsg}</p>}

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">อีเมล</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2 rounded mt-1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">รหัสผ่าน</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2 rounded mt-1"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          เข้าสู่ระบบด้วยอีเมล
        </button>
      </form>

      <div className="relative my-6 text-center">
        <span className="bg-white px-2 text-gray-500 text-sm">หรือ</span>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-2 border border-gray-300 py-2 rounded hover:bg-gray-50"
      >
        <span>Sign in with Google</span>
      </button>
    </div>
  );
}