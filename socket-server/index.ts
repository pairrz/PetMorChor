import "dotenv/config";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { prisma } from "../src/lib/prisma";

const WS_PORT = Number(process.env.WS_PORT) || 4000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 1. Auth Middleware: รับและตรวจสอบ userId (Int)
io.use((socket: Socket, next) => {
  const userIdRaw = socket.handshake.auth?.userId;
  const userId = Number(userIdRaw);

  if (!userId || isNaN(userId)) {
    return next(new Error("Unauthorized: ไม่พบข้อมูลผู้ใช้หรือ userId ไม่ถูกต้อง"));
  }

  socket.data.userId = userId;
  next();
});

io.on("connection", (socket) => {
  const currentUserId: number = socket.data.userId;
  console.log(`[Socket Connected] User: ${currentUserId} | Socket ID: ${socket.id}`);

  // ให้ User เข้าห้องส่วนตัวของตัวเอง (ใช้ key เป็นตัวเลข)
  socket.join(`user:${currentUserId}`);

  // -------------------------------------------------------------
  // 2. Join Room (เมื่อผู้ใช้เปิดเข้าหน้าห้องแชท)
  // -------------------------------------------------------------
  socket.on("join_room", async ({ roomId }: { roomId: number | string }) => {
    try {
      const parsedRoomId = Number(roomId);
      if (!parsedRoomId || isNaN(parsedRoomId)) return;

      // ตรวจสอบว่าผู้ใช้เป็นสมาชิกของห้องนี้จริงหรือไม่ (ตรงตามฟิลด์ roomId, userId)
      const participant = await prisma.chatParticipant.findFirst({
        where: {
          roomId: parsedRoomId,
          userId: currentUserId,
        },
      });

      if (participant) {
        socket.join(`room:${parsedRoomId}`);
        console.log(`User ${currentUserId} joined room:${parsedRoomId}`);
      }
    } catch (error) {
      console.error("join_room error:", error);
    }
  });

  // -------------------------------------------------------------
  // 3. Leave Room (เมื่อผู้ใช้ออกจากห้องแชท)
  // -------------------------------------------------------------
  socket.on("leave_room", ({ roomId }: { roomId: number | string }) => {
    const parsedRoomId = Number(roomId);
    if (parsedRoomId) {
      socket.leave(`room:${parsedRoomId}`);
      console.log(`User ${currentUserId} left room:${parsedRoomId}`);
    }
  });

  // -------------------------------------------------------------
  // 4. Send Message (ส่งข้อความ, บันทึก DB, แจ้งเตือน Badge)
  // -------------------------------------------------------------
  socket.on(
    "send_message",
    async (
      {
        roomId,
        content,
        attachments = [],
      }: {
        roomId: number | string;
        content?: string;
        attachments?: {
          mediaUrl?: string;
          url?: string;
          publicId: string;
          width?: number;
          height?: number;
        }[];
      },
      acknowledge?: (result: { ok: boolean; message?: string }) => void,
    ) => {
      const parsedRoomId = Number(roomId);
      const text = content?.trim();
      const validAttachments = attachments.filter(
        (attachment) =>
          typeof (attachment.mediaUrl ?? attachment.url) === "string" &&
          (attachment.mediaUrl ?? attachment.url)?.startsWith("https://") &&
          typeof attachment.publicId === "string" &&
          attachment.publicId.length > 0,
      );

      if (
        !parsedRoomId ||
        isNaN(parsedRoomId) ||
        (!text && validAttachments.length === 0) ||
        validAttachments.length > 4
      ) {
        acknowledge?.({ ok: false, message: "ข้อมูลข้อความไม่ถูกต้อง" });
        return;
      }

      try {
        // ดึงรายชื่อผู้เข้าร่วมในห้องเพื่อตรวจสิทธิ์และระบุคนรับ
        const participants = await prisma.chatParticipant.findMany({
          where: { roomId: parsedRoomId },
          select: { userId: true },
        });

        const isSenderMember = participants.some((p) => p.userId === currentUserId);
        if (!isSenderMember) {
          const message = "คุณไม่มีสิทธิ์ส่งข้อความในห้องนี้";
          acknowledge?.({ ok: false, message });
          socket.emit("error", { message });
          return;
        }

        // บันทึกข้อความลงตาราง Message และอัปเดต updatedAt ของ ChatRoom
        const [newMessage] = await prisma.$transaction([
          prisma.message.create({
            data: {
              roomId: parsedRoomId,
              senderId: currentUserId,
              content: text ?? "",
              attachments: {
                create: validAttachments.map((attachment) => ({
                  mediaUrl: attachment.mediaUrl ?? attachment.url!,
                  publicId: attachment.publicId,
                  width: attachment.width,
                  height: attachment.height,
                })),
              },
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
              attachments: true,
            },
          }),
          prisma.chatRoom.update({
            where: { id: parsedRoomId },
            data: { updatedAt: new Date() },
          }),
        ]);

        // A. ส่งข้อความสดเข้าห้องแชท (สำหรับคนที่เปิดหน้าห้องนั้นอยู่)
        io.to(`room:${parsedRoomId}`).emit("new_message", newMessage);

        // B. ยิงแจ้งเตือน Badge ให้ผู้รับคนอื่นๆ ในห้อง
        participants
          .filter((p) => p.userId !== currentUserId)
          .forEach((recipient) => {
            io.to(`user:${recipient.userId}`).emit("unread_badge_increment", {
              roomId: parsedRoomId,
              messageId: newMessage.id,
            });
          });
        acknowledge?.({ ok: true });
      } catch (error) {
        console.error("send_message error:", error);
        const message = "เกิดข้อผิดพลาดในการส่งข้อความ";
        acknowledge?.({ ok: false, message });
        socket.emit("error", { message });
      }
    }
  );

  // -------------------------------------------------------------
  // 5. Mark as Read (เมื่อผู้ใช้อ่านข้อความในห้อง)
  // -------------------------------------------------------------
  socket.on(
    "mark_room_as_read",
    async ({ roomId }: { roomId: number | string }) => {
    const parsedRoomId = Number(roomId);
    if (!parsedRoomId) return;

      try {
        const participant = await prisma.chatParticipant.findFirst({
          where: { roomId: parsedRoomId, userId: currentUserId },
          select: { id: true },
        });
        if (!participant) {
          socket.emit("error", { message: "คุณไม่มีสิทธิ์อ่านห้องนี้" });
          return;
        }

        await prisma.message.updateMany({
          where: {
            roomId: parsedRoomId,
            senderId: { not: currentUserId },
            isRead: false,
          },
          data: { isRead: true },
        });

        io.to(`user:${currentUserId}`).emit("unread_badge_refresh");
        socket.to(`room:${parsedRoomId}`).emit("messages_read_by_partner", {
          roomId: parsedRoomId,
          readerId: currentUserId,
        });
      } catch (error) {
        console.error("mark_room_as_read error:", error);
        socket.emit("error", { message: "ไม่สามารถอัปเดตสถานะการอ่านได้" });
      }
    },
  );

  // -------------------------------------------------------------
  // 6. Typing Indicator
  // -------------------------------------------------------------
  socket.on(
    "typing",
    ({ roomId, isTyping }: { roomId: number | string; isTyping: boolean }) => {
      const parsedRoomId = Number(roomId);
      if (!parsedRoomId) return;

      socket.to(`room:${parsedRoomId}`).emit("user_typing", {
        roomId: parsedRoomId,
        userId: currentUserId,
        isTyping,
      });
    }
  );

  // -------------------------------------------------------------
  // Disconnect
  // -------------------------------------------------------------
  socket.on("disconnect", () => {
    console.log(`[Socket Disconnected] User: ${currentUserId}`);
  });
});

httpServer.listen(WS_PORT, () => {
  console.log(`> WebSocket server ready on http://localhost:${WS_PORT}`);
});