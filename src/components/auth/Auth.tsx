"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function Auth({
  register = false,
}: {
  register?: boolean;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (register && password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        register ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            register
              ? {
                  name,
                  email,
                  password,
                }
              : {
                  email,
                  password,
                }
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "เกิดข้อผิดพลาด กรุณาลองใหม่"
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="brand" href="/">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/name-kPFgxcBG1toR0Q3Vjuixc2AF6NWEst.png"
            alt="PetMorChor"
          />
        </Link>

        <h1>
          {register
            ? "Join the local pet community"
            : "Welcome back"}
        </h1>

        <p>
          {register
            ? "Meet people and pets around campus."
            : "Sign in to your campus community."}
        </p>

        <form onSubmit={handleSubmit}>
          {register && (
            <label>
              Name
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {register && (
            <label>
              Confirm password
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                required
              />
            </label>
          )}

          {!register && (
            <label className="check">
              <input type="checkbox" />
              Remember me
            </label>
          )}

          {error && (
            <p style={{ color: "red" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="primary-cta"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : register
                ? "Create account"
                : "Log in"}
          </button>
        </form>

        <span>
          {register ? "Already a member? " : "New here? "}

          <Link href={register ? "/login" : "/register"}>
            {register ? "Log in" : "Register"}
          </Link>
        </span>
      </div>
    </main>
  );
}

