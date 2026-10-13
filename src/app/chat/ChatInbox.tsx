"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/context/SocketContext";
import { useImageUpload, type UploadedImage } from "@/hooks/useImageUpload";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Image as ImageIcon,
  LoaderCircle,
  MessageCircle,
  PawPrint,
  Search,
  Send,
  X,
} from "lucide-react";
import styles from "./page.module.css";

type SessionResponse = {
  authenticated: boolean;
  user: { id: number; name: string } | null;
};

type ChatMessage = {
  id: number;
  content: string;
  senderId: number;
  createdAt: string;
  sender: { id: number; name: string; image?: string | null };
  attachments?: {
    id: number;
    mediaUrl: string;
    publicId: string;
    width?: number | null;
    height?: number | null;
  }[];
};

type ChatRoom = {
  id: number;
  listing: {
    id: number;
    title: string;
    status: "AVAILABLE" | "ADOPTED" | "HIDDEN";
    media: { mediaUrl: string }[];
  } | null;
  participants: {
    user: { id: number; name: string };
  }[];
  messages: { content: string; createdAt: string; senderId: number }[];
  _count: { messages: number };
  updatedAt: string;
};

const emptyRooms: ChatRoom[] = [];
const emptyMessages: ChatMessage[] = [];

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message ?? data.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
  }
  return data;
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "U";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(value));
}

