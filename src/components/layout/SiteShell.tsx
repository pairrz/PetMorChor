"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Menu,
  MessageCircle,
  Plus,
  Search,
  X,
} from "lucide-react";
import { nav } from "@/lib/pet-data";

type User = {
  name?: string | null;
  email?: string | null;
};

async function fetchCurrentUser(): Promise<User | null> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error("ตรวจสอบสถานะการเข้าสู่ระบบไม่สำเร็จ");
  }

  const data = await response.json();

  if (data && Object.prototype.hasOwnProperty.call(data, "user")) {
    return data.user ?? null;
  }

  return data ?? null;
}

export function SiteShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isPending } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchCurrentUser,
    retry: false,
  });

  async function handleLogout() {
    setLogoutError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("ออกจากระบบไม่สำเร็จ");
      }

      queryClient.setQueryData(["auth", "me"], null);
      setOpen(false);
      router.refresh();
    } catch {
      setLogoutError("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
    }
  }

  const avatarLetter = (user?.name || user?.email || "P")
    .trim()
    .charAt(0)
    .toUpperCase();

  const createHref = pathname.startsWith("/marketplace")
    ? pathname.startsWith("/marketplace/create")
      ? null
      : "/marketplace/create"
    : pathname.startsWith("/community")
      ? pathname.startsWith("/community/create")
        ? null
        : "/community/create"
      : null;

  const createLabel =
    createHref === "/marketplace/create"
      ? "สร้างประกาศสัตว์เลี้ยง"
      : "สร้างโพสต์ชุมชน";

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/name-kPFgxcBG1toR0Q3Vjuixc2AF6NWEst.png"
            alt="PetMorChor"
          />
        </Link>

        <div className="header-search">
          <Search size={18} />
          <input
            aria-label="ค้นหาสัตว์เลี้ยง โพสต์ หรือข้อมูล"
            placeholder="ค้นหาสัตว์เลี้ยง โพสต์ หรือข้อมูล..."
          />
        </div>

        <div className="header-actions">
          <Link href="/chat">
            <MessageCircle size={19} />
            แชต
          </Link>

          <Link href="/notifications">
            <Bell size={19} />
            การแจ้งเตือน
          </Link>

          <Link href="/profile">
            <span className="avatar">{avatarLetter}</span>
            โปรไฟล์
          </Link>
        </div>

        {isPending ? (
          <button className="login-button" type="button" disabled>
            กำลังตรวจสอบ...
          </button>
        ) : user ? (
          <button
            className="login-button"
            type="button"
            onClick={handleLogout}
          >
            ออกจากระบบ
          </button>
        ) : (
          <Link className="login-button" href="/login">
            เข้าสู่ระบบ
          </Link>
        )}

        <button
          className="mobile-menu"
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>

      {logoutError && (
        <p role="alert" className="auth-error">
          {logoutError}
        </p>
      )}

      <nav className={`main-nav ${open ? "open" : ""}`}>
        {nav.map(([label, href]) => (
          <Link key={href} href={href} onClick={() => setOpen(false)}>
            {label}
          </Link>
        ))}
      </nav>

      {children}

      {createHref && (
        <Link
          href={createHref}
          className="floating-create-button"
          aria-label={createLabel}
          title={createLabel}
        >
          <Plus size={26} />
        </Link>
      )}

      <footer>
        <Link className="brand" href="/">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/name-kPFgxcBG1toR0Q3Vjuixc2AF6NWEst.png"
            alt="PetMorChor"
          />
        </Link>

        <p>พื้นที่สำหรับสัตว์เลี้ยงและคนรักสัตว์รอบมหาวิทยาลัย</p>
        <small>© 2026 PetMorChor · มหาวิทยาลัยและพื้นที่ใกล้เคียง</small>
      </footer>

      <div className="bottom-nav">
        <Link href="/">หน้าแรก</Link>
        <Link href="/discover">ค้นหาใกล้ฉัน</Link>
        <Link href="/chat">แชต</Link>
        <Link href="/profile">โปรไฟล์</Link>
      </div>
    </main>
  );
}