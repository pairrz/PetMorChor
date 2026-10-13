"use client";

import { useEffect, useRef, useState, use } from "react";
import { useSocket } from "@/context/SocketContext";

interface Message {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  createdAt: string;
  sender: { id: number; name: string };
}

export default function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const numericRoomId = Number(roomId);
  const { socket } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. ดึงข้อความเก่าตอนเปิดหน้า + สั่ง Mark as Read
  useEffect(() => {
    async function initChat() {
      // ดึงประวัติข้อความ
      const res = await fetch(`/api/chats/room/${numericRoomId}/message`);
      const json = await res.json();
      if (json.success) setMessages(json.data);

      // อัปเดตสถานะว่าอ่านแล้ว
      await fetch(`/api/chats/room/${numericRoomId}/read`, { method: "PUT" });
      socket?.emit("mark_room_as_read", { roomId: numericRoomId });
    }

    initChat();
  }, [numericRoomId, socket]);

  // 2. จัดการ WebSocket (Join Room & ดักฟังข้อความใหม่)
  useEffect(() => {
    if (!socket || !numericRoomId) return;

    socket.emit("join_room", { roomId: numericRoomId });

    const handleNewMessage = (newMsg: Message) => {
      setMessages((prev) => [...prev, newMsg]);
      // เคลียร์ Badge ตัวเองถ้ากำลังเปิดอ่านหน้านี้อยู่
      socket.emit("mark_room_as_read", { roomId: numericRoomId });
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.emit("leave_room", { roomId: numericRoomId });
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, numericRoomId]);

  // เลื่อนจอลงล่างสุดอัตโนมัติเมื่อมีข้อความใหม่
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3. ฟังก์ชันส่งข้อความ
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    socket.emit("send_message", {
      roomId: numericRoomId,
      content: inputText,
    });

    setInputText("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] max-w-2xl mx-auto border-x bg-gray-50">
      {/* ส่วนแสดงรายการข้อความ */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            <span className="text-xs text-gray-400 mb-1">{msg.sender.name}</span>
            <div className="bg-white p-3 rounded-lg shadow-sm border max-w-[75%] inline-block">
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ช่องพิมพ์ข้อความ */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="พิมพ์ข้อความ..."
          className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-5 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700"
        >
          ส่ง
        </button>
      </form>
    </div>
  );
}