export default function ChatInbox() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<UploadedImage[]>([]);
  const [showConversation, setShowConversation] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageUpload = useImageUpload("chat");

  const searchParams = useSearchParams();
  const queryRoomId = searchParams.get("roomId");
  const parsedRoomId = queryRoomId ? Number(queryRoomId) : NaN;
  const requestedRoomId = Number.isInteger(parsedRoomId) ? parsedRoomId : null;
  const activeRoomId = selectedRoomId ?? requestedRoomId;
  // 1. ดึง Session ผู้ใช้
  const sessionQuery = useQuery<SessionResponse>({
    queryKey: ["chat-session"],
    queryFn: async () => readJson(await fetch("/api/auth/me")),
  });
  const currentUser = sessionQuery.data?.user;

  // 2. ดึงรายการห้อง
  const roomsQuery = useQuery<ChatRoom[]>({
    queryKey: ["chat-rooms", currentUser?.id],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const result = await readJson<{ data: ChatRoom[] }>(
        await fetch("/api/chats/room"),
      );
      return result.data;
    },
    refetchInterval: isConnected ? false : 15_000,
  });
  const rooms = roomsQuery.data ?? emptyRooms;
  const unreadTotal = rooms.reduce(
    (total, room) => total + room._count.messages,
    0,
  );

  useEffect(() => {
    if (!socket || !currentUser) return;

    const refreshRooms = () => {
      void queryClient.invalidateQueries({
        queryKey: ["chat-rooms", currentUser.id],
      });
    };

    socket.on("unread_badge_increment", refreshRooms);
    socket.on("unread_badge_refresh", refreshRooms);
    return () => {
      socket.off("unread_badge_increment", refreshRooms);
      socket.off("unread_badge_refresh", refreshRooms);
    };
  }, [currentUser, queryClient, socket]);

  useEffect(() => {
    if (
      requestedRoomId !== null &&
      roomsQuery.isSuccess &&
      !rooms.some((room) => room.id === requestedRoomId) &&
      !roomsQuery.isFetching
    ) {
      void roomsQuery.refetch();
    }
  }, [requestedRoomId, rooms, roomsQuery]);

  const selectedRoom = rooms.find((room) => room.id === activeRoomId) ?? null;

  const otherParticipant = selectedRoom?.participants.find(
    (participant) => participant.user.id !== currentUser?.id,
  )?.user;

  // 3. ดึงประวัติข้อความของห้องที่เลือก
  const messagesQuery = useQuery<ChatMessage[]>({
    queryKey: ["chat-room-messages", selectedRoom?.id],
    enabled: Boolean(currentUser && selectedRoom),
    queryFn: async () => {
      const result = await readJson<{ data: ChatMessage[] }>(
        await fetch(`/api/chats/room/${selectedRoom?.id}/message`),
      );
      return result.data;
    },
  });
  const messages = messagesQuery.data ?? emptyMessages;

  // 4. Join Room, Leave Room และรับ new_message ผ่าน WebSocket
  useEffect(() => {
    const currentRoomId = selectedRoom?.id;

    if (!currentRoomId) return;

    const markRoomAsRead = () => {
      socket?.emit("mark_room_as_read", { roomId: currentRoomId });
      return fetch(`/api/chats/room/${currentRoomId}/read`, { method: "PUT" })
        .then(async (response) => {
          if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(
              data?.message ?? "ไม่สามารถอัปเดตสถานะการอ่านได้",
            );
          }
          queryClient.setQueryData<ChatRoom[]>(
            ["chat-rooms", currentUser?.id],
            (currentRooms = []) =>
              currentRooms.map((room) =>
                room.id === currentRoomId
                  ? { ...room, _count: { messages: 0 } }
                  : room,
              ),
          );
          window.dispatchEvent(new Event("chat-unread-refresh"));
        })
        .catch((error: unknown) => {
          console.error("Failed to mark chat room as read:", error);
        });
    };

    void markRoomAsRead();

    if (!socket) return;

    socket.emit("join_room", { roomId: currentRoomId });

    const handleNewMessage = (newMessage: ChatMessage) => {
      // 5.1 เพิ่มข้อความใหม่เข้าแคชของห้องที่เปิดอยู่
      queryClient.setQueryData<ChatMessage[]>(
        ["chat-room-messages", currentRoomId],
        (prev = []) => {
          if (prev.some((msg) => msg.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        },
      );

      // 5.2 อัปเดตรายการห้องและ preview ด้านซ้ายมือ
      queryClient.setQueryData<ChatRoom[]>(
        ["chat-rooms", currentUser?.id],
        (prevRooms = []) => {
          return prevRooms
            .map((r) => {
            if (r.id === currentRoomId) {
              return {
                ...r,
                _count: { messages: 0 },
                updatedAt: newMessage.createdAt,
                messages: [
                  {
                    content: newMessage.content,
                    createdAt: newMessage.createdAt,
                    senderId: newMessage.senderId,
                  },
                ],
              };
            }
            return r;
            })
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime(),
            );
        },
      );

      if (newMessage.senderId !== currentUser?.id) {
        void markRoomAsRead();
      }

      setIsSending(false);
    };

    socket.on("new_message", handleNewMessage);
    const handleSocketError = (error: { message?: string }) => {
      setIsSending(false);
      alert(error.message ?? "เกิดข้อผิดพลาดในการรับส่งข้อมูล");
    };
    socket.on("error", handleSocketError);

    return () => {
      socket.emit("leave_room", { roomId: currentRoomId });
      socket.off("new_message", handleNewMessage);
      socket.off("error", handleSocketError);
    };
  }, [socket, selectedRoom?.id, currentUser?.id, queryClient]);

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return rooms;
    return rooms.filter((room) => {
      const otherName =
        room.participants.find(
          (participant) => participant.user.id !== currentUser?.id,
        )?.user.name ?? "";
      return `${otherName}${room.listing ? ` ${room.listing.title}` : ""}`
        .toLocaleLowerCase()
        .includes(query);
    });
  }, [currentUser?.id, rooms, search]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedRoom?.id]);

  // 5. ส่งข้อความผ่าน Socket
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();

    if (
      (!content && attachments.length === 0) ||
      !selectedRoom ||
      !socket?.connected ||
      isSending
    ) return;

    setIsSending(true);
    socket.emit("send_message", {
      roomId: selectedRoom.id,
      content,
      attachments: attachments.map((attachment) => ({
        mediaUrl: attachment.url,
        publicId: attachment.publicId,
        width: attachment.width,
        height: attachment.height,
      })),
    }, (result: { ok?: boolean; message?: string }) => {
      if (!result?.ok) {
        setIsSending(false);
        alert(result?.message ?? "ไม่สามารถส่งข้อความได้");
        return;
      }
      setDraft("");
      setAttachments([]);
    });
  }

  async function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const remaining = 4 - attachments.length;
    if (files.length > remaining) {
      alert("ส่งรูปได้ไม่เกิน 4 รูปต่อข้อความ");
    }

    try {
      const uploaded = await Promise.all(
        files.slice(0, remaining).map((file) => imageUpload.mutateAsync(file)),
      );
      setAttachments((current) => [...current, ...uploaded]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ");
    }
  }

  function removeAttachment(index: number) {
    setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  if (sessionQuery.isPending) {
    return (
      <div className={styles.loading}>
        <LoaderCircle className={styles.spinner} size={22} />
        <span>กำลังโหลดข้อความ...</span>
      </div>
    );
  }

  if (sessionQuery.isError) {
    return (
      <div className={styles.stateCard} role="alert">
        <MessageCircle size={28} />
        <h2>โหลดข้อมูลไม่สำเร็จ</h2>
        <p>{sessionQuery.error.message}</p>
        <button type="button" onClick={() => sessionQuery.refetch()}>
          ลองอีกครั้ง
        </button>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={styles.stateCard}>
        <span className={styles.stateIcon}>
          <MessageCircle size={28} />
        </span>
        <h2>เข้าสู่ระบบเพื่อดูแชท</h2>
        <p>ล็อกอินเพื่อพูดคุยกับเจ้าของประกาศและสมาชิกในชุมชน</p>
        <Link className={styles.primaryLink} href="/login">
          เข้าสู่ระบบ <ArrowUpRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <section
      className={styles.inbox}
      data-conversation-open={
        (showConversation || Boolean(requestedRoomId)) && selectedRoom
          ? "true"
          : "false"
      }
      aria-label="กล่องข้อความ"
    >
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div>
            <h2>ข้อความ</h2>
            <span>{rooms.length} บทสนทนา</span>
          </div>
          {unreadTotal > 0 && (
            <span className={styles.unreadSummary} role="status" aria-live="polite">
              <MessageCircle size={14} />
              {unreadTotal > 99 ? "99+" : unreadTotal} ข้อความใหม่
            </span>
          )}
          <span className={styles.composeIcon} aria-hidden="true">
            <MessageCircle size={18} />
          </span>
        </div>

        <label className={styles.search}>
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาบทสนทนา"
            aria-label="ค้นหาบทสนทนา"
          />
        </label>

        {roomsQuery.isError ? (
          <div className={styles.inlineError} role="alert">
            <p>{roomsQuery.error.message}</p>
            <button type="button" onClick={() => roomsQuery.refetch()}>
              ลองใหม่
            </button>
          </div>
        ) : roomsQuery.isPending ? (
          <div className={styles.sidebarLoading}>
            <LoaderCircle className={styles.spinner} size={20} />
            กำลังโหลดรายการ...
          </div>
        ) : rooms.length === 0 ? (
          <div className={styles.emptyRooms}>
            <span>
              <PawPrint size={22} />
            </span>
            <strong>ยังไม่มีบทสนทนา</strong>
            <p>เริ่มแชทได้จากหน้าประกาศสัตว์เลี้ยง</p>
            <Link href="/marketplace">ดูประกาศ</Link>
          </div>
        ) : filteredRooms.length === 0 ? (
          <p className={styles.noResults}>ไม่พบบทสนทนาที่ค้นหา</p>
        ) : (
          <div className={styles.roomList}>
            {filteredRooms.map((room) => {
              const person = room.participants.find(
                (participant) => participant.user.id !== currentUser.id,
              )?.user;
              const latestMessage = room.messages[0];
              const active = selectedRoom?.id === room.id;

              return (
                <button
                  className={`${styles.room} ${
                    active ? styles.activeRoom : ""
                  } ${
                    room._count.messages > 0 ? styles.unreadRoom : ""
                  }`}
                  type="button"
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setShowConversation(true);
                    router.replace("/chat", { scroll: false });
                  }}
                  aria-current={active ? "true" : undefined}
                >
                  <span className={styles.avatar}>
                    {getInitial(person?.name ?? "ผู้ใช้")}
                  </span>
                  <span className={styles.roomDetails}>
                    <span className={styles.roomName}>
                      <strong>
                        {person?.name ?? "สมาชิก"}
                        {room._count.messages > 0 && (
                          <>
                            <span
                              className={styles.roomUnreadDot}
                              aria-hidden="true"
                            />
                            <span className={styles.roomUnreadCount}>
                              {room._count.messages > 99
                                ? "99+"
                                : room._count.messages}
                            </span>
                          </>
                        )}
                      </strong>
                      <time>{latestMessage ? formatTime(latestMessage.createdAt) : ""}</time>
                    </span>
                    <span className={styles.roomListing}>
                      <PawPrint size={12} />
                      {room.listing?.title ?? "ข้อความส่วนตัว"}
                    </span>
                    <span className={styles.preview}>
                      {room._count.messages > 0 && !latestMessage?.content
                        ? "มีรูปภาพใหม่"
                        : latestMessage?.content ?? "เริ่มต้นบทสนทนา"}
                    </span>
                    {room._count.messages > 0 && (
                      <span className={styles.unreadLabel}>
                        ยังไม่ได้อ่าน {room._count.messages} ข้อความ
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {selectedRoom && otherParticipant ? (
        <div className={styles.conversation}>
          <header className={styles.conversationHeader}>
            <button
              className={styles.mobileBack}
              type="button"
              onClick={() => {
                setShowConversation(false);
                setSelectedRoomId(null);
                router.replace("/chat", { scroll: false });
              }}
              aria-label="กลับไปรายการแชท"
            >
              <ArrowLeft size={20} />
            </button>
            <span className={styles.avatar}>
              {getInitial(otherParticipant.name)}
            </span>
            <div className={styles.contact}>
              <strong>{otherParticipant.name}</strong>
              <span>
                <i aria-hidden="true" />
                คุยเรื่องประกาศนี้
              </span>
            </div>
            {selectedRoom.listing ? (
              <Link
                href={`/marketplace/${selectedRoom.listing.id}`}
                className={styles.listingLink}
                title="ดูประกาศ"
              >
                <span className={styles.listingImage}>
                  {selectedRoom.listing.media[0]?.mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedRoom.listing.media[0].mediaUrl}
                      alt=""
                    />
                  ) : (
                    <PawPrint size={17} />
                  )}
                </span>
                <span className={styles.listingInfo}>
                  <small>ประกาศ</small>
                  <strong>{selectedRoom.listing.title}</strong>
                </span>
                <ArrowUpRight size={16} />
              </Link>
            ) : (
              <div className={styles.privateChatLabel}>
                <MessageCircle size={18} />
                <span>ข้อความส่วนตัว</span>
              </div>
            )}
          </header>

          <div className={styles.messages} aria-live="polite">
            <div className={styles.dayDivider}>
              <span>ข้อความในบทสนทนา</span>
            </div>
            {messagesQuery.isError ? (
              <div className={styles.messageError} role="alert">
                <p>{messagesQuery.error.message}</p>
                <button type="button" onClick={() => messagesQuery.refetch()}>
                  โหลดข้อความอีกครั้ง
                </button>
              </div>
            ) : messagesQuery.isPending ? (
              <div className={styles.messagesLoading}>
                <LoaderCircle className={styles.spinner} size={22} />
                กำลังโหลดข้อความ...
              </div>
            ) : messages.length === 0 ? (
              <div className={styles.firstMessage}>
                <span>
                  <PawPrint size={24} />
                </span>
                <strong>เริ่มต้นบทสนทนา</strong>
                <p>สอบถามรายละเอียดหรือนัดหมายเกี่ยวกับประกาศนี้ได้เลย</p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  const isMine = message.senderId === currentUser.id;
                  const previous = messages[index - 1];
                  const needsDate =
                    !previous ||
                    new Date(previous.createdAt).toDateString() !==
                      new Date(message.createdAt).toDateString();

                  return (
                    <div key={message.id}>
                      {needsDate && (
                        <div className={styles.dateDivider}>
                          {formatDate(message.createdAt)}
                        </div>
                      )}
                      <div
                        className={`${styles.messageRow} ${isMine ? styles.mine : ""}`}
                      >
                        {!isMine && (
                          <span className={styles.smallAvatar}>
                            {getInitial(message.sender.name)}
                          </span>
                        )}
                        <div className={styles.messageContent}>
                          {message.attachments && message.attachments.length > 0 && (
                            <div
                              className={`${styles.messageImages} ${
                                message.attachments.length === 1
                                  ? styles.singleMessageImage
                                  : ""
                              }`}
                            >
                              {message.attachments.map((attachment) => (
                                <a
                                  href={attachment.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  key={attachment.id}
                                >
                                  <img
                                    src={attachment.mediaUrl}
                                    alt="รูปภาพในข้อความ"
                                    loading="lazy"
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                          {message.content && (
                            <p className={styles.bubble}>{message.content}</p>
                          )}
                          <time>
                            {formatTime(message.createdAt)}
                            {isMine && <Check size={13} aria-label="ส่งแล้ว" />}
                          </time>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {(attachments.length > 0 || imageUpload.isPending) && (
            <div className={styles.attachmentPreview} aria-label="รูปภาพที่เลือกแนบ">
              {attachments.map((attachment, index) => (
                <div className={styles.attachmentPreviewItem} key={attachment.publicId}>
                  <img src={attachment.url} alt={`ตัวอย่างรูปที่ ${index + 1}`} />
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    disabled={isSending}
                    aria-label={`นำรูปที่ ${index + 1} ออก`}
                    title="นำรูปออก"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {imageUpload.isPending && (
                <div className={styles.attachmentUploading} role="status">
                  <LoaderCircle className={styles.spinner} size={20} />
                  <span>กำลังเตรียมรูป...</span>
                </div>
              )}
            </div>
          )}

          <form className={styles.composer} onSubmit={handleSubmit}>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={handleImageChange}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isSending || imageUpload.isPending || attachments.length >= 4}
              aria-label="แนบรูปภาพ"
              title="แนบรูปภาพ"
            >
              <ImageIcon size={17} />
            </button>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="พิมพ์ข้อความ..."
              aria-label="พิมพ์ข้อความ"
              maxLength={1000}
              rows={1}
              disabled={isSending || imageUpload.isPending}
            />
            <button
              type="submit"
              disabled={(!draft.trim() && attachments.length === 0) || isSending || imageUpload.isPending}
              aria-label="ส่งข้อความ"
            >
              {isSending ? (
                <LoaderCircle className={styles.spinner} size={18} />
              ) : (
                <Send size={17} />
              )}
              <span>ส่ง</span>
            </button>
          </form>
          <p className={styles.composerHint}>กด Enter เพื่อส่ง · Shift + Enter เพื่อขึ้นบรรทัดใหม่</p>
        </div>
      ) : (
        <div className={styles.welcome}>
          <span className={styles.welcomeIcon}>
            <MessageCircle size={30} />
            <PawPrint size={15} />
          </span>
          <h2>{rooms.length ? "เลือกบทสนทนา" : "พื้นที่พูดคุยของชุมชน"}</h2>
          <p>
            {rooms.length
              ? "เลือกแชทจากรายการทางซ้ายเพื่อดูข้อความและพูดคุยต่อ"
              : "เมื่อคุณเริ่มสนใจประกาศ แชทกับเจ้าของจะปรากฏที่นี่"}
          </p>
          {!rooms.length && (
            <Link href="/marketplace" className={styles.primaryLink}>
              ไปดูประกาศสัตว์เลี้ยง <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}