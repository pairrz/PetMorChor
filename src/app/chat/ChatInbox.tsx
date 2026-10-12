"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  LoaderCircle,
  MessageCircle,
  PawPrint,
  Search,
  Send,
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
  sender: { id: number; name: string };
};

type ChatRoom = {
  id: number;
  listing: {
    id: number;
    title: string;
    status: "AVAILABLE" | "ADOPTED" | "HIDDEN";
    media: { mediaUrl: string }[];
  };
  participants: {
    user: { id: number; name: string };
  }[];
  messages: { content: string; createdAt: string; senderId: number }[];
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
  const [showConversation, setShowConversation] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sessionQuery = useQuery<SessionResponse>({
    queryKey: ["chat-session"],
    queryFn: async () => readJson(await fetch("/api/auth/me")),
  });
  const currentUser = sessionQuery.data?.user;

  const roomsQuery = useQuery<ChatRoom[]>({
    queryKey: ["chat-rooms", currentUser?.id],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const result = await readJson<{ data: ChatRoom[] }>(
        await fetch("/api/chats/room"),
      );
      return result.data;
    },
    refetchInterval: 10_000,
  });
  const rooms = roomsQuery.data ?? emptyRooms;

  const selectedRoom =
    rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? null;
  const otherParticipant = selectedRoom?.participants.find(
    (participant) => participant.user.id !== currentUser?.id,
  )?.user;

  const messagesQuery = useQuery<ChatMessage[]>({
    queryKey: ["chat-room-messages", selectedRoom?.id],
    enabled: Boolean(currentUser && selectedRoom),
    queryFn: async () => {
      const result = await readJson<{ data: ChatMessage[] }>(
        await fetch(`/api/chats/room/${selectedRoom?.id}/message`),
      );
      return result.data;
    },
    refetchInterval: 4_000,
  });
  const messages = messagesQuery.data ?? emptyMessages;

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return rooms;
    return rooms.filter((room) => {
      const otherName =
        room.participants.find(
          (participant) => participant.user.id !== currentUser?.id,
        )?.user.name ?? "";
      return `${otherName} ${room.listing.title}`
        .toLocaleLowerCase()
        .includes(query);
    });
  }, [currentUser?.id, rooms, search]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedRoom?.id]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const result = await readJson<{ data: ChatMessage }>(
        await fetch(`/api/chats/room/${selectedRoom?.id}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }),
      );
      return result.data;
    },
    onSuccess: (message) => {
      setDraft("");
      queryClient.setQueryData<ChatMessage[]>(
        ["chat-room-messages", selectedRoom?.id],
        (current) =>
          current?.some((item) => item.id === message.id)
            ? current
            : [...(current ?? []), message],
      );
      queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sendMutation.isPending || !selectedRoom) return;
    sendMutation.mutate(content);
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
      data-conversation-open={showConversation && selectedRoom ? "true" : "false"}
      aria-label="กล่องข้อความ"
    >
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div>
            <h2>ข้อความ</h2>
            <span>{rooms.length} บทสนทนา</span>
          </div>
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
                  className={`${styles.room} ${active ? styles.activeRoom : ""}`}
                  type="button"
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setShowConversation(true);
                  }}
                  aria-current={active ? "true" : undefined}
                >
                  <span className={styles.avatar}>
                    {getInitial(person?.name ?? "ผู้ใช้")}
                  </span>
                  <span className={styles.roomDetails}>
                    <span className={styles.roomName}>
                      <strong>{person?.name ?? "สมาชิก"}</strong>
                      <time>{latestMessage ? formatTime(latestMessage.createdAt) : ""}</time>
                    </span>
                    <span className={styles.roomListing}>
                      <PawPrint size={12} />
                      {room.listing.title}
                    </span>
                    <span className={styles.preview}>
                      {latestMessage?.content ?? "เริ่มต้นบทสนทนา"}
                    </span>
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
              onClick={() => setShowConversation(false)}
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
                          <p className={styles.bubble}>{message.content}</p>
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

          {sendMutation.isError && (
            <p className={styles.sendError} role="alert">
              {sendMutation.error.message}
            </p>
          )}
          <form className={styles.composer} onSubmit={handleSubmit}>
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
              disabled={sendMutation.isPending}
            />
            <button
              type="submit"
              disabled={!draft.trim() || sendMutation.isPending}
              aria-label="ส่งข้อความ"
            >
              {sendMutation.isPending ? (
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
