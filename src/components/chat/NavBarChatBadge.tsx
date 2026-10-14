"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useSocket } from "@/context/SocketContext";

export function NavbarChatBadge({ enabled = true }: { enabled?: boolean }) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { socket } = useSocket();

  // ฟังก์ชันดึงยอดล่าสุดจาก API
  const syncUnreadCount = async () => {
    try {
      const res = await fetch("/api/chats/unread-count");
      const json = await res.json();
      if (json.success) {
        setUnreadCount(json.data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to sync unread count:", error);
    }
  };

  // 1. ดึงยอดรอบแรกตอน Mount
  useEffect(() => {
    if (!enabled) return;

    const timer = window.setTimeout(() => {
      void syncUnreadCount();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handleUnreadRefresh = () => {
      void syncUnreadCount();
    };

    window.addEventListener("chat-unread-refresh", handleUnreadRefresh);
    return () =>
      window.removeEventListener("chat-unread-refresh", handleUnreadRefresh);
  }, [enabled]);

  // 2. ดักฟัง Event จาก WebSocket
  useEffect(() => {
    if (!enabled || !socket) return;

    // มีข้อความใหม่เข้ามาหาเรา -> อ่านยอดจากฐานข้อมูลเพื่อให้ตรงกับ isRead
    const handleIncrement = () => {
      void syncUnreadCount();
    };

    // มีการอ่านข้อความ (เช่น เปิดอ่านจากอีกแท็บ หรือเปิดอ่านห้องแชท) -> ซิงก์ยอดใหม่
    const handleRefresh = () => {
      syncUnreadCount();
    };

    socket.on("unread_badge_increment", handleIncrement);
    socket.on("unread_badge_refresh", handleRefresh);

    return () => {
      socket.off("unread_badge_increment", handleIncrement);
      socket.off("unread_badge_refresh", handleRefresh);
    };
  }, [enabled, socket]);

  return (
    <Link
      href="/chat"
      className="header-chat-link"
      aria-label={
        unreadCount > 0
          ? `แชต มี ${unreadCount} ข้อความที่ยังไม่ได้อ่าน`
          : "แชต"
      }
    >
      <MessageCircle size={19} aria-hidden="true" />
      <span>แชต</span>
      {unreadCount > 0 && (
        <span
          className="chat-unread-badge"
          aria-hidden="true"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}