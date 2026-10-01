"use client";

import { useState } from "react";
import Link from "next/link";

import {
  Bell,
  Menu,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import { BannerPromote } from "@/components/home/BannerPromote";
import { nav } from "@/lib/pet-data";

export function SiteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

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
            <span className="avatar">P</span>
            โปรไฟล์
          </Link>
        </div>
        <button type="button" className="login-button">
          <Link href="/login">เข้าสู่ระบบ</Link>
        </button>

        <button
          className="mobile-menu"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>

      <nav className={`main-nav ${open ? "open" : ""}`}>
        {nav.map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}

        <Link className="post-listing" href="/create">
          + Post Something
        </Link>
      </nav>

      {children}

      <footer>
        <Link className="brand" href="/">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/name-kPFgxcBG1toR0Q3Vjuixc2AF6NWEst.png"
            alt="PetMorChor"
          />
        </Link>

        <p>พื้นที่สำหรับสัตว์เลี้ยงและคนรักสัตว์รอบมหาวิทยาลัย</p>

        <small>
          © 2026 PetMorChor · มหาวิทยาลัยและพื้นที่ใกล้เคียง
        </small>
      </footer>

      <div className="bottom-nav">
        <Link href="/">หน้าแรก</Link>
        <Link href="/discover">ค้นหาใกล้ฉัน</Link>
        <Link href="/create" className="plus">
          +
        </Link>
        <Link href="/chat">แชต</Link>
        <Link href="/profile">โปรไฟล์</Link>
      </div>
    </main>
  );
}