"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/context/SocketContext";

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
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.emit("join_room", { roomId });

    const handleNewMessage = (message: Message) => {
      setMessages((prev) =>
        prev.some((existing) => existing.id === message.id)
          ? prev
          : [...prev, message],
      );
    };
    const handleTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== userId) {
        setIsTyping(data.isTyping);
      }
    };
    socket.on("new_message", handleNewMessage);

    socket.on("user_typing", handleTyping);

    return () => {
      socket.emit("leave_room", { roomId });
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleTyping);
    };
  }, [roomId, socket, userId]);

  const sendMessage = (content: string) => {
    if (!socket?.connected || !content.trim()) return;
    socket.emit("send_message", { roomId, content });
  };

  const setTyping = (typing: boolean) => {
    socket?.emit("typing", { roomId, isTyping: typing });
  };

  return { messages, sendMessage, isTyping, setTyping };
}