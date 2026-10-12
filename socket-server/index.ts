// socket-server/index.ts
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.use(async (socket: Socket, next) => {
  const userId = socket.handshake.auth.userId;
  if (!userId) return next(new Error("Unauthorized"));
  socket.data.userId = userId;
  next();
});

io.on("connection", (socket) => {
  const currentUserId = socket.data.userId;

  // 1. นำ User เข้าห้องส่วนตัวของตัวเองเสมอ (เอาไว้ยิง alert/badge ส่วนตัว)
  socket.join(`user:${currentUserId}`);

  // 2. Join เข้าห้องแชทเฉพาะกิจ
  socket.on("join_room", async ({ roomId }: { roomId: string }) => {
    const isMember = await prisma.chatParticipant.findFirst({
      where: { chatRoomId: roomId, userId: currentUserId },
    });
    if (isMember) {
      socket.join(`room:${roomId}`);
    }
  });

  // 3. ออกจากห้องแชท
  socket.on("leave_room", ({ roomId }: { roomId: string }) => {
    socket.leave(`room:${roomId}`);
  });

  // 4. เมื่อมีการส่งข้อความ
  socket.on("send_message", async ({ roomId, content }: { roomId: string; content: string }) => {
    if (!content?.trim()) return;

    try {
      // ดึงข้อมูลผู้เข้าร่วมในห้องเพื่อระบุว่าใครคือผู้รับ
      const participants = await prisma.chatParticipant.findMany({
        where: { chatRoomId: roomId },
        select: { userId: true },
      });

      const isSenderMember = participants.some((p) => p.userId === currentUserId);
      if (!isSenderMember) return;

      // บันทึกข้อความลง DB
      const [newMessage] = await prisma.$transaction([
        prisma.message.create({
          data: {
            chatRoomId: roomId,
            senderId: currentUserId,
            content: content.trim(),
          },
          include: {
            sender: { select: { id: true, name: true, image: true } },
          },
        }),
        prisma.chatRoom.update({
          where: { id: roomId },
          data: { updatedAt: new Date() },
        }),
      ]);

      // A. ส่งข้อความเข้าห้องแชท (สำหรับคนที่เปิดหน้าห้องนั้นอยู่)
      io.to(`room:${roomId}`).emit("new_message", newMessage);

      // B. ส่ง Event เตือน Badge ไปยังผู้รับ (คนที่ไม่ได้ส่ง)
      participants
        .filter((p) => p.userId !== currentUserId)
        .forEach((recipient) => {
          io.to(`user:${recipient.userId}`).emit("unread_badge_increment", {
            roomId,
            messageId: newMessage.id,
          });
        });
    } catch (err) {
      console.error("send_message error:", err);
    }
  });

  // 5. เมื่อผู้ใช้อ่านข้อความในห้องแล้ว (Trigger จากฝั่ง Client เมื่อเปิดอ่าน)
  socket.on("mark_room_as_read", async ({ roomId }: { roomId: string }) => {
    // ส่งสัญญาณบอกตัวผู้ใช้เองในอุปกรณ์อื่น/แท็บอื่นให้รีเฟรช Badge
    io.to(`user:${currentUserId}`).emit("unread_badge_refresh");
  });
});

httpServer.listen(4000, () => {
  console.log("WebSocket server listening on port 4000");
});