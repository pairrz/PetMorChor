"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface Message {
  id: string;
  chatRoomId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string };
}

export function useChat(roomId: string, initialMessages: Message[] = [], userId: string) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // สร้าง Socket Connection
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000", {
      auth: { userId },
    });
    socketRef.current = socket;

    socket.emit("join_room", { roomId });

    socket.on("new_message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("user_typing", (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== userId) {
        setIsTyping(data.isTyping);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, userId]);

  const sendMessage = (content: string) => {
    if (!socketRef.current || !content.trim()) return;
    socketRef.current.emit("send_message", { roomId, content });
  };

  const setTyping = (typing: boolean) => {
    socketRef.current?.emit("typing", { roomId, isTyping: typing });
  };

  return { messages, sendMessage, isTyping, setTyping };
}