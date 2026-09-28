"use client";

import React, { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { io, Socket } from "socket.io-client";

interface MessageItem {
  id: number;
  content: string;
  senderId: number;
  createdAt: string;
  sender: {
    id: number;
    name: string;
  };
}

interface ChatBoxProps {
  roomId: number;
  currentUserId: number;
  currentUserName: string;
  listingId: number;
  listingTitle: string;
  listingStatus: "AVAILABLE" | "ADOPTED" | "HIDDEN";
  isOwner: boolean; // ผู้ใช้งานปัจจุบันเป็นเจ้าของประกาศหรือไม่
}

export default function ChatBox({
  roomId,
  currentUserId,
  listingId,
  listingTitle,
  listingStatus,
  isOwner,
}: ChatBoxProps) {
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState("");
  const [status, setStatus] = useState(listingStatus);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. ดึงประวัติข้อความเดิมด้วย TanStack Query[cite: 4, 8]
  const { data: messages = [], isLoading } = useQuery<MessageItem[]>({
    queryKey: ["chat-messages", roomId],
    queryFn: async () => {
      const res = await axios.get(`/api/chats/rooms/${roomId}/messages`);
      return res.data.data;
    },
    staleTime: 1000 * 30, // แคชข้อความไว้ 30 วินาที[cite: 1, 8]
  });

  // 2. การเชื่อมต่อ WebSocket (Socket.io) แบบ Real-time[cite: 8, 9]
  useEffect(() => {
    // กำหนด URL หรือ path ที่ตั้งค่า Socket Server ไว้
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "", {
      path: "/api/socket",
      addTrailingSlash: false,
    });
    socketRef.current = socket;

    // เข้าร่วมห้องแชทเฉพาะของประกาศตัวนี้
    socket.emit("join_room", { roomId });

    // ดักรับข้อความใหม่ที่ Broadcast เข้ามา[cite: 8]
    socket.on("receive_message", (newMsg: MessageItem) => {
      // อัปเดตข้อมูลใน Cache ของ TanStack Query ทันทีโดยไม่ต้อง Re-fetch ใหม่ทั้งก้อน[cite: 8]
      queryClient.setQueryData<MessageItem[]>(["chat-messages", roomId], (old) => {
        if (!old) return [newMsg];
        // ป้องกันข้อความซ้ำซ้อน
        if (old.some((m) => m.id === newMsg.id)) return old;
        return [...old, newMsg];
      });
    });

    // Clean-up connection เมื่อ Component Unmount เพื่อไม่ให้กิน connection ค้างไว้
    return () => {
      socket.emit("leave_room", { roomId });
      socket.disconnect();
    };
  }, [roomId, queryClient]);

  // เลื่อนหน้าต่างลงล่างสุดอัตโนมัติเมื่อมีข้อความใหม่
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3. Mutation สำหรับส่งข้อความ
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await axios.post(`/api/chats/rooms/${roomId}/messages`, { content });
      return res.data.data;
    },
    onSuccess: (newMsg: MessageItem) => {
      setInputText("");
      // ส่ง Event กระจายผ่าน Socket ไปยังคู่สนทนา[cite: 8]
      socketRef.current?.emit("send_message", { roomId, message: newMsg });
      // อัปเดต Cache ฝั่งตนเอง
      queryClient.setQueryData<MessageItem[]>(["chat-messages", roomId], (old) =>
        old ? [...old, newMsg] : [newMsg]
      );
    },
  });

  // 4. Mutation สำหรับเจ้าของกดเปลี่ยนสถานะเป็น "มีคนรับเลี้ยงแล้ว"
  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.patch(`/api/listings/${listingId}/status`, {
        status: "ADOPTED",
      });
      return res.data;
    },
    onSuccess: () => {
      setStatus("ADOPTED");
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(inputText);
  };

  return (
    <div className="flex flex-col h-[550px] max-w-lg mx-auto border rounded-xl shadow-lg bg-white overflow-hidden">
      {/* ส่วนหัวแสดงข้อมูลสัตว์เลี้ยงและปุ่มปิดการหาบ้าน */}
      <div className="bg-slate-100 p-4 border-b flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-800 text-sm truncate max-w-[200px]">
            {listingTitle}
          </h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              status === "ADOPTED"
                ? "bg-gray-200 text-gray-600"
                : "bg-green-100 text-green-700"
            }`}
          >
            {status === "ADOPTED" ? "มีคนรับเลี้ยงแล้ว" : "เปิดหาบ้าน/ยังอยู่"}
          </span>
        </div>

        {/* แสดงปุ่มปิดการรับเลี้ยงเฉพาะคนที่เป็นเจ้าของสัตว์เลี้ยง */}
        {isOwner && status !== "ADOPTED" && (
          <button
            onClick={() => updateStatusMutation.mutate()}
            disabled={updateStatusMutation.isPending}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-md transition shadow-sm"
          >
            {updateStatusMutation.isPending ? "กำลังบันทึก..." : "มีคนรับเลี้ยงแล้ว"}
          </button>
        )}
      </div>

      {/* กล่องแสดงประวัติข้อความ */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
        {isLoading ? (
          <div className="text-center text-gray-400 text-sm mt-8">กำลังโหลดข้อความ...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-8">
            เริ่มการพูดคุย สอบถามข้อมูล หรือนัดหมายรับสัตว์เลี้ยงได้ที่นี่
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <span className="text-[10px] text-gray-500 mb-0.5 px-1">
                  {isMe ? "คุณ" : msg.sender.name}
                </span>
                <div
                  className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] text-gray-400 mt-0.5 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ช่องกรอกข้อความ */}
      <form onSubmit={handleSendMessage} className="p-3 border-t bg-white flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="พิมพ์ข้อความ..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || sendMessageMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          ส่ง
        </button>
      </form>
    </div>
  );
}