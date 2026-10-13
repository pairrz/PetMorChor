"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useSocket } from "@/context/SocketContext";

export function NavbarChatBadge() {
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
    const timer = window.setTimeout(() => {
      void syncUnreadCount();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleUnreadRefresh = () => {
      void syncUnreadCount();
    };

    window.addEventListener("chat-unread-refresh", handleUnreadRefresh);
    return () =>
      window.removeEventListener("chat-unread-refresh", handleUnreadRefresh);
  }, []);

  // 2. ดักฟัง Event จาก WebSocket
  useEffect(() => {
    if (!socket) return;

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
  }, [socket]);

  return (
    <Link
      href="/chat"
      className="relative inline-flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition-colors"
      aria-label="กล่องข้อความ"
    >
      <MessageCircle className="w-6 h-6 text-gray-700" />
      {unreadCount > 0 && (
        <span
          className="absolute right-0 top-0 z-10 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
          aria-label={`${unreadCount} ข้อความที่ยังไม่ได้อ่าน`}
        />
      )}
      {unreadCount > 0 && (
        <span className="absolute -right-2 -top-2 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}